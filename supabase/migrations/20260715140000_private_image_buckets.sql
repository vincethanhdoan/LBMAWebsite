-- Differentiated read access, then flip both buckets private.
-- Avatars (profiles/<uid>/avatar): any authenticated user (they appear in shared
-- messages/announcements). Student photos (students/<id>/photo): owning family or
-- admin only. Announcement images: already authenticated-only SELECT — unchanged.

DROP POLICY IF EXISTS "authenticated read profile pictures" ON storage.objects;

CREATE POLICY "authenticated read avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-pictures' AND name LIKE 'profiles/%');

CREATE POLICY "family or admin read student photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND name LIKE 'students/%'
    AND (
      (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.families f ON s.family_id = f.family_id
        WHERE 'students/' || s.student_id::text || '/photo' = storage.objects.name
          AND f.owner_user_id = auth.uid()
      )
    )
  );

UPDATE storage.buckets SET public = false WHERE id IN ('profile-pictures','announcement-images');
