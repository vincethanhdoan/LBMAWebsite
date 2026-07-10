-- supabase/migrations/039_profile_pictures_mime_validation.sql
-- Add MIME type checks to profile-pictures storage INSERT and UPDATE policies.
-- Rejects any upload whose reported content-type is not a raster image format.

-- Account avatar
DROP POLICY IF EXISTS "families upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "families update own avatar" ON storage.objects;

CREATE POLICY "families upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND name = 'profiles/' || auth.uid()::text || '/avatar'
  AND (metadata->>'mimetype') IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif')
);

CREATE POLICY "families update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND name = 'profiles/' || auth.uid()::text || '/avatar'
)
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND name = 'profiles/' || auth.uid()::text || '/avatar'
  AND (metadata->>'mimetype') IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif')
);

-- Student photos
DROP POLICY IF EXISTS "families upload student photo" ON storage.objects;
DROP POLICY IF EXISTS "families update student photo" ON storage.objects;

CREATE POLICY "families upload student photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (metadata->>'mimetype') IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif')
  AND EXISTS (
    SELECT 1 FROM students s
    JOIN families f ON s.family_id = f.family_id
    WHERE 'students/' || s.student_id::text || '/photo' = name
      AND f.owner_user_id = auth.uid()
  )
);

CREATE POLICY "families update student photo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND EXISTS (
    SELECT 1 FROM students s
    JOIN families f ON s.family_id = f.family_id
    WHERE 'students/' || s.student_id::text || '/photo' = name
      AND f.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (metadata->>'mimetype') IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif')
  AND EXISTS (
    SELECT 1 FROM students s
    JOIN families f ON s.family_id = f.family_id
    WHERE 'students/' || s.student_id::text || '/photo' = name
      AND f.owner_user_id = auth.uid()
  )
);
