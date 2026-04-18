# Notification System Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken notification badges, add per-section unread tracking, build a bell panel, thread comment replies, add notification preference settings for families and admins, wire up email notifications for announcements/blog/comments, and schedule appointment reminders.

**Architecture:** A new DB migration (020) adds five tables (`user_section_last_seen`, `user_notifications`, `user_notification_preferences`, `admin_notification_preferences`, `portal_email_queue`), `parent_comment_id` columns on both comment tables, DB triggers for fan-out emails and in-app notifications, and a pg_cron job for appointment reminders. The `send-email` edge function gains a third handler for `portal_email_queue`. Four new email templates are added. On the frontend, a shared `NotificationBell` component reads from these tables via new queries/mutations, sidebar badges extend to announcements and blog, and preferences cards are added to both profile tabs.

**Tech Stack:** React, TypeScript, Supabase (PostgREST + Realtime + Edge Functions), shadcn/ui (`Popover`, `Switch`, `Skeleton`), Lucide icons, Deno (edge functions), pg_cron.

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/020_notification_system.sql` | Create |
| `supabase/functions/send-email/types.ts` | Add `PortalEmailQueueRecord` interface |
| `supabase/functions/send-email/templates.ts` | Add 4 new template functions |
| `supabase/functions/send-email/index.ts` | Add `handlePortalNotification`, update `handleMessageNotification` to check prefs |
| `src/lib/types.ts` | Add 4 new types |
| `src/lib/supabase/queries.ts` | Add `getSectionUnreadCounts`, `getUnreadNotificationCount`, `getNotificationSummary`, `getUserNotificationPreferences`, `getAdminNotificationPreferences` |
| `src/lib/supabase/mutations.ts` | Add `markSectionSeen`, `markNotificationsRead`, `upsertUserNotificationPreferences`, `upsertAdminNotificationPreferences`; update `createAnnouncementComment`, `createBlogComment` |
| `src/lib/supabase/realtime.ts` | Add `subscribeToUserNotifications` |
| `src/components/NotificationBell.tsx` | Create |
| `src/components/DashboardV2.tsx` | Add section unread state, sidebar badges, `NotificationBell`, pass `onNavigate` to HomeTab for section nav |
| `src/components/AdminDashboardV2.tsx` | Same changes as DashboardV2 |
| `src/components/dashboard/AnnouncementsTab.tsx` | Call `markSectionSeen` on mount; add Reply UI |
| `src/components/dashboard/BlogTab.tsx` | Call `markSectionSeen` on mount; add Reply UI; delete mock data |
| `src/components/dashboard/HomeTab.tsx` | Replace `getCommunicationCounts` with new queries; add blog card |
| `src/components/dashboard/ProfileTab.tsx` | Add Notification Preferences card |
| `src/components/admin/AdminProfileTab.tsx` | Add Notification Preferences card |

---

## Task 1: DB migration — all tables, triggers, and pg_cron

**Files:**
- Create: `supabase/migrations/020_notification_system.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/020_notification_system.sql

-- Enable pg_cron for appointment reminders
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── 1. user_section_last_seen ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_section_last_seen (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section      TEXT NOT NULL CHECK (section IN ('announcements', 'blog')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, section)
);
ALTER TABLE user_section_last_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_last_seen" ON user_section_last_seen
  FOR ALL USING (auth.uid() = user_id);

-- ─── 2. user_notifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_notifications (
  notification_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('comment_reply', 'post_comment')),
  reference_id      UUID NOT NULL,
  reference_type    TEXT NOT NULL CHECK (reference_type IN ('announcement_comment', 'blog_comment')),
  actor_display_name TEXT,
  is_read           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_notifications_recipient_unread
  ON user_notifications(recipient_user_id, is_read);
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_notifications" ON user_notifications
  FOR ALL USING (auth.uid() = recipient_user_id);

-- ─── 3. user_notification_preferences ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_messages        BOOLEAN NOT NULL DEFAULT true,
  notify_announcements   BOOLEAN NOT NULL DEFAULT true,
  notify_blog_posts      BOOLEAN NOT NULL DEFAULT false,
  notify_comment_replies BOOLEAN NOT NULL DEFAULT true,
  notify_post_comments   BOOLEAN NOT NULL DEFAULT true,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_notification_prefs" ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ─── 4. admin_notification_preferences ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_messages        BOOLEAN NOT NULL DEFAULT true,
  notify_blog_posts      BOOLEAN NOT NULL DEFAULT true,
  notify_comment_replies BOOLEAN NOT NULL DEFAULT true,
  notify_post_comments   BOOLEAN NOT NULL DEFAULT true,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE admin_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_own_notification_prefs" ON admin_notification_preferences
  FOR ALL USING (is_admin(auth.uid()) AND auth.uid() = user_id);

-- ─── 5. portal_email_queue ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_email_queue (
  queue_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('announcement', 'blog_post', 'comment_reply', 'post_comment')),
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE portal_email_queue ENABLE ROW LEVEL SECURITY;
-- No direct user access; written by triggers, read by service role only
CREATE POLICY "no_user_access_portal_email_queue" ON portal_email_queue
  FOR ALL USING (false);

-- ─── 6. Add parent_comment_id for threading ───────────────────────────────────
ALTER TABLE announcement_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID NULL
    REFERENCES announcement_comments(comment_id) ON DELETE CASCADE;

ALTER TABLE blog_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID NULL
    REFERENCES blog_comments(comment_id) ON DELETE CASCADE;

-- ─── 7. Announcement fan-out email trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_new_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO portal_email_queue (recipient_email, type, payload, status)
  SELECT
    au.email,
    'announcement',
    jsonb_build_object(
      'announcement_id', NEW.announcement_id,
      'title',           NEW.title,
      'body',            LEFT(NEW.body, 300)
    ),
    'queued'
  FROM user_notification_preferences unp
  JOIN auth.users au ON au.id = unp.user_id
  WHERE unp.notify_announcements = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcement_notification_trigger ON announcements;
CREATE TRIGGER announcement_notification_trigger
  AFTER INSERT ON announcements
  FOR EACH ROW EXECUTE FUNCTION notify_new_announcement();

-- ─── 8. Blog post fan-out email trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_new_blog_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_name TEXT;
BEGIN
  SELECT display_name INTO v_author_name
  FROM profiles WHERE user_id = NEW.author_user_id;

  INSERT INTO portal_email_queue (recipient_email, type, payload, status)
  SELECT
    au.email,
    'blog_post',
    jsonb_build_object(
      'post_id',     NEW.post_id,
      'title',       NEW.title,
      'author_name', COALESCE(v_author_name, 'A member')
    ),
    'queued'
  FROM (
    SELECT user_id, notify_blog_posts FROM user_notification_preferences
    UNION ALL
    SELECT user_id, notify_blog_posts FROM admin_notification_preferences
  ) prefs
  JOIN auth.users au ON au.id = prefs.user_id
  WHERE prefs.notify_blog_posts = true
    AND prefs.user_id != NEW.author_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_post_notification_trigger ON blog_posts;
CREATE TRIGGER blog_post_notification_trigger
  AFTER INSERT ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION notify_new_blog_post();

-- ─── 9. Announcement comment notification trigger ─────────────────────────────
CREATE OR REPLACE FUNCTION notify_announcement_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_parent_author_id  UUID;
  v_post_author_id    UUID;
  v_actor_name        TEXT;
  v_announcement_title TEXT;
  v_parent_snippet    TEXT;
  v_pref              BOOLEAN;
  v_email             TEXT;
BEGIN
  SELECT display_name INTO v_actor_name
  FROM profiles WHERE user_id = NEW.author_user_id;

  SELECT title INTO v_announcement_title
  FROM announcements WHERE announcement_id = NEW.announcement_id;

  -- Reply: notify parent comment author
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT author_user_id, LEFT(body, 100)
    INTO v_parent_author_id, v_parent_snippet
    FROM announcement_comments WHERE comment_id = NEW.parent_comment_id;

    IF v_parent_author_id IS NOT NULL AND v_parent_author_id != NEW.author_user_id THEN
      INSERT INTO user_notifications
        (recipient_user_id, type, reference_id, reference_type, actor_display_name)
      VALUES
        (v_parent_author_id, 'comment_reply', NEW.comment_id, 'announcement_comment',
         COALESCE(v_actor_name, 'Someone'));

      SELECT COALESCE(prefs.notify_comment_replies, true), au.email
      INTO v_pref, v_email
      FROM auth.users au
      LEFT JOIN (
        SELECT user_id, notify_comment_replies FROM user_notification_preferences
        UNION ALL
        SELECT user_id, notify_comment_replies FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_parent_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        INSERT INTO portal_email_queue (recipient_email, type, payload, status)
        VALUES (v_email, 'comment_reply', jsonb_build_object(
          'replier_name',    COALESCE(v_actor_name, 'Someone'),
          'original_snippet', v_parent_snippet,
          'tab',             'announcements'
        ), 'queued');
      END IF;
    END IF;
  END IF;

  -- Top-level comment: notify post author
  IF NEW.parent_comment_id IS NULL THEN
    SELECT author_user_id INTO v_post_author_id
    FROM announcements WHERE announcement_id = NEW.announcement_id;

    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_user_id THEN
      INSERT INTO user_notifications
        (recipient_user_id, type, reference_id, reference_type, actor_display_name)
      VALUES
        (v_post_author_id, 'post_comment', NEW.comment_id, 'announcement_comment',
         COALESCE(v_actor_name, 'Someone'));

      SELECT COALESCE(prefs.notify_post_comments, true), au.email
      INTO v_pref, v_email
      FROM auth.users au
      LEFT JOIN (
        SELECT user_id, notify_post_comments FROM user_notification_preferences
        UNION ALL
        SELECT user_id, notify_post_comments FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_post_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        INSERT INTO portal_email_queue (recipient_email, type, payload, status)
        VALUES (v_email, 'post_comment', jsonb_build_object(
          'commenter_name', COALESCE(v_actor_name, 'Someone'),
          'post_title',     COALESCE(v_announcement_title, 'an announcement'),
          'tab',            'announcements'
        ), 'queued');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcement_comment_notification_trigger ON announcement_comments;
CREATE TRIGGER announcement_comment_notification_trigger
  AFTER INSERT ON announcement_comments
  FOR EACH ROW EXECUTE FUNCTION notify_announcement_comment();

-- ─── 10. Blog comment notification trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_blog_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_parent_author_id UUID;
  v_post_author_id   UUID;
  v_actor_name       TEXT;
  v_post_title       TEXT;
  v_parent_snippet   TEXT;
  v_pref             BOOLEAN;
  v_email            TEXT;
BEGIN
  SELECT display_name INTO v_actor_name
  FROM profiles WHERE user_id = NEW.author_user_id;

  SELECT title INTO v_post_title
  FROM blog_posts WHERE post_id = NEW.post_id;

  -- Reply: notify parent comment author
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT author_user_id, LEFT(body, 100)
    INTO v_parent_author_id, v_parent_snippet
    FROM blog_comments WHERE comment_id = NEW.parent_comment_id;

    IF v_parent_author_id IS NOT NULL AND v_parent_author_id != NEW.author_user_id THEN
      INSERT INTO user_notifications
        (recipient_user_id, type, reference_id, reference_type, actor_display_name)
      VALUES
        (v_parent_author_id, 'comment_reply', NEW.comment_id, 'blog_comment',
         COALESCE(v_actor_name, 'Someone'));

      SELECT COALESCE(prefs.notify_comment_replies, true), au.email
      INTO v_pref, v_email
      FROM auth.users au
      LEFT JOIN (
        SELECT user_id, notify_comment_replies FROM user_notification_preferences
        UNION ALL
        SELECT user_id, notify_comment_replies FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_parent_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        INSERT INTO portal_email_queue (recipient_email, type, payload, status)
        VALUES (v_email, 'comment_reply', jsonb_build_object(
          'replier_name',     COALESCE(v_actor_name, 'Someone'),
          'original_snippet', v_parent_snippet,
          'tab',              'blog'
        ), 'queued');
      END IF;
    END IF;
  END IF;

  -- Top-level comment: notify post author
  IF NEW.parent_comment_id IS NULL THEN
    SELECT author_user_id INTO v_post_author_id
    FROM blog_posts WHERE post_id = NEW.post_id;

    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_user_id THEN
      INSERT INTO user_notifications
        (recipient_user_id, type, reference_id, reference_type, actor_display_name)
      VALUES
        (v_post_author_id, 'post_comment', NEW.comment_id, 'blog_comment',
         COALESCE(v_actor_name, 'Someone'));

      SELECT COALESCE(prefs.notify_post_comments, true), au.email
      INTO v_pref, v_email
      FROM auth.users au
      LEFT JOIN (
        SELECT user_id, notify_post_comments FROM user_notification_preferences
        UNION ALL
        SELECT user_id, notify_post_comments FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_post_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        INSERT INTO portal_email_queue (recipient_email, type, payload, status)
        VALUES (v_email, 'post_comment', jsonb_build_object(
          'commenter_name', COALESCE(v_actor_name, 'Someone'),
          'post_title',     COALESCE(v_post_title, 'a blog post'),
          'tab',            'blog'
        ), 'queued');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_comment_notification_trigger ON blog_comments;
CREATE TRIGGER blog_comment_notification_trigger
  AFTER INSERT ON blog_comments
  FOR EACH ROW EXECUTE FUNCTION notify_blog_comment();

-- ─── 11. Appointment reminder cron ───────────────────────────────────────────
SELECT cron.schedule(
  'appointment-reminders',
  '0 8 * * *',
  $$
  INSERT INTO enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  SELECT el.lead_id, el.parent_email, 'email', 'reminder', 'queued'
  FROM enrollment_leads el
  WHERE el.status IN ('appointment_scheduled', 'appointment_confirmed')
    AND el.appointment_date = (CURRENT_DATE + INTERVAL '2 days')::date
    AND el.deleted_at IS NULL;
  $$
);
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with:
- `name`: `020_notification_system`
- `query`: the full SQL above

- [ ] **Step 3: Verify tables and columns exist**

Use `mcp__supabase__execute_sql` with:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_section_last_seen',
    'user_notifications',
    'user_notification_preferences',
    'admin_notification_preferences',
    'portal_email_queue'
  )
ORDER BY table_name;
```
Expected: 5 rows.

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'announcement_comments' AND column_name = 'parent_comment_id';
```
Expected: 1 row.

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'blog_comments' AND column_name = 'parent_comment_id';
```
Expected: 1 row.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/020_notification_system.sql
git commit -m "feat: add notification system migration — tables, triggers, pg_cron"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add four new types at the end of `src/lib/types.ts`**

```typescript
export type UserSectionLastSeen = {
  user_id: string;
  section: 'announcements' | 'blog';
  last_seen_at: string;
};

export type UserNotification = {
  notification_id: string;
  recipient_user_id: string;
  type: 'comment_reply' | 'post_comment';
  reference_id: string;
  reference_type: 'announcement_comment' | 'blog_comment';
  actor_display_name: string | null;
  is_read: boolean;
  created_at: string;
};

export type UserNotificationPreferences = {
  user_id: string;
  notify_messages: boolean;
  notify_announcements: boolean;
  notify_blog_posts: boolean;
  notify_comment_replies: boolean;
  notify_post_comments: boolean;
  updated_at: string;
};

export type AdminNotificationPreferences = {
  user_id: string;
  notify_messages: boolean;
  notify_blog_posts: boolean;
  notify_comment_replies: boolean;
  notify_post_comments: boolean;
  updated_at: string;
};
```

- [ ] **Step 2: Run type check**

```bash
npm run lint
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add notification system TypeScript types"
```

---

## Task 3: Data access layer — queries

**Files:**
- Modify: `src/lib/supabase/queries.ts`

- [ ] **Step 1: Add imports at the top of queries.ts**

Find the existing import block and add `UserNotification`, `UserNotificationPreferences`, `AdminNotificationPreferences` to the import from `'../types'`. Example — find the line that imports from `'../types'` and add the new types.

- [ ] **Step 2: Add `getSectionUnreadCounts` after the existing messaging queries**

```typescript
export async function getSectionUnreadCounts(userId: string): Promise<{
  announcements: number;
  blog: number;
}> {
  const { data: lastSeen } = await supabase
    .from('user_section_last_seen')
    .select('section, last_seen_at')
    .eq('user_id', userId);

  const announcementsSince =
    lastSeen?.find((r) => r.section === 'announcements')?.last_seen_at ??
    '1970-01-01T00:00:00Z';
  const blogSince =
    lastSeen?.find((r) => r.section === 'blog')?.last_seen_at ??
    '1970-01-01T00:00:00Z';

  const [announcementsResult, blogResult] = await Promise.all([
    supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', announcementsSince),
    supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', blogSince),
  ]);

  return {
    announcements: announcementsResult.count ?? 0,
    blog: blogResult.count ?? 0,
  };
}
```

- [ ] **Step 3: Add `getUnreadNotificationCount`**

```typescript
export async function getUnreadNotificationCount(): Promise<number> {
  const { count } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  return count ?? 0;
}
```

- [ ] **Step 4: Add `getNotificationSummary` (used by the bell panel)**

```typescript
export async function getNotificationSummary(userId: string): Promise<{
  unreadMessages: number;
  announcements: { count: number; latestTitle: string | null };
  blog: { count: number; latestTitle: string | null };
  commentNotifications: UserNotification[];
}> {
  const { data: lastSeen } = await supabase
    .from('user_section_last_seen')
    .select('section, last_seen_at')
    .eq('user_id', userId);

  const announcementsSince =
    lastSeen?.find((r) => r.section === 'announcements')?.last_seen_at ??
    '1970-01-01T00:00:00Z';
  const blogSince =
    lastSeen?.find((r) => r.section === 'blog')?.last_seen_at ??
    '1970-01-01T00:00:00Z';

  const [messagesCount, announcementsData, blogData, commentNotifsData] =
    await Promise.all([
      getUnreadMessageCount(),
      supabase
        .from('announcements')
        .select('title')
        .gt('created_at', announcementsSince)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('blog_posts')
        .select('title')
        .gt('created_at', blogSince)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('user_notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

  return {
    unreadMessages: messagesCount,
    announcements: {
      count: announcementsData.data?.length ?? 0,
      latestTitle: announcementsData.data?.[0]?.title ?? null,
    },
    blog: {
      count: blogData.data?.length ?? 0,
      latestTitle: blogData.data?.[0]?.title ?? null,
    },
    commentNotifications: (commentNotifsData.data ?? []) as UserNotification[],
  };
}
```

- [ ] **Step 5: Add `getUserNotificationPreferences` and `getAdminNotificationPreferences`**

```typescript
export async function getUserNotificationPreferences(): Promise<UserNotificationPreferences | null> {
  const { data } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .maybeSingle();
  return data as UserNotificationPreferences | null;
}

export async function getAdminNotificationPreferences(): Promise<AdminNotificationPreferences | null> {
  const { data } = await supabase
    .from('admin_notification_preferences')
    .select('*')
    .maybeSingle();
  return data as AdminNotificationPreferences | null;
}
```

- [ ] **Step 6: Run type check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/queries.ts
git commit -m "feat: add notification system queries"
```

---

## Task 4: Data access layer — mutations and realtime

**Files:**
- Modify: `src/lib/supabase/mutations.ts`
- Modify: `src/lib/supabase/realtime.ts`

- [ ] **Step 1: Add imports to mutations.ts**

Find the existing import from `'../types'` and add `UserNotificationPreferences`, `AdminNotificationPreferences`.

- [ ] **Step 2: Add `markSectionSeen` to mutations.ts**

```typescript
export async function markSectionSeen(section: 'announcements' | 'blog'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_section_last_seen')
    .upsert(
      { user_id: user.id, section, last_seen_at: new Date().toISOString() },
      { onConflict: 'user_id,section' }
    );
  if (error) throw error;
}
```

- [ ] **Step 3: Add `markNotificationsRead`**

```typescript
export async function markNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throw error;
}
```

- [ ] **Step 4: Add `upsertUserNotificationPreferences`**

```typescript
export async function upsertUserNotificationPreferences(
  prefs: Partial<Omit<UserNotificationPreferences, 'user_id' | 'updated_at'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_notification_preferences')
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}
```

- [ ] **Step 5: Add `upsertAdminNotificationPreferences`**

```typescript
export async function upsertAdminNotificationPreferences(
  prefs: Partial<Omit<AdminNotificationPreferences, 'user_id' | 'updated_at'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('admin_notification_preferences')
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}
```

- [ ] **Step 6: Update `createAnnouncementComment` to accept optional `parentCommentId`**

Find the existing `createAnnouncementComment` function. Add the optional parameter:

```typescript
export async function createAnnouncementComment(
  announcementId: string,
  body: string,
  parentCommentId?: string
): Promise<void> {
  const { error } = await supabase
    .from('announcement_comments')
    .insert({
      announcement_id: announcementId,
      body,
      ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
    });
  if (error) throw error;
}
```

- [ ] **Step 7: Update `createBlogComment` to accept optional `parentCommentId`**

Find the existing `createBlogComment` function. Add the optional parameter:

```typescript
export async function createBlogComment(
  postId: string,
  body: string,
  parentCommentId?: string
): Promise<void> {
  const { error } = await supabase
    .from('blog_comments')
    .insert({
      post_id: postId,
      body,
      ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
    });
  if (error) throw error;
}
```

- [ ] **Step 8: Add `subscribeToUserNotifications` to realtime.ts**

```typescript
import type { UserNotification } from '../types';

export function subscribeToUserNotifications(
  userId: string,
  onNewNotification: (notification: UserNotification) => void
): RealtimeChannel {
  return supabase
    .channel(`user_notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `recipient_user_id=eq.${userId}`,
      },
      (payload) => onNewNotification(payload.new as UserNotification)
    )
    .subscribe();
}
```

- [ ] **Step 9: Run type check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/supabase/mutations.ts src/lib/supabase/realtime.ts
git commit -m "feat: add notification mutations and realtime subscription"
```

---

## Task 5: Fix message badge bug + fix HomeTab counts + cleanup BlogTab

**Files:**
- Modify: `src/components/dashboard/HomeTab.tsx`
- Modify: `src/components/dashboard/BlogTab.tsx`

Note: `DashboardV2` already passes `onUnreadCountChange={setUnreadMessages}` to `MessagesTab`, and `MessagesTab` already calls `onUnreadCountChange` when conversations change. The message badge bug is that the initial count in `DashboardV2` is fetched once on mount but section counts for announcements/blog are wrong (see §HomeTab fix below). Verify by running the dev server and checking that the sidebar badge clears after opening a conversation — if it does, skip this note; if not, the root is that `MessagesTab.updateConversationReadState` is not being called when selecting a conversation (look for the `onClick` on the conversation list items and confirm it calls `updateConversationReadState`).

- [ ] **Step 1: Fix HomeTab — replace `getCommunicationCounts` with new queries**

Open `src/components/dashboard/HomeTab.tsx`. Make these changes:

**Add new imports** (find the existing supabase imports and add):
```typescript
import {
  getAnnouncements,
  getBlogPosts,
  getUnreadMessageCount,
  getSectionUnreadCounts,
  getUnreadNotificationCount,
} from '../../lib/supabase/queries';
```

**Replace the `loadHomeData` function body** (the part that calls `getCommunicationCounts`):

```typescript
const loadHomeData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    const [announcementsResult, blogPostsResult, unreadMessages, sectionCounts, commentCount] =
      await Promise.allSettled([
        getAnnouncements(),
        getBlogPosts(),
        getUnreadMessageCount(),
        getSectionUnreadCounts(user.id),
        getUnreadNotificationCount(),
      ]);

    if (announcementsResult.status === 'rejected') throw announcementsResult.reason;
    if (blogPostsResult.status === 'rejected') throw blogPostsResult.reason;

    const announcementsData = announcementsResult.value;
    const blogPostsData = blogPostsResult.value;

    setAnnouncements(
      (announcementsData as AnnouncementRecord[]).slice(0, 3).map((a) => ({
        id: a.announcement_id,
        title: a.title,
        body: a.body,
        authorName: a.profiles?.display_name || 'Unknown',
        createdAt: a.created_at,
        isPinned: a.is_pinned || false,
      })),
    );

    setBlogPosts(
      (blogPostsData as BlogPostRecord[]).slice(0, 3).map((p) => ({
        id: p.post_id,
        title: p.title,
        authorName: p.profiles?.display_name || 'Unknown',
        createdAt: p.created_at,
        isPinned: Boolean(p.is_pinned),
      })),
    );

    setUnreadMessages(unreadMessages.status === 'fulfilled' ? unreadMessages.value : 0);
    setAnnouncementCount(
      sectionCounts.status === 'fulfilled' ? sectionCounts.value.announcements : 0,
    );
    setBlogCount(
      sectionCounts.status === 'fulfilled' ? sectionCounts.value.blog : 0,
    );
    setCommentNotifCount(
      commentCount.status === 'fulfilled' ? commentCount.value : 0,
    );
  } catch (err) {
    console.error('Error loading home dashboard data:', err);
    setError(err instanceof Error ? err.message : 'Failed to load home dashboard data');
  } finally {
    setLoading(false);
  }
}, [user.id]);
```

**Update state declarations** — add the two new state variables alongside the existing ones:
```typescript
const [blogCount, setBlogCount] = useState(0);
const [commentNotifCount, setCommentNotifCount] = useState(0);
```

**Update the `notifications` array** to add blog and comment rows:
```typescript
const notifications = [
  {
    type: 'feedback',
    count: newFeedbackCount,
    label: 'New Feedback',
    icon: Award,
    action: () => onNavigate('feedback'),
  },
  {
    type: 'messages',
    count: unreadMessages,
    label: 'Unread Messages',
    icon: MessageSquare,
    action: () => onNavigate('messages'),
  },
  {
    type: 'announcements',
    count: newAnnouncementsCount,
    label: 'New Announcements',
    icon: Bell,
    action: () => onNavigate('announcements'),
  },
  {
    type: 'blog',
    count: blogCount,
    label: 'New Blog Posts',
    icon: BookOpen,
    action: () => onNavigate('blog'),
  },
  {
    type: 'comments',
    count: commentNotifCount,
    label: 'New Comment Replies',
    icon: MessageCircle,
    action: () => onNavigate('announcements'),
  },
];
```

Add `BookOpen` and `MessageCircle` to the existing lucide-react import:
```typescript
import { Bell, Loader2, MessageSquare, Trophy, Pin, Award, Star, BookOpen, MessageCircle } from 'lucide-react';
```

Update `totalNotifications`:
```typescript
const totalNotifications = newFeedbackCount + unreadMessages + newAnnouncementsCount + blogCount + commentNotifCount;
```

- [ ] **Step 2: Delete mock data from BlogTab**

Open `src/components/dashboard/BlogTab.tsx`. Find and delete the entire `mockBlogPosts` array (it starts at the line `const mockBlogPosts: BlogPost[] = [` and ends at the closing `];`). The component loads real data from `getBlogPosts()` — the mock is unused.

- [ ] **Step 3: Run lint + start dev server**

```bash
npm run lint
npm run dev
```

Navigate to the Home tab. Verify the notification cards now show 0 for announcements/blog if there's nothing new (not the total count of all posts ever).

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/HomeTab.tsx src/components/dashboard/BlogTab.tsx
git commit -m "fix: replace total counts with unread counts in HomeTab; remove BlogTab mock data"
```

---

## Task 6: Sidebar badges + markSectionSeen on tab navigation

**Files:**
- Modify: `src/components/DashboardV2.tsx`
- Modify: `src/components/dashboard/AnnouncementsTab.tsx`
- Modify: `src/components/dashboard/BlogTab.tsx`

- [ ] **Step 1: Add section unread state and loading to DashboardV2**

Add new imports:
```typescript
import { getSectionUnreadCounts } from '../lib/supabase/queries';
```

Add state variables (alongside `unreadMessages`):
```typescript
const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
const [unreadBlog, setUnreadBlog] = useState(0);
```

Update the `useEffect` that loads `unreadMessages` to also load section counts:
```typescript
useEffect(() => {
  getUnreadMessageCount()
    .then(setUnreadMessages)
    .catch(console.error);
  getSectionUnreadCounts(user.id)
    .then(({ announcements, blog }) => {
      setUnreadAnnouncements(announcements);
      setUnreadBlog(blog);
    })
    .catch(console.error);
}, [user.id]);
```

- [ ] **Step 2: Add sidebar badges for announcements and blog in DashboardV2**

Find the existing badge block for messages (around line 110):
```tsx
{id === 'messages' && unreadMessages > 0 && (
  <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
    {unreadMessages}
  </SidebarMenuBadge>
)}
```

Replace it with:
```tsx
{id === 'messages' && unreadMessages > 0 && (
  <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
    {unreadMessages > 9 ? '9+' : unreadMessages}
  </SidebarMenuBadge>
)}
{id === 'announcements' && unreadAnnouncements > 0 && (
  <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
    {unreadAnnouncements > 9 ? '9+' : unreadAnnouncements}
  </SidebarMenuBadge>
)}
{id === 'blog' && unreadBlog > 0 && (
  <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
    {unreadBlog > 9 ? '9+' : unreadBlog}
  </SidebarMenuBadge>
)}
```

- [ ] **Step 3: Clear badge when user navigates to announcements/blog tab**

Find the `SidebarMenuButton onClick` handler and update it to clear the relevant badge:
```tsx
onClick={() => {
  setActiveTab(tab.id);
  if (tab.id === 'announcements') setUnreadAnnouncements(0);
  if (tab.id === 'blog') setUnreadBlog(0);
}}
```

- [ ] **Step 4: Call `markSectionSeen` in AnnouncementsTab on mount**

Add to the imports in `src/components/dashboard/AnnouncementsTab.tsx`:
```typescript
import { markSectionSeen } from '../../lib/supabase/mutations';
```

Add a `useEffect` that runs once on mount (inside the component, before the existing effects):
```typescript
useEffect(() => {
  markSectionSeen('announcements').catch(console.error);
}, []);
```

- [ ] **Step 5: Call `markSectionSeen` in BlogTab on mount**

Same change for `src/components/dashboard/BlogTab.tsx`:
```typescript
import { markSectionSeen } from '../../lib/supabase/mutations';
```

```typescript
useEffect(() => {
  markSectionSeen('blog').catch(console.error);
}, []);
```

- [ ] **Step 6: Apply the same sidebar badge changes to AdminDashboardV2**

Open `src/components/AdminDashboardV2.tsx`. Find the unread messages `useEffect` and add:
```typescript
import { getSectionUnreadCounts } from '../lib/supabase/queries';
```

Add the same state variables and sidebar badge JSX as Steps 1-3 above, matching the structure of `AdminDashboardV2`. The admin sidebar has the same `SidebarMenuBadge` pattern.

- [ ] **Step 7: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/DashboardV2.tsx src/components/AdminDashboardV2.tsx \
        src/components/dashboard/AnnouncementsTab.tsx src/components/dashboard/BlogTab.tsx
git commit -m "feat: add sidebar unread badges for announcements and blog"
```

---

## Task 7: NotificationBell component

**Files:**
- Create: `src/components/NotificationBell.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Skeleton } from './ui/skeleton';
import { getNotificationSummary } from '../lib/supabase/queries';
import { markSectionSeen, markNotificationsRead } from '../lib/supabase/mutations';
import { subscribeToUserNotifications, unsubscribe } from '../lib/supabase/realtime';
import type { UserNotification } from '../lib/types';

type Summary = {
  unreadMessages: number;
  announcements: { count: number; latestTitle: string | null };
  blog: { count: number; latestTitle: string | null };
  commentNotifications: UserNotification[];
};

type NotificationBellProps = {
  userId: string;
  onNavigate: (tab: string) => void;
};

export function NotificationBell({ userId, onNavigate }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);

  const totalUnread = summary
    ? summary.unreadMessages +
      summary.announcements.count +
      summary.blog.count +
      summary.commentNotifications.length
    : 0;

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotificationSummary(userId);
      setSummary(data);
    } catch {
      // non-critical; leave stale state
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSummary();
    const channel = subscribeToUserNotifications(userId, () => loadSummary());
    return () => { unsubscribe(channel); };
  }, [userId, loadSummary]);

  async function handleMarkAllRead() {
    await Promise.all([
      markSectionSeen('announcements'),
      markSectionSeen('blog'),
      markNotificationsRead(),
    ]);
    setSummary((prev) =>
      prev
        ? {
            ...prev,
            announcements: { count: 0, latestTitle: null },
            blog: { count: 0, latestTitle: null },
            commentNotifications: [],
          }
        : null
    );
  }

  async function handleNavigate(tab: string, section?: 'announcements' | 'blog') {
    if (section) {
      await markSectionSeen(section).catch(console.error);
      setSummary((prev) => {
        if (!prev) return prev;
        return section === 'announcements'
          ? { ...prev, announcements: { count: 0, latestTitle: null } }
          : { ...prev, blog: { count: 0, latestTitle: null } };
      });
    }
    onNavigate(tab);
    setOpen(false);
  }

  async function handleCommentNotifClick(notif: UserNotification) {
    const tab =
      notif.reference_type === 'announcement_comment' ? 'announcements' : 'blog';
    await markNotificationsRead().catch(console.error);
    setSummary((prev) =>
      prev ? { ...prev, commentNotifications: [] } : null
    );
    onNavigate(tab);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
          aria-label={totalUnread > 0 ? `${totalUnread} unread notifications` : 'Notifications'}
        >
          <Bell className="h-4 w-4" />
          {totalUnread > 0 && (
            <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="right" className="w-72 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {totalUnread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ) : totalUnread === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CheckCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              You're all caught up!
            </div>
          ) : (
            <div className="py-1">
              {summary!.unreadMessages > 0 && (
                <button
                  onClick={() => handleNavigate('messages')}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm">
                    <strong>{summary!.unreadMessages}</strong>{' '}
                    unread {summary!.unreadMessages === 1 ? 'message' : 'messages'}
                  </span>
                </button>
              )}
              {summary!.announcements.count > 0 && (
                <button
                  onClick={() => handleNavigate('announcements', 'announcements')}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm line-clamp-2">
                    {summary!.announcements.latestTitle
                      ? <>New announcement: <strong>{summary!.announcements.latestTitle}</strong></>
                      : <><strong>{summary!.announcements.count}</strong> new announcements</>}
                  </span>
                </button>
              )}
              {summary!.blog.count > 0 && (
                <button
                  onClick={() => handleNavigate('blog', 'blog')}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm line-clamp-2">
                    {summary!.blog.latestTitle
                      ? <>New blog post: <strong>{summary!.blog.latestTitle}</strong></>
                      : <><strong>{summary!.blog.count}</strong> new blog posts</>}
                  </span>
                </button>
              )}
              {summary!.commentNotifications.map((notif) => (
                <button
                  key={notif.notification_id}
                  onClick={() => handleCommentNotifClick(notif)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">
                    {notif.type === 'comment_reply'
                      ? <><strong>{notif.actor_display_name ?? 'Someone'}</strong> replied to your comment</>
                      : <><strong>{notif.actor_display_name ?? 'Someone'}</strong> commented on your post</>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/NotificationBell.tsx
git commit -m "feat: add NotificationBell component"
```

---

## Task 8: Wire NotificationBell into both dashboards

**Files:**
- Modify: `src/components/DashboardV2.tsx`
- Modify: `src/components/AdminDashboardV2.tsx`

- [ ] **Step 1: Add NotificationBell to DashboardV2 sidebar header**

Add import:
```typescript
import { NotificationBell } from './NotificationBell';
```

Find the sidebar header block (the `<SidebarHeader>` section). The current header has:
```tsx
<div className="flex items-center gap-3">
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
    <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
  </div>
  <div className="flex flex-col group-data-[collapsible=icon]:hidden">
    ...
  </div>
</div>
```

Update it to add the bell:
```tsx
<div className="flex items-center gap-3">
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
    <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
  </div>
  <div className="flex flex-col flex-1 group-data-[collapsible=icon]:hidden">
    <span className="text-sm font-semibold leading-none text-sidebar-foreground">LBMAA</span>
    <span className="mt-0.5 text-xs text-sidebar-foreground/60">Parent Portal</span>
  </div>
  <div className="group-data-[collapsible=icon]:hidden">
    <NotificationBell
      userId={user.id}
      onNavigate={(tab) => setActiveTab(tab as TabId)}
    />
  </div>
</div>
```

- [ ] **Step 2: Add NotificationBell to AdminDashboardV2 sidebar header**

Same change in `AdminDashboardV2.tsx`. Import `NotificationBell` and add it to the header with the admin user's id and navigate handler.

- [ ] **Step 3: Start dev server and verify bell panel**

```bash
npm run dev
```

- Open the family portal. The bell icon should appear in the sidebar header.
- With unread content: click the bell → popover opens with rows.
- Click a row → navigates to the tab, row disappears from panel.
- Click "Mark all read" → panel shows "You're all caught up!".
- With no unread content: panel shows "You're all caught up!" immediately.

- [ ] **Step 4: Commit**

```bash
git add src/components/DashboardV2.tsx src/components/AdminDashboardV2.tsx
git commit -m "feat: wire NotificationBell into family and admin dashboards"
```

---

## Task 9: Comment reply UI — AnnouncementsTab

**Files:**
- Modify: `src/components/dashboard/AnnouncementsTab.tsx`

The component currently renders a flat list of comments. We add a Reply button on top-level comments and an inline compose box.

- [ ] **Step 1: Update the comment state to include `parent_comment_id`**

Find the `Comment` type local to this file and add the field:
```typescript
type Comment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  parentCommentId?: string | null;
};
```

- [ ] **Step 2: Update the comment data mapping to include `parent_comment_id`**

Find where raw comment data is mapped to the `Comment` type (in `loadData` or similar). Add:
```typescript
parentCommentId: comment.parent_comment_id ?? null,
```

- [ ] **Step 3: Add `replyingTo` state**

Inside the component, add:
```typescript
const [replyingTo, setReplyingTo] = useState<{ announcementId: string; commentId: string; authorName: string } | null>(null);
const [replyText, setReplyText] = useState('');
```

- [ ] **Step 4: Add `handleSendReply` handler**

```typescript
async function handleSendReply(announcementId: string) {
  if (!replyText.trim() || !replyingTo) return;
  setSavingComment(replyingTo.commentId);
  try {
    await createAnnouncementComment(announcementId, replyText.trim(), replyingTo.commentId);
    setReplyText('');
    setReplyingTo(null);
    await loadData();
  } catch {
    toast.error('Failed to send reply');
  } finally {
    setSavingComment(null);
  }
}
```

- [ ] **Step 5: Update comment rendering to show Reply button and inline compose**

Find the JSX that renders each comment. For each comment where `comment.parentCommentId` is null (top-level), add a Reply button. For replies, show the "↩ Replying to" tag. Example comment rendering:

```tsx
{/* Per-comment block */}
<div key={comment.id} className="space-y-1">
  {comment.parentCommentId && (
    <p className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
      ↩ Replying to {
        comments[announcement.id]?.find(c => c.id === comment.parentCommentId)?.authorName ?? 'comment'
      }
    </p>
  )}
  <div className="flex items-start gap-2">
    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
      <AvatarFallback className="text-xs">{comment.authorName[0]}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <span className="text-xs font-semibold">{comment.authorName}</span>
      <span className="text-xs text-muted-foreground ml-2">{formatDate(comment.createdAt)}</span>
      <p className="text-sm mt-0.5">{comment.body}</p>
      {!comment.parentCommentId && (
        <button
          onClick={() =>
            setReplyingTo({ announcementId: announcement.id, commentId: comment.id, authorName: comment.authorName })
          }
          className="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
        >
          Reply
        </button>
      )}
    </div>
  </div>

  {/* Inline reply compose box */}
  {replyingTo?.commentId === comment.id && (
    <div className="ml-8 mt-2 space-y-2">
      <Textarea
        autoFocus
        placeholder={`Reply to ${replyingTo.authorName}…`}
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        className="text-sm min-h-[60px] resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setReplyingTo(null); setReplyText(''); }
        }}
      />
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setReplyingTo(null); setReplyText(''); }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => handleSendReply(announcement.id)}
          disabled={!replyText.trim() || savingComment === comment.id}
        >
          {savingComment === comment.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Send
        </Button>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 6: Verify `createAnnouncementComment` import includes the updated signature**

The import should already include `createAnnouncementComment` — confirm it is imported from `'../../lib/supabase/mutations'`. No change needed if already imported.

- [ ] **Step 7: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/AnnouncementsTab.tsx
git commit -m "feat: add comment reply threading to AnnouncementsTab"
```

---

## Task 10: Comment reply UI — BlogTab

**Files:**
- Modify: `src/components/dashboard/BlogTab.tsx`

This is identical to Task 9 but for BlogTab. Apply the same changes:

- [ ] **Step 1: Update the `Comment` type to include `parentCommentId`**

Same as Task 9 Step 1.

- [ ] **Step 2: Update comment data mapping to include `parent_comment_id`**

Same as Task 9 Step 2.

- [ ] **Step 3: Add `replyingTo` and `replyText` state**

Same as Task 9 Step 3.

- [ ] **Step 4: Add `handleSendReply` handler**

```typescript
async function handleSendReply(postId: string) {
  if (!replyText.trim() || !replyingTo) return;
  setSavingComment(replyingTo.commentId);
  try {
    await createBlogComment(postId, replyText.trim(), replyingTo.commentId);
    setReplyText('');
    setReplyingTo(null);
    await loadData();
  } catch {
    toast.error('Failed to send reply');
  } finally {
    setSavingComment(null);
  }
}
```

- [ ] **Step 5: Update comment rendering**

Apply the same JSX changes from Task 9 Step 5, replacing `announcement.id` with `post.id` where applicable.

- [ ] **Step 6: Verify `createBlogComment` is imported**

Confirm `createBlogComment` is already imported from mutations.

- [ ] **Step 7: Run lint**

```bash
npm run lint
```

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/BlogTab.tsx
git commit -m "feat: add comment reply threading to BlogTab"
```

---

## Task 11: Notification preferences UI — family ProfileTab

**Files:**
- Modify: `src/components/dashboard/ProfileTab.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { getUserNotificationPreferences } from '../../lib/supabase/queries';
import { upsertUserNotificationPreferences } from '../../lib/supabase/mutations';
import type { UserNotificationPreferences } from '../../lib/types';
```

- [ ] **Step 2: Add preferences state inside ProfileTab**

```typescript
const defaultPrefs: Omit<UserNotificationPreferences, 'user_id' | 'updated_at'> = {
  notify_messages: true,
  notify_announcements: true,
  notify_blog_posts: false,
  notify_comment_replies: true,
  notify_post_comments: true,
};

const [prefs, setPrefs] = useState(defaultPrefs);
const [prefsLoading, setPrefsLoading] = useState(true);
```

- [ ] **Step 3: Load preferences on mount**

Add a `useEffect`:
```typescript
useEffect(() => {
  getUserNotificationPreferences()
    .then((data) => {
      if (data) {
        setPrefs({
          notify_messages: data.notify_messages,
          notify_announcements: data.notify_announcements,
          notify_blog_posts: data.notify_blog_posts,
          notify_comment_replies: data.notify_comment_replies,
          notify_post_comments: data.notify_post_comments,
        });
      }
    })
    .catch(console.error)
    .finally(() => setPrefsLoading(false));
}, []);
```

- [ ] **Step 4: Add `handlePrefToggle`**

```typescript
async function handlePrefToggle(
  key: keyof typeof defaultPrefs,
  value: boolean
) {
  const updated = { ...prefs, [key]: value };
  setPrefs(updated);
  try {
    await upsertUserNotificationPreferences({ [key]: value });
    toast.success('Notification preferences saved');
  } catch {
    setPrefs(prefs); // rollback
    toast.error('Failed to save preferences');
  }
}
```

- [ ] **Step 5: Add the Notification Preferences card to the JSX**

Find the return JSX and add the following card after the last existing card:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Notification Preferences</CardTitle>
    <CardDescription>Choose when you'd like to receive emails</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {prefsLoading ? (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    ) : (
      <>
        {([
          { key: 'notify_messages' as const,        label: 'New Messages',           sub: 'Email me when I receive a message' },
          { key: 'notify_announcements' as const,   label: 'Academy Announcements',  sub: 'Email me when a new announcement is posted' },
          { key: 'notify_blog_posts' as const,      label: 'Blog Posts',             sub: 'Email me when a new blog post is published' },
          { key: 'notify_comment_replies' as const, label: 'Replies to My Comments', sub: 'Email me when someone replies to a comment I left' },
          { key: 'notify_post_comments' as const,   label: 'Comments on My Posts',   sub: 'Email me when someone comments on a blog post I wrote' },
        ] as const).map(({ key, label, sub }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-1">
            <Label htmlFor={key} className="flex flex-col gap-0.5 cursor-pointer flex-1">
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground font-normal">{sub}</span>
            </Label>
            <Switch
              id={key}
              checked={prefs[key]}
              onCheckedChange={(checked) => handlePrefToggle(key, checked)}
            />
          </div>
        ))}
      </>
    )}
  </CardContent>
</Card>
```

Add `Skeleton` to imports if not already present:
```typescript
import { Skeleton } from '../ui/skeleton';
```

- [ ] **Step 6: Run lint + dev server**

```bash
npm run lint
npm run dev
```

Navigate to Profile → scroll to the Notification Preferences card. Toggle each switch. Verify the toast appears and the toggle persists after refreshing.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/ProfileTab.tsx
git commit -m "feat: add notification preferences UI to family ProfileTab"
```

---

## Task 12: Notification preferences UI — admin AdminProfileTab

**Files:**
- Modify: `src/components/admin/AdminProfileTab.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { getAdminNotificationPreferences } from '../../lib/supabase/queries';
import { upsertAdminNotificationPreferences } from '../../lib/supabase/mutations';
import { upsertAdminNotificationSetting } from '../../lib/supabase/mutations';
import type { AdminNotificationPreferences } from '../../lib/types';
```

Note: `upsertAdminNotificationSetting` handles the enrollment leads toggle by upserting to `admin_notification_settings`. Find this function in mutations.ts — it should already exist (used by `AdminAvailabilitySettings`). If it doesn't exist under that name, find the mutation that upserts to `admin_notification_settings` and import it.

- [ ] **Step 2: Add state inside AdminProfileTab**

```typescript
const defaultAdminPrefs: Omit<AdminNotificationPreferences, 'user_id' | 'updated_at'> = {
  notify_messages: true,
  notify_blog_posts: true,
  notify_comment_replies: true,
  notify_post_comments: true,
};

const [adminPrefs, setAdminPrefs] = useState(defaultAdminPrefs);
const [notifyNewLeads, setNotifyNewLeads] = useState(true);
const [prefsLoading, setPrefsLoading] = useState(true);
```

- [ ] **Step 3: Load preferences on mount**

```typescript
useEffect(() => {
  Promise.all([
    getAdminNotificationPreferences(),
    // Check if this admin's email is in admin_notification_settings with notify_new_leads=true
    supabase
      .from('admin_notification_settings')
      .select('notify_new_leads')
      .eq('email', user.email)
      .eq('is_active', true)
      .maybeSingle(),
  ])
    .then(([prefs, leadsSetting]) => {
      if (prefs) {
        setAdminPrefs({
          notify_messages: prefs.notify_messages,
          notify_blog_posts: prefs.notify_blog_posts,
          notify_comment_replies: prefs.notify_comment_replies,
          notify_post_comments: prefs.notify_post_comments,
        });
      }
      setNotifyNewLeads(leadsSetting.data?.notify_new_leads ?? false);
    })
    .catch(console.error)
    .finally(() => setPrefsLoading(false));
}, [user.email]);
```

- [ ] **Step 4: Add `handleAdminPrefToggle` and `handleNewLeadsToggle`**

```typescript
async function handleAdminPrefToggle(
  key: keyof typeof defaultAdminPrefs,
  value: boolean
) {
  const updated = { ...adminPrefs, [key]: value };
  setAdminPrefs(updated);
  try {
    await upsertAdminNotificationPreferences({ [key]: value });
    toast.success('Notification preferences saved');
  } catch {
    setAdminPrefs(adminPrefs);
    toast.error('Failed to save preferences');
  }
}

async function handleNewLeadsToggle(value: boolean) {
  setNotifyNewLeads(value);
  try {
    // Upsert this admin's email into admin_notification_settings
    const { error } = await supabase
      .from('admin_notification_settings')
      .upsert(
        { email: user.email, notify_new_leads: value, is_active: true },
        { onConflict: 'email' }
      );
    if (error) throw error;
    toast.success('Notification preferences saved');
  } catch {
    setNotifyNewLeads(!value);
    toast.error('Failed to save preferences');
  }
}
```

- [ ] **Step 5: Add the preferences card to AdminProfileTab JSX**

Add after the last existing card:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Notification Preferences</CardTitle>
    <CardDescription>Choose when you'd like to receive emails</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {prefsLoading ? (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    ) : (
      <>
        <div className="flex items-center justify-between gap-4 py-1">
          <Label htmlFor="notify_new_leads" className="flex flex-col gap-0.5 cursor-pointer flex-1">
            <span className="font-medium">New Enrollment Inquiries</span>
            <span className="text-xs text-muted-foreground font-normal">Email me when a family submits a contact form</span>
          </Label>
          <Switch
            id="notify_new_leads"
            checked={notifyNewLeads}
            onCheckedChange={handleNewLeadsToggle}
          />
        </div>
        {([
          { key: 'notify_messages' as const,        label: 'New Messages',           sub: 'Email me when I receive a message' },
          { key: 'notify_blog_posts' as const,      label: 'New Blog Posts',         sub: 'Email me when anyone publishes a blog post' },
          { key: 'notify_comment_replies' as const, label: 'Replies to My Comments', sub: 'Email me when someone replies to a comment I left' },
          { key: 'notify_post_comments' as const,   label: 'Comments on My Posts',   sub: 'Email me when someone comments on a post or announcement I wrote' },
        ] as const).map(({ key, label, sub }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-1">
            <Label htmlFor={key} className="flex flex-col gap-0.5 cursor-pointer flex-1">
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground font-normal">{sub}</span>
            </Label>
            <Switch
              id={key}
              checked={adminPrefs[key]}
              onCheckedChange={(checked) => handleAdminPrefToggle(key, checked)}
            />
          </div>
        ))}
      </>
    )}
  </CardContent>
</Card>
```

- [ ] **Step 6: Run lint + dev server**

```bash
npm run lint
npm run dev
```

Log in as admin, go to Profile tab. Verify the Notification Preferences card renders and toggles save.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/AdminProfileTab.tsx
git commit -m "feat: add notification preferences UI to admin AdminProfileTab"
```

---

## Task 13: Email templates — four new templates

**Files:**
- Modify: `supabase/functions/send-email/templates.ts`

- [ ] **Step 1: Add four template functions at the end of templates.ts**

```typescript
export function announcementNotificationHtml(title: string, body: string, url: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New announcement from LBMAA</p>
    <div style="background:#f8f9fa;border-left:4px solid #c8102e;padding:14px 16px;margin-bottom:20px;border-radius:0 4px 4px 0;">
      <p style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0 0 6px 0;">${title}</p>
      <p style="font-size:13px;color:#555;margin:0;line-height:1.5;">${body.substring(0, 200)}${body.length > 200 ? '…' : ''}</p>
    </div>
    ${ctaButton(url, 'Read Announcement')}
  `)
}

export function blogPostNotificationHtml(title: string, authorName: string, url: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New post in the Parent Blog</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${authorName}</strong> published a new post:
    </p>
    <div style="background:#f8f9fa;border-left:4px solid #c8102e;padding:14px 16px;margin-bottom:20px;border-radius:0 4px 4px 0;">
      <p style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0;">${title}</p>
    </div>
    ${ctaButton(url, 'Read Post')}
  `)
}

export function commentReplyHtml(replierName: string, originalSnippet: string, url: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">${replierName} replied to your comment</p>
    <p style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.65;">Your comment:</p>
    <div style="background:#f8f9fa;border:1px solid #e2e8f0;padding:12px 16px;margin-bottom:20px;border-radius:4px;">
      <p style="font-size:13px;color:#666;margin:0;font-style:italic;">"${originalSnippet}${originalSnippet.length >= 100 ? '…' : ''}"</p>
    </div>
    ${ctaButton(url, 'View Reply')}
  `)
}

export function postCommentHtml(commenterName: string, postTitle: string, url: string): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New comment on your post</p>
    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">
      <strong>${commenterName}</strong> commented on:
    </p>
    <div style="background:#f8f9fa;border-left:4px solid #c8102e;padding:14px 16px;margin-bottom:20px;border-radius:0 4px 4px 0;">
      <p style="font-size:15px;font-weight:600;color:#1a1a2e;margin:0;">${postTitle}</p>
    </div>
    ${ctaButton(url, 'View Comment')}
  `)
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/send-email/templates.ts
git commit -m "feat: add announcement, blog post, comment reply, and post comment email templates"
```

---

## Task 14: Extend send-email edge function

**Files:**
- Modify: `supabase/functions/send-email/types.ts`
- Modify: `supabase/functions/send-email/index.ts`

- [ ] **Step 1: Add `PortalEmailQueueRecord` to types.ts**

```typescript
export interface PortalEmailQueueRecord {
  queue_id: string
  recipient_email: string
  type: 'announcement' | 'blog_post' | 'comment_reply' | 'post_comment'
  payload: {
    // announcement
    title?: string
    body?: string
    // blog_post
    author_name?: string
    post_id?: string
    // comment_reply
    replier_name?: string
    original_snippet?: string
    // post_comment
    commenter_name?: string
    post_title?: string
    // shared
    tab?: string
    announcement_id?: string
  }
  status: string
  created_at: string
}
```

- [ ] **Step 2: Update imports in index.ts**

Add `PortalEmailQueueRecord` to the import from `'./types.ts'`:
```typescript
import type { WebhookPayload, EnrollmentLeadNotificationRecord, MessageRecord, EnrollmentLead, PortalEmailQueueRecord } from './types.ts'
```

Add the four new template functions to the import from `'./templates.ts'`:
```typescript
import {
  enrollmentNotificationHtml,
  messagingNotificationHtml,
  approvalEmailHtml,
  denialEmailHtml,
  bookingConfirmationHtml,
  reminderEmailHtml,
  submissionConfirmationHtml,
  announcementNotificationHtml,
  blogPostNotificationHtml,
  commentReplyHtml,
  postCommentHtml,
} from './templates.ts'
```

- [ ] **Step 3: Add `handlePortalNotification` function**

Add after the `handleMessageNotification` function and before `Deno.serve`:

```typescript
async function handlePortalNotification(record: PortalEmailQueueRecord): Promise<void> {
  const supabase = adminClient()
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
  const tab = record.payload.tab ?? 'announcements'
  const tabUrl = `${appUrl}/dashboard?tab=${tab}`

  let subject: string
  let html: string

  switch (record.type) {
    case 'announcement':
      subject = 'New announcement — LBMAA'
      html = announcementNotificationHtml(
        record.payload.title ?? '',
        record.payload.body ?? '',
        tabUrl
      )
      break
    case 'blog_post':
      subject = `New post from ${record.payload.author_name ?? 'a member'} — LBMAA`
      html = blogPostNotificationHtml(
        record.payload.title ?? '',
        record.payload.author_name ?? 'A member',
        tabUrl
      )
      break
    case 'comment_reply':
      subject = `${record.payload.replier_name ?? 'Someone'} replied to your comment — LBMAA`
      html = commentReplyHtml(
        record.payload.replier_name ?? 'Someone',
        record.payload.original_snippet ?? '',
        tabUrl
      )
      break
    case 'post_comment':
      subject = 'New comment on your post — LBMAA'
      html = postCommentHtml(
        record.payload.commenter_name ?? 'Someone',
        record.payload.post_title ?? 'your post',
        tabUrl
      )
      break
    default:
      console.warn('[send-email] Unknown portal notification type:', record.type)
      return
  }

  await sendEmail(record.recipient_email, subject, html)

  await supabase
    .from('portal_email_queue')
    .update({ status: 'sent' })
    .eq('queue_id', record.queue_id)
}
```

- [ ] **Step 4: Update `handleMessageNotification` to check preferences**

Find `handleMessageNotification`. After fetching the recipient's `user_id` (the `recipient` variable) and before calling `sendEmail`, add a preferences check:

```typescript
// Check if the recipient has opted out of message emails
const { data: prefRow } = await supabase
  .from('user_notification_preferences')
  .select('notify_messages')
  .eq('user_id', recipient.user_id)
  .maybeSingle()

const prefRowAdmin = prefRow === null
  ? await supabase
      .from('admin_notification_preferences')
      .select('notify_messages')
      .eq('user_id', recipient.user_id)
      .maybeSingle()
  : null

const notifyMessages =
  prefRow?.notify_messages ??
  prefRowAdmin?.data?.notify_messages ??
  true  // default: send if no prefs row exists

if (!notifyMessages) return
```

Place this block immediately before the `sendEmail(...)` call at the end of `handleMessageNotification`.

- [ ] **Step 5: Add routing for `portal_email_queue` in the main handler**

Find:
```typescript
if (payload.table === 'enrollment_lead_notifications') {
  await handleEnrollmentNotification(payload.record as EnrollmentLeadNotificationRecord)
} else if (payload.table === 'messages') {
  await handleMessageNotification(payload.record as MessageRecord)
}
```

Replace with:
```typescript
if (payload.table === 'enrollment_lead_notifications') {
  await handleEnrollmentNotification(payload.record as EnrollmentLeadNotificationRecord)
} else if (payload.table === 'messages') {
  await handleMessageNotification(payload.record as MessageRecord)
} else if (payload.table === 'portal_email_queue') {
  await handlePortalNotification(payload.record as PortalEmailQueueRecord)
}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-email/types.ts supabase/functions/send-email/index.ts
git commit -m "feat: extend send-email to handle portal_email_queue and check message notification prefs"
```

---

## Task 15: Deploy edge function + manual webhook setup

**Files:** None (deployment + dashboard config)

- [ ] **Step 1: Deploy the updated send-email edge function via MCP**

Use `mcp__supabase__deploy_edge_function` with:
- `name`: `send-email`
- `entrypoint_path`: `supabase/functions/send-email/index.ts`

- [ ] **Step 2: Add the portal_email_queue database webhook in Supabase dashboard**

This is a manual step in the Supabase dashboard:

1. Go to **Database → Webhooks**
2. Click **Create a new hook**
3. Configure:
   - **Name:** `portal_email_queue_webhook`
   - **Table:** `portal_email_queue`
   - **Events:** `INSERT`
   - **Type:** HTTP Request
   - **Method:** POST
   - **URL:** `https://<your-project-ref>.supabase.co/functions/v1/send-email`
   - **HTTP Headers:** Add `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
4. Save

Note: The service role key is in Supabase dashboard → Settings → API.

- [ ] **Step 3: End-to-end smoke test**

With the dev server running (`npm run dev`):

1. **Announcement email:** As admin, post a new announcement. Check that a row appears in `portal_email_queue` with `type = 'announcement'` and `status = 'sent'` within ~5 seconds.

2. **Blog post email:** Post a new blog post. Check `portal_email_queue` for `type = 'blog_post'`.

3. **Comment reply in-app:** Family user A comments on an announcement. Family user B replies. Check that user A has a `user_notifications` row with `type = 'comment_reply'` and `is_read = false`.

4. **Comment reply email:** Same as above — check `portal_email_queue` for `type = 'comment_reply'`.

5. **Bell panel:** Open the bell panel as user A — the comment reply should appear.

6. **Appointment reminder:** Manually insert an enrollment lead with `appointment_date = CURRENT_DATE + 2` and status `appointment_scheduled`. Run the cron manually via Supabase SQL editor: `SELECT cron.run_job('appointment-reminders');` — verify a `reminder` row is inserted in `enrollment_lead_notifications`.

Use `mcp__supabase__execute_sql` to inspect `portal_email_queue` and `user_notifications`:
```sql
SELECT type, status, created_at FROM portal_email_queue ORDER BY created_at DESC LIMIT 10;
SELECT type, is_read, actor_display_name, created_at FROM user_notifications ORDER BY created_at DESC LIMIT 10;
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: deploy updated send-email and complete notification system overhaul"
```
