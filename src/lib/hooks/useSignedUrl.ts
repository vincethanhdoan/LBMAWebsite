import { useQuery } from '@tanstack/react-query';
import {
  getProfileSignedUrl,
  getAnnouncementSignedUrl,
} from '../supabase/storage';
import {
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
