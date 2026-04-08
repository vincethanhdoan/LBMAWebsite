import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Label } from '../ui/label';
import { Plus, Edit2, Trash2, Upload, Pin, PinOff, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner';
import { getAnnouncements } from '../../lib/supabase/queries';
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../lib/supabase/mutations';
import { subscribeToAnnouncements, unsubscribe } from '../../lib/supabase/realtime';
import { supabase } from '../../lib/supabase/client';

type User = {
  id: string;
  email: string;
  role: 'admin' | 'family';
  displayName: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  imageUrl?: string;
  isPinned?: boolean;
};

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Belt Testing Scheduled for March 15th',
    body: 'We are excited to announce that our next belt testing will take place on Saturday, March 15th at 10:00 AM. Students who have been recommended by their instructors will receive a formal invitation via email. Please ensure your child is prepared and arrives 15 minutes early. Good luck to all testing students!',
    authorName: 'Master Reyes',
    createdAt: '2026-02-01T10:00:00Z'
  },
  {
    id: '2',
    title: 'Facility Closed for Maintenance - Feb 10th',
    body: 'Our facility will be closed on Monday, February 10th for scheduled maintenance and deep cleaning. All classes are cancelled for that day. Regular schedule resumes Tuesday, February 11th. Thank you for your understanding!',
    authorName: 'Admin Team',
    createdAt: '2026-01-28T09:00:00Z'
  }
];

export function AdminAnnouncementsTab({ user }: { user: User }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await getAnnouncements();
      const formatted: Announcement[] = data.map((a: any) => ({
        id: a.announcement_id,
        title: a.title,
        body: a.body,
        authorName: a.profiles?.display_name || 'Unknown',
        createdAt: a.created_at,
        imageUrl: a.image_url || undefined,
        isPinned: a.is_pinned || false,
      }));
      setAnnouncements(formatted);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast.error('Error loading announcements: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();

    const channel = subscribeToAnnouncements((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        loadAnnouncements();
      }
    });

    return () => unsubscribe(channel);
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newBody.trim() || !user) return;
    setSaving(true);
    try {
      await createAnnouncement({
        author_user_id: user.id,
        title: newTitle.trim(),
        body: newBody.trim(),
        is_pinned: false,
        image_url: selectedImage || null,
      });
      resetForm();
      setIsCreateDialogOpen(false);
      await loadAnnouncements();
      toast.success('Announcement created!');
    } catch (error) {
      toast.error('Error creating announcement: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement || !newTitle.trim() || !newBody.trim()) return;
    setSaving(true);
    try {
      await updateAnnouncement(editingAnnouncement.id, {
        title: newTitle.trim(),
        body: newBody.trim(),
        is_pinned: editingAnnouncement.isPinned,
        image_url: selectedImage || null,
      });
      resetForm();
      setEditingAnnouncement(null);
      await loadAnnouncements();
      toast.success('Announcement updated!');
    } catch (error) {
      toast.error('Error updating announcement: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: 'Delete announcement',
      description: 'Are you sure you want to delete this announcement?',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deleteAnnouncement(id);
          await loadAnnouncements();
          toast.success('Announcement deleted!');
        } catch (error) {
          toast.error('Error deleting announcement: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      },
    });
  };

  const handleTogglePin = async (id: string) => {
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return;
    try {
      await updateAnnouncement(id, {
        is_pinned: !announcement.isPinned,
      });
      await loadAnnouncements();
    } catch (error) {
      toast.error('Error updating pin status: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Sort announcements: pinned first, then by date
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const resetForm = () => {
    setNewTitle('');
    setNewBody('');
    setSelectedImage('');
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setNewTitle(announcement.title);
    setNewBody(announcement.body);
    setSelectedImage(announcement.imageUrl ?? '');
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, GIF, and WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('announcement-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('announcement-images')
        .getPublicUrl(path);
      setSelectedImage(urlData.publicUrl);
    } catch (err) {
      toast.error('Image upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploadingImage(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const ImageUploadField = () => (
    <div className="space-y-2">
      <Label>Image (Optional)</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />
      {selectedImage ? (
        <div className="space-y-2">
          <img src={selectedImage} alt="Preview" className="w-full max-h-48 object-cover rounded-md border" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedImage('')}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <X className="w-3 h-3" /> Remove image
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleImageUpload}
          disabled={uploadingImage}
          className="w-full"
        >
          {uploadingImage ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" />Upload Image</>
          )}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Manage Announcements</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage official school announcements
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Share important updates with all families
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Announcement title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  placeholder="Write your announcement..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
              <ImageUploadField />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newBody.trim() || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Announcement'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAnnouncement} onOpenChange={(open) => !open && setEditingAnnouncement(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>
              Update announcement details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Announcement title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write your announcement..."
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Image (Optional)</Label>
              <Button 
                variant="outline" 
                onClick={handleImageUpload}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingAnnouncement(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={!newTitle.trim() || !newBody.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcements List */}
      <div className="space-y-4">
        {sortedAnnouncements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader className={announcement.isPinned ? 'bg-secondary/50 border-l-4 border-l-primary' : ''}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{announcement.authorName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{announcement.authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(announcement.createdAt)}
                      </p>
                    </div>
                    {announcement.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        <Pin className="w-3 h-3" />
                        Pinned
                      </span>
                    )}
                  </div>
                  <CardTitle>{announcement.title}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePin(announcement.id)}
                    title={announcement.isPinned ? 'Unpin announcement' : 'Pin announcement'}
                  >
                    {announcement.isPinned ? (
                      <PinOff className="w-4 h-4" />
                    ) : (
                      <Pin className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(announcement)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(announcement.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcement.imageUrl && (
                <img
                  src={announcement.imageUrl}
                  alt=""
                  className="w-full max-h-64 object-cover rounded-md"
                />
              )}
              <p className="text-foreground whitespace-pre-line">{announcement.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
