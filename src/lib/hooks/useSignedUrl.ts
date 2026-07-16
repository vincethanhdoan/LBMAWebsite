import { useQuery } from '@tanstack/react-query';
import {
  getProfileSignedUrl,
  getProfileSignedUrls,
  getAnnouncementSignedUrl,
} from '../supabase/storage';
import {
  PROFILE_PICTURES_BUCKET,
  ANNOUNCEMENT_IMAGES_BUCKET,
  publicUrlToPath,
} from '../supabase/storagePaths';

const CACHE_MS = 50 * 60 * 1000; // refresh before the 60-min signed URL expires

function resolver(bucket: string) {
  return bucket === ANNOUNCEMENT_IMAGES_BUCKET
    ? getAnnouncementSignedUrl
    : getProfileSignedUrl;
}

/** Resolve a stored path (or legacy public URL) to a signed URL, cached by path. */
export function useSignedUrl(
  value: string | null,
  bucket: string,
): string | null {
  const path = publicUrlToPath(value, bucket);
  const { data } = useQuery({
    queryKey: ['signed-url', bucket, path],
    queryFn: () => resolver(bucket)(path as string),
    enabled: !!path,
    staleTime: CACHE_MS,
    gcTime: CACHE_MS,
  });
  return data ?? null;
}

/** Batch resolver for lists; returns a path -> signed URL map. */
export function useSignedUrls(
  values: (string | null)[],
  bucket: string,
): Record<string, string> {
  const paths = Array.from(
    new Set(
      values
        .map((v) => publicUrlToPath(v, bucket))
        .filter((p): p is string => !!p),
    ),
  ).sort();
  const { data } = useQuery({
    queryKey: ['signed-urls', bucket, paths],
    queryFn: () => getProfileSignedUrls(paths),
    enabled: paths.length > 0 && bucket === PROFILE_PICTURES_BUCKET,
    staleTime: CACHE_MS,
    gcTime: CACHE_MS,
  });
  return data ?? {};
}
