-- Returns the total count of unread messages across all conversations
-- for the currently authenticated user. Uses auth.uid() internally so
-- no user_id parameter is needed and no privilege escalation is possible.

CREATE OR REPLACE FUNCTION get_total_unread_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
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

GRANT EXECUTE ON FUNCTION get_total_unread_count TO authenticated;
