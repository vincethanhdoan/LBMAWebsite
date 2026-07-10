-- Fix blog_comments → profiles relationship for PostgREST join support.
-- The original FK pointed to auth.users; repoint it to profiles.user_id
-- so that queries can join blog_comments with profiles via the named FK.

ALTER TABLE blog_comments
  DROP CONSTRAINT IF EXISTS blog_comments_author_user_id_fkey;

ALTER TABLE blog_comments
  ADD CONSTRAINT blog_comments_author_user_id_fkey
  FOREIGN KEY (author_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
