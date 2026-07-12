import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { Slider } from './slider';

type AvatarCropperDialogProps = {
  file: File | null;
  onConfirm: (croppedFile: File) => Promise<void>;
  onCancel: () => void;
};

async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    400,
    400,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create image'));
          return;
        }
        resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });
}

export function AvatarCropperDialog({
  file,
  onConfirm,
  onCancel,
}: AvatarCropperDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setSaving(true);
    try {
      const croppedFile = await getCroppedImage(imageSrc, croppedAreaPixels);
      await onConfirm(croppedFile);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!file}
      onOpenChange={(open) => {
        if (!open && !saving) onCancel();
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Adjust photo</DialogTitle>
          <DialogDescription className="sr-only">
            Drag to reposition and use the slider to zoom in before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-6 aspect-square overflow-hidden rounded-xl bg-zinc-900">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={3}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              style={{
                containerStyle: { background: '#18181b' },
                cropAreaStyle: {
                  border: '2px solid rgba(255,255,255,0.75)',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
                },
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-6 pt-5 pb-1">
          <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <DialogFooter className="px-6 py-4">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save photo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
