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
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
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
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
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
    UNION
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
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
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
        UNION
        SELECT user_id, notify_comment_replies FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_parent_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        IF v_email IS NOT NULL THEN
          INSERT INTO portal_email_queue (recipient_email, type, payload, status)
          VALUES (v_email, 'comment_reply', jsonb_build_object(
            'replier_name',    COALESCE(v_actor_name, 'Someone'),
            'original_snippet', v_parent_snippet,
            'tab',             'announcements'
          ), 'queued');
        END IF;
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
        UNION
        SELECT user_id, notify_post_comments FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_post_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        IF v_email IS NOT NULL THEN
          INSERT INTO portal_email_queue (recipient_email, type, payload, status)
          VALUES (v_email, 'post_comment', jsonb_build_object(
            'commenter_name', COALESCE(v_actor_name, 'Someone'),
            'post_title',     COALESCE(v_announcement_title, 'an announcement'),
            'tab',            'announcements'
          ), 'queued');
        END IF;
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
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
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
        UNION
        SELECT user_id, notify_comment_replies FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_parent_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        IF v_email IS NOT NULL THEN
          INSERT INTO portal_email_queue (recipient_email, type, payload, status)
          VALUES (v_email, 'comment_reply', jsonb_build_object(
            'replier_name',     COALESCE(v_actor_name, 'Someone'),
            'original_snippet', v_parent_snippet,
            'tab',              'blog'
          ), 'queued');
        END IF;
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
        UNION
        SELECT user_id, notify_post_comments FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_post_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        IF v_email IS NOT NULL THEN
          INSERT INTO portal_email_queue (recipient_email, type, payload, status)
          VALUES (v_email, 'post_comment', jsonb_build_object(
            'commenter_name', COALESCE(v_actor_name, 'Someone'),
            'post_title',     COALESCE(v_post_title, 'a blog post'),
            'tab',            'blog'
          ), 'queued');
        END IF;
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
-- Remove existing job if present to allow idempotent re-runs
DO $$ BEGIN
  PERFORM cron.unschedule('appointment-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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
