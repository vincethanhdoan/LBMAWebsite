-- Fix conversation_members → profiles relationship for PostgREST join support.
-- The original FK pointed to auth.users; repoint it to profiles.user_id
-- so that queries can join conversation_members with profiles via the named FK.

ALTER TABLE conversation_members
  DROP CONSTRAINT IF EXISTS conversation_members_user_id_fkey;

ALTER TABLE conversation_members
  ADD CONSTRAINT conversation_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
