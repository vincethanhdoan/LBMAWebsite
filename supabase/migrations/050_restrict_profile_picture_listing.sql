-- The "public read profile pictures" policy granted SELECT on storage.objects
-- to all roles, which let anonymous users enumerate every file in the bucket
-- via the storage list API. Object display does not need it: the bucket is
-- public, so downloads go through /object/public/ and bypass RLS entirely.
-- Restrict SELECT to authenticated users (kept for upsert/list flows in the
-- portal) so anonymous listing is closed.

DROP POLICY IF EXISTS "public read profile pictures" ON storage.objects;

CREATE POLICY "authenticated read profile pictures"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-pictures');
