-- Auto-update conversations.updated_at when a message is inserted.
-- Replaces the two-step client-side update in createMessage().

CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE conversation_id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_insert_update_conversation ON messages;
CREATE TRIGGER trg_message_insert_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();
