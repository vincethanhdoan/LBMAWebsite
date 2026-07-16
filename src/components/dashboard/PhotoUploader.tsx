import { useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { SignedAvatarImage } from '../SignedAvatarImage';
import { Button } from '../ui/button';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { AvatarCropperDialog } from '../ui/avatar-cropper-dialog';
import { toast } from 'sonner';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PROFILE_IMAGE_SIZE_MB,
} from '../../lib/supabase/storage';

type PhotoUploaderProps = {
  path: string | null;
  fallback: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  disabled?: boolean;
};

const sizeClasses: Record<NonNullable<PhotoUploaderProps['size']>, string> = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
};

export function PhotoUploader({
  path,
  fallback,
  onUpload,
  onRemove,
  size = 'lg',
  layout = 'horizontal',
  disabled,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, WebP, or GIF image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(
        `Image must be smaller than ${MAX_PROFILE_IMAGE_SIZE_MB} MB.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveConfirmed = async () => {
    setConfirmRemove(false);
    setRemoving(true);
    try {
      await onRemove();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove photo.',
      );
    } finally {
      setRemoving(false);
    }
  };

  const busy = removing;

  const isVertical = layout === 'vertical';

  return (
    <div
      className={
        isVertical
          ? 'flex flex-col items-center gap-2 w-full'
          : 'flex items-center gap-4'
      }
    >
      <div className="relative group">
        <Avatar key={path ?? 'no-image'} className={sizeClasses[size]}>
          <SignedAvatarImage path={path} alt="Profile photo" />
          <AvatarFallback className="text-lg bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
            {fallback}
          </AvatarFallback>
        </Avatar>
        {!disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
            aria-label="Change photo"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={handleFileChange}
        disabled={disabled}
      />

      <div
        className={
          isVertical ? 'flex flex-col gap-1 w-full' : 'flex flex-col gap-1'
        }
      >
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className={isVertical ? 'w-full text-xs' : ''}
          >
            Upload Photo
          </Button>
        )}
        {path && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmRemove(true)}
            disabled={busy}
            className={
              isVertical
                ? 'w-full text-xs text-destructive hover:text-destructive'
                : 'text-destructive hover:text-destructive'
            }
          >
            {removing ? (
              <>
                <Loader2
                  className={
                    isVertical
                      ? 'w-3 h-3 animate-spin'
                      : 'w-4 h-4 mr-2 animate-spin'
                  }
                />
                Removing...
              </>
            ) : (
              <>
                {!isVertical && <Trash2 className="w-4 h-4 mr-2" />}
                Remove Photo
              </>
            )}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove photo"
        description="Remove your photo? You'll revert to the initials avatar."
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveConfirmed}
        onCancel={() => setConfirmRemove(false)}
      />

      <AvatarCropperDialog
        file={pendingCropFile}
        onConfirm={async (croppedFile) => {
          await onUpload(croppedFile);
          setPendingCropFile(null);
        }}
        onCancel={() => setPendingCropFile(null)}
      />
    </div>
  );
}
