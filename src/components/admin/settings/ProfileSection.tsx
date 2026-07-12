import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Edit2, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  updateProfile,
  updateProfileAvatar,
} from '../../../lib/supabase/mutations';
import { PhotoUploader } from '../../dashboard/PhotoUploader';
import {
  uploadProfileImage,
  deleteProfileImage,
} from '../../../lib/supabase/storage';
import type { User as UserType } from '../../../lib/types';

type ProfileSectionProps = {
  user: NonNullable<UserType>;
  onRefreshUser: () => Promise<void>;
};

export function ProfileSection({ user, onRefreshUser }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateProfile(user.id, { display_name: displayName });
      await onRefreshUser();
      setIsEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Failed to save. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <CardTitle>Profile Photo</CardTitle>
          </div>
          <CardDescription>
            This photo appears on your account and in messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoUploader
            currentUrl={user.avatarUrl}
            fallback={user.displayName?.[0] ?? '?'}
            onUpload={async (file) => {
              const path = `profiles/${user.id}/avatar`;
              const url = await uploadProfileImage(path, file);
              try {
                await updateProfileAvatar(user.id, url);
              } catch (err) {
                await deleteProfileImage(path).catch(() => {});
                throw err;
              }
              await onRefreshUser();
              toast.success('Profile photo updated');
            }}
            onRemove={async () => {
              const path = `profiles/${user.id}/avatar`;
              await deleteProfileImage(path);
              await updateProfileAvatar(user.id, null);
              await onRefreshUser();
              toast.success('Profile photo removed');
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
          <CardDescription>Your admin account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <Input
                  value={user.email}
                  disabled
                  className="disabled:opacity-50 cursor-not-allowed"
                />
              </div>
              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setSaveError(null);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-muted-foreground">Display Name</Label>
                <p>{displayName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p>{user.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Role</Label>
                <p className="capitalize">{user.role}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
