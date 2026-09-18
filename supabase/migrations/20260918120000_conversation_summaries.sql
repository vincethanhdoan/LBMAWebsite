-- One row per conversation the caller belongs to, carrying everything the
-- conversation list needs: the other DM participant, a preview of the latest
-- message, and the caller's unread count. Replaces a client-side loop that
-- fetched every conversation's members and full message history one at a time.
--
-- SECURITY INVOKER on purpose: the existing RLS policies on conversations,
-- conversation_members, messages and profiles decide what the caller can see,
-- exactly as they did for the direct table reads this replaces.
CREATE OR REPLACE FUNCTION public.get_conversation_summaries()
RETURNS TABLE (
  conversation_id uuid,
  type text,
  hidden boolean,
  other_user_id uuid,
  other_display_name text,
  other_role text,
  other_avatar_url text,
  last_message_preview text,
  last_message_at timestamptz,
  unread_count integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT
    c.conversation_id,
    c.type,
    c.hidden,
    other.user_id,
    other.display_name,
    other.role,
    other.avatar_url,
    left(latest.body, 50),
    latest.created_at,
    (
      SELECT COUNT(*)::integer
      FROM messages m
      WHERE m.conversation_id = c.conversation_id
        AND m.author_user_id <> auth.uid()
        AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
    )
  FROM conversation_members cm
  JOIN conversations c ON c.conversation_id = cm.conversation_id
  LEFT JOIN LATERAL (
    SELECT om.user_id, p.display_name, p.role, p.avatar_url
    FROM conversation_members om
    LEFT JOIN profiles p ON p.user_id = om.user_id
    WHERE om.conversation_id = c.conversation_id
      AND om.user_id <> auth.uid()
      AND c.type = 'dm'
    LIMIT 1
  ) other ON true
  LEFT JOIN LATERAL (
    SELECT m.body, m.created_at
    FROM messages m
    WHERE m.conversation_id = c.conversation_id
    ORDER BY m.created_at DESC NULLS LAST
    LIMIT 1
  ) latest ON true
  WHERE cm.user_id = auth.uid()
  ORDER BY c.updated_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_conversation_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversation_summaries() TO authenticated;
