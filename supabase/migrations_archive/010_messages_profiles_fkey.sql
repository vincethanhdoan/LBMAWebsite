-- Fix messages → profiles relationship for PostgREST join support.
-- The original FK pointed to auth.users; repoint it to profiles.user_id
-- so that queries can join messages with profiles via the named FK.

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_author_user_id_fkey;

ALTER TABLE messages
  ADD CONSTRAINT messages_author_user_id_fkey
  FOREIGN KEY (author_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
