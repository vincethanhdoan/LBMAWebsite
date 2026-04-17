# Spec: Notification System Overhaul

**Date:** 2026-04-17
**Status:** Approved

---

## Overview

A full overhaul of the LBMAA notification system. Covers five areas: fixing the broken message badge, adding unread tracking for announcements and blog, a bell panel in the sidebar, comment reply threading, notification preferences settings for both families and admins, and wiring up automated appointment reminder emails. Designed for non-tech-savvy parents — plain English labels, big toggles, minimal steps.

---

## In Scope

- Fix: unread message badge not clearing after reading messages
- Fix: `getCommunicationCounts` returning total counts instead of unread counts
- Fix: `BlogTab` mock data cleanup
- Feature: `last_seen_at` unread tracking for announcements and blog
- Feature: Bell panel (`NotificationBell`) in family and admin sidebar headers
- Feature: Per-section sidebar badges (announcements, blog) matching existing messages badge style
- Feature: Comment reply threading (one level deep) on `announcement_comments` and `blog_comments`
- Feature: `user_notifications` table for in-app comment reply/post-comment tracking
- Feature: `user_notification_preferences` for family users
- Feature: `admin_notification_preferences` for admin users
- Feature: Notification preferences UI in `ProfileTab` (family) and `AdminProfileTab` (admin)
- Feature: Email delivery for new announcements, new blog posts, comment replies, and post comments via new `portal_email_queue` table + extended `send-email` function
- Feature: Automated appointment reminder emails via `pg_cron`

## Out of Scope

- Push notifications (browser/mobile)
- Deep comment nesting (max one level of replies)
- Notification history / archive
- SMS channel
- Admin broadcast messaging
- Retry mechanism for failed `portal_email_queue` emails

---

## 1. Data Layer

### 1.1 `user_section_last_seen` — unread tracking for announcements and blog

```sql
CREATE TABLE user_section_last_seen (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section   TEXT NOT NULL CHECK (section IN ('announcements', 'blog')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, section)
);
```

RLS: users can read and upsert only their own row.

When a user opens the Announcements or Blog tab, upsert their row with `last_seen_at = NOW()`. Unread count = `COUNT(*) WHERE created_at > last_seen_at`.

### 1.2 `user_notifications` — in-app targeted notifications (comment events only)

```sql
CREATE TABLE user_notifications (
  notification_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('comment_reply', 'post_comment')),
  reference_id     UUID NOT NULL,   -- the triggering comment_id
  reference_type   TEXT NOT NULL CHECK (reference_type IN ('announcement_comment', 'blog_comment')),
  is_read          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON user_notifications(recipient_user_id, is_read);
```

RLS: users can read and update only their own rows.

Rows are inserted by DB triggers (see §1.5). Marked `is_read = true` when the user opens the bell panel or navigates to the relevant tab.

### 1.3 `user_notification_preferences` — family email preferences

```sql
CREATE TABLE user_notification_preferences (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_messages        BOOLEAN NOT NULL DEFAULT true,
  notify_announcements   BOOLEAN NOT NULL DEFAULT true,
  notify_blog_posts      BOOLEAN NOT NULL DEFAULT false,
  notify_comment_replies BOOLEAN NOT NULL DEFAULT true,
  notify_post_comments   BOOLEAN NOT NULL DEFAULT true,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RLS: users can read and upsert only their own row. Row is created on first login (or lazily on first preferences load, falling back to defaults).

### 1.4 `admin_notification_preferences` — admin email preferences

```sql
CREATE TABLE admin_notification_preferences (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_messages        BOOLEAN NOT NULL DEFAULT true,
  notify_blog_posts      BOOLEAN NOT NULL DEFAULT true,
  notify_comment_replies BOOLEAN NOT NULL DEFAULT true,
  notify_post_comments   BOOLEAN NOT NULL DEFAULT true,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Note: `notify_new_leads` is **not** in this table. It remains in `admin_notification_settings` (the existing email-recipients list). The admin preferences UI toggle for "New Enrollment Inquiries" upserts the admin's email into `admin_notification_settings`.

RLS: admins can read and upsert only their own row.

### 1.5 `portal_email_queue` — outbox for portal notification emails

```sql
CREATE TABLE portal_email_queue (
  queue_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email  TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN (
                     'announcement', 'blog_post',
                     'comment_reply', 'post_comment'
                   )),
  payload          JSONB NOT NULL,
  status           TEXT NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued', 'sent', 'failed')),
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

A Supabase database webhook on `INSERT` fires the `send-email` edge function, identical to the existing `enrollment_lead_notifications` webhook pattern.

RLS: no direct user access — written only by DB triggers and security-definer functions, read only by the service role.

### 1.6 Comment threading — `parent_comment_id` on both tables

```sql
-- announcement_comments
ALTER TABLE announcement_comments
  ADD COLUMN parent_comment_id UUID NULL
    REFERENCES announcement_comments(comment_id) ON DELETE CASCADE;

-- blog_comments
ALTER TABLE blog_comments
  ADD COLUMN parent_comment_id UUID NULL
    REFERENCES blog_comments(comment_id) ON DELETE CASCADE;
```

Only one level of nesting is enforced in application logic (the UI only shows a Reply button on top-level comments, not on replies).

### 1.7 DB triggers for comment notifications

Two trigger functions cover the same logic for each comment table. On INSERT:

1. **If `parent_comment_id IS NOT NULL`** (a reply):
   - Find the parent comment's `author_user_id`.
   - Don't notify if the replier is the same person.
   - Insert a `user_notifications` row (`type = 'comment_reply'`).
   - Insert a `portal_email_queue` row (`type = 'comment_reply'`) if the parent author has `notify_comment_replies = true`.

2. **Post-author notification** (any new top-level comment, `parent_comment_id IS NULL`):
   - Find the post/announcement `author_user_id`.
   - Don't notify if commenter is the post author.
   - Insert a `user_notifications` row (`type = 'post_comment'`).
   - Insert a `portal_email_queue` row (`type = 'post_comment'`) if the post author has `notify_post_comments = true`.

**Role-agnostic preference lookup:** Triggers look up preferences via a UNION of both tables so the logic is the same regardless of whether the target user is a family or admin:

```sql
SELECT notify_comment_replies, notify_post_comments
FROM (
  SELECT user_id, notify_comment_replies, notify_post_comments
    FROM user_notification_preferences
  UNION ALL
  SELECT user_id, notify_comment_replies, notify_post_comments
    FROM admin_notification_preferences
) prefs
WHERE user_id = <target_author_user_id>
LIMIT 1;
```

If no preferences row exists for the user, default behaviour is to send the email (opt-out model).

### 1.8 DB triggers for announcement and blog post fan-out emails

On INSERT into `announcements`:
```sql
INSERT INTO portal_email_queue (recipient_email, type, payload, status)
SELECT au.email, 'announcement',
  jsonb_build_object('title', NEW.title, 'body', NEW.body, 'announcement_id', NEW.announcement_id),
  'queued'
FROM user_notification_preferences unp
JOIN auth.users au ON au.id = unp.user_id
WHERE unp.notify_announcements = true;
```

On INSERT into `blog_posts`, same pattern — fans out to:
- Family users with `notify_blog_posts = true` (from `user_notification_preferences`)
- Admin users with `notify_blog_posts = true` (from `admin_notification_preferences`)

### 1.9 `pg_cron` — appointment reminder scheduler

```sql
SELECT cron.schedule(
  'appointment-reminders',
  '0 8 * * *',   -- daily at 8 AM UTC
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

The existing `send-email` function already handles the `reminder` type — no changes needed there.

---

## 2. Bug Fix: Message Badge Not Clearing

**Root cause:** `unreadMessages` in `DashboardV2` is fetched once on mount and never updated after `markConversationAsRead()` is called inside `MessagesTab`.

**Fix:** Pass a `onUnreadCountChange(count: number)` callback from `DashboardV2` to `MessagesTab`. After `markConversationAsRead()` succeeds, `MessagesTab` calls `onUnreadCountChange` with the new total. `DashboardV2` updates `unreadMessages` state, clearing the badge.

Same pattern applies to `AdminDashboardV2` → `AdminMessagesTab`.

---

## 3. Unread Tracking — Announcements and Blog

### Reading unread counts

New query `getSectionUnreadCounts(userId)` returns `{ announcements: number, blog: number }`:

```sql
SELECT
  (SELECT COUNT(*) FROM announcements
   WHERE created_at > COALESCE(
     (SELECT last_seen_at FROM user_section_last_seen
      WHERE user_id = $1 AND section = 'announcements'), '1970-01-01')) AS announcements,
  (SELECT COUNT(*) FROM blog_posts
   WHERE created_at > COALESCE(
     (SELECT last_seen_at FROM user_section_last_seen
      WHERE user_id = $1 AND section = 'blog'), '1970-01-01')) AS blog;
```

### Marking sections as seen

New mutation `markSectionSeen(section: 'announcements' | 'blog')` upserts `last_seen_at = NOW()`. Called when the user navigates to the tab.

### HomeTab fix

Replace `getCommunicationCounts` with a combined call:
- `getSectionUnreadCounts` for announcements + blog counts
- `getUnreadMessageCount` for messages (already correct)
- `getUnreadNotificationCount` (new, counts `user_notifications` where `is_read = false`) for comment events

The HomeTab notification cards now show genuinely new items. Blog posts card is added to the existing grid.

---

## 4. Bell Panel — `NotificationBell` Component

**Location:** `src/components/NotificationBell.tsx` — shared between family and admin dashboards.

### Props

```typescript
type NotificationBellProps = {
  onNavigate: (tab: string) => void;
  userId: string;
  role: 'family' | 'admin';
};
```

### Behaviour

- Renders a `Bell` icon button in the sidebar header area, right of the LBMAA brand.
- A small filled red dot appears on the icon when total unread > 0.
- Clicking opens a shadcn `Popover`.
- Popover fetches: `getSectionUnreadCounts` + `getUnreadMessageCount` + `getUnreadNotificationCount`.
- Rows rendered (only shown if count > 0):
  - `● 2 unread messages` → navigates to `messages` tab, marks conversation read
  - `● New announcement: "{title}"` → navigates to `announcements`, calls `markSectionSeen('announcements')`
  - `● New blog post: "{title}"` → navigates to `blog`, calls `markSectionSeen('blog')`
  - `● Maria replied to your comment` → navigates to the relevant tab, marks `user_notifications` rows read
- "Mark all as read" button at bottom: calls `markSectionSeen` for both sections + marks all `user_notifications` as read.
- Empty state: *"You're all caught up!"* with a muted checkmark icon.
- Loading: skeleton rows while fetching.

### Real-time updates

Subscribe to `user_notifications` table via Supabase Realtime (`INSERT` on `recipient_user_id = current user`). When a new row arrives, re-fetch counts and update the dot indicator without a full page reload.

---

## 5. Sidebar Badges

Extend the existing `SidebarMenuBadge` pattern (currently only on `messages`) to `announcements` and `blog`:

```tsx
{id === 'messages' && unreadMessages > 0 && (
  <SidebarMenuBadge ...>{unreadMessages}</SidebarMenuBadge>
)}
{id === 'announcements' && unreadAnnouncements > 0 && (
  <SidebarMenuBadge ...>{unreadAnnouncements}</SidebarMenuBadge>
)}
{id === 'blog' && unreadBlog > 0 && (
  <SidebarMenuBadge ...>{unreadBlog}</SidebarMenuBadge>
)}
```

Counts are loaded in `DashboardV2` alongside `unreadMessages` and passed down. Badges clear when the user navigates to the tab (via `markSectionSeen`).

---

## 6. Comment Reply Threading

### Data

`announcement_comments` and `blog_comments` gain `parent_comment_id` (see §1.6).

### UI — Reply button

Every **top-level comment** (where `parent_comment_id IS NULL`) gets a small "Reply" text button below the body. Clicking it renders an inline compose box directly beneath that comment:

```
┌─────────────────────────────────────────┐
│ Jennifer M.                             │
│ Great tips for practicing at home!      │
│                                    [Reply] │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Write a reply...                  │  │
│  └───────────────────────────────────┘  │
│                              [Cancel] [Send] │
└─────────────────────────────────────────┘
```

Replies appear in the flat comment list immediately after their parent, with a **"↩ Replying to [Name]"** tag above the body in muted text. No further nesting.

### Mutations

`createAnnouncementComment(announcementId, body, parentCommentId?)` and `createBlogComment(postId, body, parentCommentId?)` — add optional `parent_comment_id` argument to existing mutations.

---

## 7. Notification Preferences UI

### Family — `ProfileTab`

A "Notification Preferences" card is added below the existing profile info card. Loads preferences from `user_notification_preferences` (falls back to defaults if no row exists). Each toggle calls `upsertUserNotificationPreferences` on change, with a `toast.success('Preferences saved')` confirmation.

| Toggle label | Sublabel | Default |
|---|---|---|
| New Messages | Email me when I receive a message | On |
| Academy Announcements | Email me when a new announcement is posted | On |
| Blog Posts | Email me when a new blog post is published | Off |
| Replies to My Comments | Email me when someone replies to a comment I left | On |
| Comments on My Posts | Email me when someone comments on a blog post I wrote | On |

### Admin — `AdminProfileTab`

Same card structure. Loads from `admin_notification_preferences`. The "New Enrollment Inquiries" toggle upserts the admin's email into `admin_notification_settings` (existing table).

| Toggle label | Sublabel | Default |
|---|---|---|
| New Enrollment Inquiries | Email me when a family submits a contact form | On |
| New Messages | Email me when I receive a message | On |
| New Blog Posts | Email me when anyone publishes a blog post | On |
| Replies to My Comments | Email me when someone replies to a comment I left | On |
| Comments on My Posts | Email me when someone comments on a post or announcement I wrote | On |

---

## 8. Email Infrastructure — New Types

### Extended `send-email` routing

Add a third handler in `supabase/functions/send-email/index.ts`:

```
portal_email_queue → handlePortalNotification()
```

`handlePortalNotification()` switches on `record.type`:
- `announcement` → `announcementNotificationHtml(payload, portalUrl)`
- `blog_post` → `blogPostNotificationHtml(payload, portalUrl)`
- `comment_reply` → `commentReplyHtml(payload, portalUrl)`
- `post_comment` → `postCommentHtml(payload, portalUrl)`

Marks the queue row `status = 'sent'` on success.

### Message notification preference enforcement

The existing `handleMessageNotification()` in `send-email` must be updated to check the recipient's preference before sending. After looking up the recipient's user ID, query:

```sql
SELECT notify_messages FROM (
  SELECT user_id, notify_messages FROM user_notification_preferences
  UNION ALL
  SELECT user_id, notify_messages FROM admin_notification_preferences
) prefs
WHERE user_id = <recipient_user_id>
LIMIT 1;
```

If `notify_messages = false` (or no row exists and opt-in logic applies — use opt-out: default to send), skip sending and mark the notification row `status = 'sent'` to avoid retries.

### New templates (`templates.ts`)

All templates share the existing `wrap()` shell and `ctaButton()` helper.

| Function | Subject line | CTA |
|---|---|---|
| `announcementNotificationHtml(title, body, portalUrl)` | `New announcement — LBMAA` | View Announcement → `/dashboard?tab=announcements` |
| `blogPostNotificationHtml(title, authorName, portalUrl)` | `New post from {authorName} — LBMAA` | Read Post → `/dashboard?tab=blog` |
| `commentReplyHtml(replierName, originalSnippet, tab, portalUrl)` | `{replierName} replied to your comment — LBMAA` | View Reply → `/dashboard?tab={tab}` where `tab` is `announcements` or `blog` per `reference_type` in payload |
| `postCommentHtml(commenterName, postTitle, tab, portalUrl)` | `New comment on your post — LBMAA` | View Comment → `/dashboard?tab={tab}` where `tab` is `announcements` or `blog` per `reference_type` in payload |

### DB webhook

Add a new Supabase database webhook:
- Table: `portal_email_queue`
- Event: `INSERT`
- Target: `send-email` edge function URL

Same `Authorization: Bearer <service_role_key>` pattern as existing webhooks.

---

## 9. BlogTab Cleanup

Delete the `mockBlogPosts` array and all its mock data from `src/components/dashboard/BlogTab.tsx`. The component already loads real data from `getBlogPosts()` — the mock was never used in the active code path.

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/019_notification_system.sql` | Create — all new tables, triggers, pg_cron job |
| `supabase/functions/send-email/index.ts` | Extend — add `portal_email_queue` handler and routing |
| `supabase/functions/send-email/templates.ts` | Extend — four new template functions |
| `src/lib/types.ts` | Add types for new tables |
| `src/lib/supabase/queries.ts` | Add `getSectionUnreadCounts`, `getUnreadNotificationCount`, `getUserNotificationPreferences`, `getAdminNotificationPreferences` |
| `src/lib/supabase/mutations.ts` | Add `markSectionSeen`, `markNotificationsRead`, `upsertUserNotificationPreferences`, `upsertAdminNotificationPreferences`; update `createAnnouncementComment` and `createBlogComment` to accept `parentCommentId` |
| `src/lib/supabase/realtime.ts` | Add `subscribeToUserNotifications` |
| `src/components/NotificationBell.tsx` | Create — shared bell panel component |
| `src/components/DashboardV2.tsx` | Add `NotificationBell`, sidebar badges for announcements + blog, pass `onUnreadCountChange` to `MessagesTab`, load section unread counts |
| `src/components/AdminDashboardV2.tsx` | Same changes as DashboardV2 for admin side |
| `src/components/dashboard/MessagesTab.tsx` | Call `onUnreadCountChange` after `markConversationAsRead` |
| `src/components/admin/AdminMessagesTab.tsx` | Same as MessagesTab |
| `src/components/dashboard/AnnouncementsTab.tsx` | Call `markSectionSeen('announcements')` on mount; add reply UI to comments |
| `src/components/dashboard/BlogTab.tsx` | Call `markSectionSeen('blog')` on mount; add reply UI; delete mock data |
| `src/components/dashboard/HomeTab.tsx` | Replace `getCommunicationCounts` with new queries; add blog posts notification card |
| `src/components/dashboard/ProfileTab.tsx` | Add Notification Preferences card |
| `src/components/admin/AdminProfileTab.tsx` | Add Notification Preferences card |

---

## UX Guidelines (UI/UX Pro Max)

- All toggle rows: minimum 44×44px touch target (shadcn `Switch` with full-row click area)
- Badge numbers: show max "9+" to avoid layout shift for large counts
- Bell panel popover: `max-h-80 overflow-y-auto` so it never overflows on small screens
- Reply compose box: auto-focus on open; `Escape` closes without submitting
- Plain-English labels throughout — no technical jargon in any user-facing string
- Toasts auto-dismiss in 3 seconds; no toast for real-time notification arrival (use the dot only)
- Empty state in bell panel: "You're all caught up!" — positive framing, not "No notifications"
