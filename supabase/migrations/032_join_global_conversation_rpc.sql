CREATE OR REPLACE FUNCTION join_global_conversation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  SELECT conversation_id INTO v_conv_id
  FROM conversations
  WHERE type = 'global'
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES (v_conv_id, auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION join_global_conversation() TO authenticated;
