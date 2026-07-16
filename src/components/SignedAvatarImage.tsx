import { AvatarImage } from './ui/avatar';
import { useSignedUrl } from '../lib/hooks/useSignedUrl';
import { PROFILE_PICTURES_BUCKET } from '../lib/supabase/storagePaths';

type Props = { path: string | null; alt?: string; className?: string };

// Resolves a stored profile-pictures path to a signed URL, then renders the
// shadcn AvatarImage. Renders nothing (falling back to AvatarFallback) until
// resolved or when there is no path.
export function SignedAvatarImage({ path, alt, className }: Props) {
  const src = useSignedUrl(path, PROFILE_PICTURES_BUCKET);
  if (!src) return null;
  return <AvatarImage src={src} alt={alt} className={className} />;
}
