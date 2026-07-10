-- Add explicit WITH CHECK to the blog_posts update policy for consistency.
DROP POLICY IF EXISTS "Admins can update blog posts" ON public.blog_posts;

CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
