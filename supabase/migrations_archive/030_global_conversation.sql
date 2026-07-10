-- Add hidden flag to conversations so admins can disable the group chat
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Create the global conversation using the first admin's user_id if it doesn't exist
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT user_id INTO v_admin_id
  FROM profiles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1;

  IF v_admin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM conversations WHERE type = 'global') THEN
    INSERT INTO conversations (type, created_by, hidden)
    VALUES ('global', v_admin_id, false);
  END IF;
END $$;

-- Allow admins to update the hidden flag on conversations
CREATE POLICY "Admins can update conversations"
  ON conversations FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
