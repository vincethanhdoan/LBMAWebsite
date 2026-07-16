import { ImageWithFallback } from './figma/ImageWithFallback';
import { useSignedUrl } from '../lib/hooks/useSignedUrl';

type Props = {
  path: string | null;
  bucket: string;
  alt?: string;
  className?: string;
};

export function SignedImage({ path, bucket, alt, className }: Props) {
  const src = useSignedUrl(path, bucket);
  if (!src) return null;
  return <ImageWithFallback src={src} alt={alt ?? ''} className={className} />;
}
