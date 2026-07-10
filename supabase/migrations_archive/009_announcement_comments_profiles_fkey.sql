-- Fix announcement_comments → profiles relationship for PostgREST join support.
-- The original FK pointed to auth.users; repoint it to profiles.user_id
-- so that queries can join announcement_comments with profiles via the named FK.

ALTER TABLE announcement_comments
  DROP CONSTRAINT IF EXISTS announcement_comments_author_user_id_fkey;

ALTER TABLE announcement_comments
  ADD CONSTRAINT announcement_comments_author_user_id_fkey
  FOREIGN KEY (author_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
