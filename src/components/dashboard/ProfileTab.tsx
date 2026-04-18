import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Skeleton } from '../ui/skeleton';
import { Plus, Edit2, User as UserIcon, Users, Home, Trash2, Star, Check, Loader2 } from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { createReview, updateProfile, updateReview, upsertUserNotificationPreferences } from '../../lib/supabase/mutations';
import { getUserNotificationPreferences } from '../../lib/supabase/queries';
import type { User, Review } from '../../lib/types';
import { toast } from 'sonner';

// Convert database types to UI types
type Guardian = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  relationship: string;
  isPrimaryContact: boolean;
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  beltLevel: string;
  status: 'active' | 'inactive';
  notes: string;
};

const beltLevels = [
  'White Belt',
  'Yellow Belt',
  'Orange Belt',
  'Purple Belt',
  'Blue Belt',
  'Green Belt',
  'Brown Belt',
  'Red Belt',
  'Black Belt'
];

export function ProfileTab({ user, onRefreshUser }: { user: NonNullable<User>; onRefreshUser: () => Promise<void> }) {
  const {
    family,
    guardians: dbGuardians,
    students: dbStudents,
    review: dbReview,
    loading: profileLoading,
    error: profileError,
    saveFamily,
    addGuardian,
    updateGuardian,
    removeGuardian,
    addStudent,
    updateStudent,
    removeStudent,
  } = useProfile(user);

  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingGuardian, setIsAddingGuardian] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  const defaultPrefs = {
    notify_messages: true,
    notify_announcements: true,
    notify_blog_posts: false,
    notify_comment_replies: true,
    notify_post_comments: true,
  };

  const [prefs, setPrefs] = useState(defaultPrefs);
  const [prefsLoading, setPrefsLoading] = useState(true);

  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    beltLevel: 'White Belt',
    status: 'active',
    notes: ''
  });

  const [newGuardian, setNewGuardian] = useState<Partial<Guardian>>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    relationship: '',
    isPrimaryContact: false
  });

  // Review state
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingFamilyData, setEditingFamilyData] = useState({
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  useEffect(() => {
    if (!dbReview) {
      setExistingReview(null);
      return;
    }
    setExistingReview(dbReview);
    setRating(dbReview.rating);
    setReviewText(dbReview.review);
  }, [dbReview]);

  useEffect(() => {
    if (family) {
      setEditingFamilyData({
        address: family.address || '',
        city: family.city || '',
        state: family.state || '',
        zip: family.zip || '',
      });
    }
  }, [family]);

  useEffect(() => {
    getUserNotificationPreferences()
      .then((data) => {
        if (data) {
          setPrefs({
            notify_messages: data.notify_messages,
            notify_announcements: data.notify_announcements,
            notify_blog_posts: data.notify_blog_posts,
            notify_comment_replies: data.notify_comment_replies,
            notify_post_comments: data.notify_post_comments,
          });
        }
      })
      .catch(console.error)
      .finally(() => setPrefsLoading(false));
  }, []);

  // Convert database types to UI types
  const guardians: Guardian[] = dbGuardians.map(g => ({
    id: g.guardian_id,
    firstName: g.first_name,
    lastName: g.last_name,
    email: g.email || '',
    phoneNumber: g.phone_number || '',
    relationship: g.relationship || '',
    isPrimaryContact: g.is_primary_contact,
  }));

  const students: Student[] = dbStudents.map(s => ({
    id: s.student_id,
    firstName: s.first_name,
    lastName: s.last_name,
    dateOfBirth: s.date_of_birth || '',
    beltLevel: s.belt_level || 'White Belt',
    status: s.status,
    notes: s.notes || '',
  }));

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileError || !family) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error loading profile: {profileError || 'Family not found'}</p>
      </div>
    );
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSaveFamily = async () => {
    if (!family) return;
    setSaving(true);
    try {
      await saveFamily({
        address: editingFamilyData.address || null,
        city: editingFamilyData.city || null,
        state: editingFamilyData.state || null,
        zip: editingFamilyData.zip || null,
      });
      toast.success('Family information saved!');
      setIsEditingFamily(false);
    } catch (error) {
      toast.error('Error saving family information: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStudent = async () => {
    setSaving(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          first_name: editingStudent.firstName,
          last_name: editingStudent.lastName,
          date_of_birth: editingStudent.dateOfBirth || null,
          belt_level: editingStudent.beltLevel || null,
          status: editingStudent.status,
          notes: editingStudent.notes || null,
        });
        setEditingStudent(null);
      } else {
        // Add new student
        if (newStudent.firstName && newStudent.lastName && newStudent.dateOfBirth) {
          await addStudent({
            first_name: newStudent.firstName,
            last_name: newStudent.lastName,
            date_of_birth: newStudent.dateOfBirth || null,
            belt_level: newStudent.beltLevel || null,
            status: (newStudent.status || 'active') as 'active' | 'inactive',
            notes: newStudent.notes || null,
          });
          setNewStudent({
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            beltLevel: 'White Belt',
            status: 'active',
            notes: ''
          });
          setIsAddingStudent(false);
        }
      }
      toast.success('Student saved!');
    } catch (error) {
      toast.error('Error saving student: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGuardian = async () => {
    setSaving(true);
    try {
      if (editingGuardian) {
        await updateGuardian(editingGuardian.id, {
          first_name: editingGuardian.firstName,
          last_name: editingGuardian.lastName,
          email: editingGuardian.email || null,
          phone_number: editingGuardian.phoneNumber || null,
          relationship: editingGuardian.relationship || null,
          is_primary_contact: editingGuardian.isPrimaryContact,
        });
        if (editingGuardian.isPrimaryContact) {
          await updateProfile(user.id, {
            display_name: `${editingGuardian.firstName} ${editingGuardian.lastName}`,
          });
          await onRefreshUser();
        }
        setEditingGuardian(null);
      } else {
        // Add new guardian
        if (newGuardian.firstName && newGuardian.lastName) {
          await addGuardian({
            first_name: newGuardian.firstName,
            last_name: newGuardian.lastName,
            email: newGuardian.email || null,
            phone_number: newGuardian.phoneNumber || null,
            relationship: newGuardian.relationship || null,
            is_primary_contact: newGuardian.isPrimaryContact || false,
          });
          setNewGuardian({
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            relationship: '',
            isPrimaryContact: false
          });
          setIsAddingGuardian(false);
        }
      }
      toast.success('Guardian saved!');
    } catch (error) {
      toast.error('Error saving guardian: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimaryGuardian = async (guardianId: string) => {
    setSaving(true);
    try {
      const updates = guardians
        .map(g => {
          const dbGuardian = dbGuardians.find(dbg => dbg.guardian_id === g.id);
          if (!dbGuardian) return null;
          return updateGuardian(dbGuardian.guardian_id, {
            is_primary_contact: g.id === guardianId,
          });
        })
        .filter((p): p is Promise<unknown> => p !== null);

      await Promise.all(updates);
      const newPrimary = guardians.find(g => g.id === guardianId);
      if (newPrimary) {
        await updateProfile(user.id, {
          display_name: `${newPrimary.firstName} ${newPrimary.lastName}`,
        });
        await onRefreshUser();
      }
      toast.success('Primary guardian updated!');
    } catch (error) {
      toast.error('Error updating primary guardian: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveGuardian = async (guardianId: string) => {
    if (guardians.length <= 1) {
      toast.error('Cannot remove the only guardian. Please add another first.');
      return;
    }

    const guardian = guardians.find(g => g.id === guardianId);
    if (guardian?.isPrimaryContact) {
      toast.error('Cannot remove the primary guardian. Please reassign primary first.');
      return;
    }

    setConfirmState({
      title: 'Remove guardian',
      description: 'Are you sure you want to remove this guardian?',
      onConfirm: async () => {
        setConfirmState(null);
        setSaving(true);
        try {
          await removeGuardian(guardianId);
          toast.success('Guardian removed.');
        } catch (error) {
          toast.error('Error removing guardian: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // Review handlers
  const handleSaveReview = async () => {
    if (!reviewText.trim()) {
      toast.error('Please write a review before submitting.');
      return;
    }

    if (!family) {
      toast.error('Family not found. Please refresh the page.');
      return;
    }

    setReviewLoading(true);
    try {
      if (existingReview) {
        // Update existing review
        const updated = await updateReview(existingReview.review_id, {
          rating,
          review: reviewText.trim(),
        });
        setExistingReview(updated);
      } else {
        // Create new review
        const newReview = await createReview({
          family_id: family.family_id,
          author_user_id: user.id,
          rating,
          review: reviewText.trim(),
        });
        setExistingReview(newReview);
      }
      setIsEditingReview(false);
      toast.success('Review submitted! It will appear on the public website.');
    } catch (error) {
      toast.error('Error saving review: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setReviewLoading(false);
    }
  };

  const handleEditReview = () => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review);
    }
    setIsEditingReview(true);
  };

  const handleCancelEditReview = () => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review);
    } else {
      setRating(5);
      setReviewText('');
    }
    setIsEditingReview(false);
  };

  async function handlePrefToggle(
    key: keyof typeof defaultPrefs,
    value: boolean
  ) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await upsertUserNotificationPreferences({ [key]: value });
      toast.success('Notification preferences saved');
    } catch {
      setPrefs(prefs); // rollback
      toast.error('Failed to save preferences');
    }
  }

  const formatReviewDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isAddingNewReview = !existingReview;
  const showReviewForm = isAddingNewReview || isEditingReview;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Family Profile</h2>
        <p className="text-muted-foreground mt-1">
          Manage your family and student information
        </p>
      </div>

      {/* Family Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              <CardTitle>Family Information</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditingFamily(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Primary Email</Label>
              <p>{family.primary_email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p>{guardians.find(g => g.isPrimaryContact)?.phoneNumber || guardians[0]?.phoneNumber || 'Not set'}</p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Address</Label>
            <p>{family.address || 'Not set'}</p>
            {(family.city || family.state || family.zip) && (
              <p>{[family.city, family.state, family.zip].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Family Dialog */}
      <Dialog open={isEditingFamily} onOpenChange={setIsEditingFamily}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Family Information</DialogTitle>
            <DialogDescription>
              Update your family's contact information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={editingFamilyData.address}
                onChange={(e) => setEditingFamilyData({ ...editingFamilyData, address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={editingFamilyData.city}
                  onChange={(e) => setEditingFamilyData({ ...editingFamilyData, city: e.target.value })}
                  placeholder="Los Banos"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={editingFamilyData.state}
                  onChange={(e) => setEditingFamilyData({ ...editingFamilyData, state: e.target.value })}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ZIP Code</Label>
              <Input
                value={editingFamilyData.zip}
                onChange={(e) => setEditingFamilyData({ ...editingFamilyData, zip: e.target.value })}
                placeholder="93635"
                maxLength={10}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditingFamily(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveFamily} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guardians */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <CardTitle>Guardians</CardTitle>
            </div>
            <Button size="sm" onClick={() => setIsAddingGuardian(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Guardian
            </Button>
          </div>
          <CardDescription className="mt-2">
            The primary guardian's name will be displayed on messages sent from this account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {guardians.map((guardian) => (
            <div key={guardian.id} className="flex items-start gap-4 p-4 border rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {guardian.firstName[0]}{guardian.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">
                    {guardian.firstName} {guardian.lastName}
                  </p>
                  {guardian.isPrimaryContact && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="w-3 h-3" />
                      Primary Contact
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{guardian.relationship}</p>
                <p className="text-sm">{guardian.email}</p>
                <p className="text-sm">{guardian.phoneNumber}</p>
              </div>
              <div className="flex flex-col gap-2">
                {!guardian.isPrimaryContact && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetPrimaryGuardian(guardian.id)}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Set as Primary
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingGuardian(guardian)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveGuardian(guardian.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              <CardTitle>Students</CardTitle>
            </div>
            <Button size="sm" onClick={() => setIsAddingStudent(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
            <Dialog open={isAddingStudent} onOpenChange={setIsAddingStudent}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Student</DialogTitle>
                  <DialogDescription>
                    Add a new student to your family profile
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={newStudent.firstName}
                        onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={newStudent.lastName}
                        onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={newStudent.dateOfBirth}
                      onChange={(e) => setNewStudent({ ...newStudent, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Belt Level</Label>
                    <Select
                      value={newStudent.beltLevel}
                      onValueChange={(value) => setNewStudent({ ...newStudent, beltLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {beltLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Any additional information (allergies, preferences, etc.)"
                      value={newStudent.notes}
                      onChange={(e) => setNewStudent({ ...newStudent, notes: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingStudent(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveStudent}
                    disabled={!newStudent.firstName || !newStudent.lastName || !newStudent.dateOfBirth}
                  >
                    Add Student
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {students.map((student) => (
            <div key={student.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {student.firstName[0]}{student.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">
                        {student.firstName} {student.lastName}
                      </h3>
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                        {student.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Age {calculateAge(student.dateOfBirth)} • Born {new Date(student.dateOfBirth).toLocaleDateString()}
                    </p>
                    <div className="mt-2">
                      <Badge className="bg-[#303030] text-background border-primary">
                        {student.beltLevel}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingStudent(student)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
              
              {student.notes && (
                <div className="mt-3 p-3 bg-secondary rounded-md">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1">{student.notes}</p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={editingStudent.firstName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={editingStudent.lastName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={editingStudent.dateOfBirth}
                  onChange={(e) => setEditingStudent({ ...editingStudent, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Belt Level</Label>
                <Select
                  value={editingStudent.beltLevel}
                  onValueChange={(value) => setEditingStudent({ ...editingStudent, beltLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {beltLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingStudent.status}
                  onValueChange={(value: 'active' | 'inactive') => 
                    setEditingStudent({ ...editingStudent, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Any additional information (allergies, preferences, etc.)"
                  value={editingStudent.notes}
                  onChange={(e) => setEditingStudent({ ...editingStudent, notes: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingStudent(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStudent}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Guardian Dialog */}
      <Dialog open={isAddingGuardian} onOpenChange={setIsAddingGuardian}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Guardian</DialogTitle>
            <DialogDescription>
              Add a new guardian to your family profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={newGuardian.firstName}
                  onChange={(e) => setNewGuardian({ ...newGuardian, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={newGuardian.lastName}
                  onChange={(e) => setNewGuardian({ ...newGuardian, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newGuardian.email}
                onChange={(e) => setNewGuardian({ ...newGuardian, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                value={newGuardian.phoneNumber}
                onChange={(e) => setNewGuardian({ ...newGuardian, phoneNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Input
                placeholder="e.g., Father, Mother, Guardian"
                value={newGuardian.relationship}
                onChange={(e) => setNewGuardian({ ...newGuardian, relationship: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddingGuardian(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveGuardian}
              disabled={!newGuardian.firstName || !newGuardian.lastName || !newGuardian.email || !newGuardian.phoneNumber}
            >
              Add Guardian
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Guardian Dialog */}
      <Dialog open={!!editingGuardian} onOpenChange={(open) => !open && setEditingGuardian(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Guardian</DialogTitle>
            <DialogDescription>
              Update guardian information
            </DialogDescription>
          </DialogHeader>
          {editingGuardian && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={editingGuardian.firstName}
                    onChange={(e) => setEditingGuardian({ ...editingGuardian, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={editingGuardian.lastName}
                    onChange={(e) => setEditingGuardian({ ...editingGuardian, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingGuardian.email}
                  onChange={(e) => setEditingGuardian({ ...editingGuardian, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={editingGuardian.phoneNumber}
                  onChange={(e) => setEditingGuardian({ ...editingGuardian, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input
                  value={editingGuardian.relationship}
                  onChange={(e) => setEditingGuardian({ ...editingGuardian, relationship: e.target.value })}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingGuardian(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGuardian}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Section */}
      {user.role === 'family' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                <CardTitle>Your Review</CardTitle>
              </div>
              {existingReview && !isEditingReview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditReview}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Review
                </Button>
              )}
            </div>
            <CardDescription>
              {isAddingNewReview 
                ? 'Share your family\'s experience at LBMAA with prospective families'
                : 'Published on the public website'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showReviewForm ? (
              <div className="space-y-6">
                {/* Rating Selector */}
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= (hoveredStar || rating)
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {rating} {rating === 1 ? 'star' : 'stars'}
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <div className="space-y-2">
                  <Label>Your Review</Label>
                  <Textarea
                    placeholder="Share your experience at LBMAA. What has your family's journey been like? How have the instructors and programs impacted your children?"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {reviewText.length} characters
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button onClick={handleSaveReview} disabled={!reviewText.trim()}>
                    <Check className="w-4 h-4 mr-2" />
                    {isAddingNewReview ? 'Submit Review' : 'Save Changes'}
                  </Button>
                  {isEditingReview && (
                    <Button variant="outline" onClick={handleCancelEditReview}>
                      Cancel
                    </Button>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Your review will be published using your name "{user.displayName}" 
                    and will appear publicly on the LBMAA website. Reviews help prospective families learn 
                    about our academy and the positive impact we have on students and their families.
                  </p>
                </div>
              </div>
            ) : existingReview ? (
              <div className="space-y-4">
                {/* Display Existing Review */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= existingReview.rating
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {existingReview.rating} out of 5 stars
                  </span>
                </div>

                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{existingReview.review}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Published by {user.displayName}</span>
                  <span>
                    {existingReview.updated_at
                      ? `Updated ${formatReviewDate(existingReview.updated_at)}`
                      : `Posted ${formatReviewDate(existingReview.created_at)}`
                    }
                  </span>
                </div>

                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    ✓ Your review is live on the public website and helping prospective families learn about LBMAA!
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  You haven't submitted a review yet
                </p>
                <Button onClick={() => setIsEditingReview(true)}>
                  <Star className="w-4 h-4 mr-2" />
                  Write a Review
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose when you'd like to receive emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {prefsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              {([
                { key: 'notify_messages' as const,        label: 'New Messages',           sub: 'Email me when I receive a message' },
                { key: 'notify_announcements' as const,   label: 'Academy Announcements',  sub: 'Email me when a new announcement is posted' },
                { key: 'notify_blog_posts' as const,      label: 'Blog Posts',             sub: 'Email me when a new blog post is published' },
                { key: 'notify_comment_replies' as const, label: 'Replies to My Comments', sub: 'Email me when someone replies to a comment I left' },
                { key: 'notify_post_comments' as const,   label: 'Comments on My Posts',   sub: 'Email me when someone comments on a blog post I wrote' },
              ] as const).map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between gap-4 py-1">
                  <Label htmlFor={key} className="flex flex-col gap-0.5 cursor-pointer flex-1">
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground font-normal">{sub}</span>
                  </Label>
                  <Switch
                    id={key}
                    checked={prefs[key]}
                    onCheckedChange={(checked) => handlePrefToggle(key, checked)}
                  />
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel="Remove"
        destructive
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}