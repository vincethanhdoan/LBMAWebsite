-- supabase/migrations/036_admin_only_blog_posts.sql
-- Restrict blog post creation/edit/delete to admins.
-- Restrict announcement comment creation to admins.
-- Family users retain ability to edit/delete their own existing comments.

-- Blog posts
DROP POLICY IF EXISTS "Authenticated users can create blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Users can update their own blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Users can delete their own blog posts" ON public.blog_posts;

CREATE POLICY "Admins can create blog posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete blog posts"
  ON public.blog_posts FOR DELETE
  USING (is_admin(auth.uid()));

-- Announcement comments
DROP POLICY IF EXISTS "Authenticated users can create announcement comments" ON public.announcement_comments;

CREATE POLICY "Admins can create announcement comments"
  ON public.announcement_comments FOR INSERT
  WITH CHECK (is_admin(auth.uid()));
