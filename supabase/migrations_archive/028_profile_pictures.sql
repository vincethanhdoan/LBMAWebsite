-- supabase/migrations/028_profile_pictures.sql

-- 1. Add avatar columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE students  ADD COLUMN IF NOT EXISTS photo_url  TEXT;

-- 2. Create public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS — public read (required for JS client queries/listings)
DROP POLICY IF EXISTS "public read profile pictures" ON storage.objects;

CREATE POLICY "public read profile pictures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-pictures');

-- 4. Storage RLS — account avatar (family uploads their own)
DROP POLICY IF EXISTS "families upload own avatar"   ON storage.objects;
DROP POLICY IF EXISTS "families update own avatar"   ON storage.objects;
DROP POLICY IF EXISTS "families delete own avatar"   ON storage.objects;

CREATE POLICY "families upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND name = 'profiles/' || auth.uid()::text || '/avatar'
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
);

CREATE POLICY "families delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND name = 'profiles/' || auth.uid()::text || '/avatar'
);

-- 5. Storage RLS — student photos (family uploads for their own students)
DROP POLICY IF EXISTS "families upload student photo"  ON storage.objects;
DROP POLICY IF EXISTS "families update student photo"  ON storage.objects;
DROP POLICY IF EXISTS "families delete student photo"  ON storage.objects;

CREATE POLICY "families upload student photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
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
  AND EXISTS (
    SELECT 1 FROM students s
    JOIN families f ON s.family_id = f.family_id
    WHERE 'students/' || s.student_id::text || '/photo' = name
      AND f.owner_user_id = auth.uid()
  )
);

CREATE POLICY "families delete student photo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND EXISTS (
    SELECT 1 FROM students s
    JOIN families f ON s.family_id = f.family_id
    WHERE 'students/' || s.student_id::text || '/photo' = name
      AND f.owner_user_id = auth.uid()
  )
);
