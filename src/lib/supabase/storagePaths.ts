export const PROFILE_PICTURES_BUCKET = 'profile-pictures';
export const ANNOUNCEMENT_IMAGES_BUCKET = 'announcement-images';

/**
 * Normalize a stored image value to a bare object path. Accepts a full public
 * URL (legacy) or an already-bare path; strips the `.../object/public/<bucket>/`
 * prefix and any query string. Returns null for null/empty input.
 */
export function publicUrlToPath(
  value: string | null,
  bucket: string,
): string | null {
  if (!value) return null;
  const marker = `/object/public/${bucket}/`;
  const idx = value.indexOf(marker);
  const withoutPrefix = idx >= 0 ? value.slice(idx + marker.length) : value;
  const q = withoutPrefix.indexOf('?');
  return q >= 0 ? withoutPrefix.slice(0, q) : withoutPrefix;
}
