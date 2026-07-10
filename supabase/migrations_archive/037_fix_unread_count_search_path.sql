-- supabase/migrations/037_fix_unread_count_search_path.sql
-- Add SET search_path = public to get_total_unread_count, consistent with
-- all other SECURITY DEFINER functions in this schema.

CREATE OR REPLACE FUNCTION get_total_unread_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT SUM(msg_count)::INTEGER
      FROM (
        SELECT (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = cm.conversation_id
            AND m.author_user_id <> auth.uid()
            AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
        )::INTEGER AS msg_count
        FROM conversation_members cm
        WHERE cm.user_id = auth.uid()
      ) sub
    ),
    0
  )::INTEGER;
$$;
