-- Persistent read-state model for messaging

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

-- Backfill existing memberships so old messages are treated as read.
UPDATE public.conversation_members
SET last_read_at = NOW()
WHERE last_read_at IS NULL;

ALTER TABLE public.conversation_members
  ALTER COLUMN last_read_at SET DEFAULT NOW();

-- Redundant with PK(conversation_id, user_id): keep index set lean.
DROP INDEX IF EXISTS public.idx_conversation_members_last_read_at;

DROP POLICY IF EXISTS "Users can update their own conversation read state" ON public.conversation_members;
CREATE POLICY "Users can update their own conversation read state"
  ON public.conversation_members FOR UPDATE
  USING (
    user_id = auth.uid()
    AND is_conversation_member(conversation_id, auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_conversation_member(conversation_id, auth.uid())
  );
