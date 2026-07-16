-- Normalize any stored full public URLs to bare object paths (idempotent:
-- rows already holding a path have no '/object/public/<bucket>/' marker and
-- are left unchanged; strips any ?cache-buster).
UPDATE public.profiles
SET avatar_url = regexp_replace(split_part(avatar_url, '?', 1),
  '^.*/object/public/profile-pictures/', '')
WHERE avatar_url LIKE '%/object/public/profile-pictures/%';

UPDATE public.students
SET photo_url = regexp_replace(split_part(photo_url, '?', 1),
  '^.*/object/public/profile-pictures/', '')
WHERE photo_url LIKE '%/object/public/profile-pictures/%';

UPDATE public.announcements
SET image_url = regexp_replace(split_part(image_url, '?', 1),
  '^.*/object/public/announcement-images/', '')
WHERE image_url LIKE '%/object/public/announcement-images/%';
