-- Allow authenticated users to discover admin recipients for direct messaging.
-- This keeps profile exposure narrow (admin records only).

DROP POLICY IF EXISTS "Authenticated users can view admin profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view admin profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND role = 'admin'
  );
