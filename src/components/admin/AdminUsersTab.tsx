import { useState, useMemo } from 'react';
import { useUsers } from '../../lib/hooks/users';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { SignedAvatarImage } from '../SignedAvatarImage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Search,
  Eye,
  UserPlus,
  Mail,
  Edit2,
  Loader2,
  UserX,
  UserCheck,
  Archive,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase/client';
import { formatShortDate } from '../../lib/format';
import type { User, Relationship, BeltLevel } from '../../lib/types';
import {
  FamilyStatus,
  GuardianRow,
  StudentRow,
  StudentStatus,
  useAdminFamilies,
} from '../../hooks/useAdminFamilies';

const beltLevels = [
  'White Belt',
  'Yellow Belt',
  'Orange Belt',
  'Purple Belt',
  'Blue Belt',
  'Green Belt',
  'Brown Belt',
  'Red Belt',
  'Black Belt',
];

const FAMILY_VIEWS: { id: FamilyStatus; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'archived', label: 'Archived' },
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AdminUsersTab({ user: _user }: { user: NonNullable<User> }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [familyView, setFamilyView] = useState<FamilyStatus>('active');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [editingStudent, setEditingStudent] = useState<{
    studentId: string;
    newBeltLevel: string;
    newStatus: StudentStatus;
  } | null>(null);
  const [editingGuardian, setEditingGuardian] = useState<GuardianRow | null>(
    null,
  );
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const { data: usersData = [] } = useUsers();
  const profileAvatarMap = useMemo(
    () => new Map(usersData.map((p) => [p.user_id, p.avatar_url ?? null])),
    [usersData],
  );
  const {
    families,
    filteredFamilies,
    filteredStudents,
    selectedFamily,
    setSelectedFamily,
    loading,
    saving,
    loadFamilyDetails,
    updateFamilyStatus,
    saveStudent,
    saveGuardian,
    setPrimaryGuardian,
  } = useAdminFamilies(searchTerm);

  const familyStatusCounts = useMemo(() => {
    const counts: Record<FamilyStatus, number> = {
      active: 0,
      inactive: 0,
      archived: 0,
    };
    for (const family of families) counts[family.status] += 1;
    return counts;
  }, [families]);

  const visibleFamilies = useMemo(
    () => filteredFamilies.filter((family) => family.status === familyView),
    [filteredFamilies, familyView],
  );

  const handleViewDetails = async (familyId: string) => {
    try {
      await loadFamilyDetails(familyId);
      setEditingGuardian(null);
    } catch (error) {
      toast.error(
        'Error loading family details: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('invite-family', {
        body: { email: normalizedEmail },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (res.error) {
        let detail: string = res.error.message;
        try {
          const body = await (res.error as any).context?.json?.();
          if (body?.error) detail = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      toast.success(`Invitation sent to ${normalizedEmail}.`);
      setInviteEmail('');
      setIsInviteDialogOpen(false);
    } catch (error) {
      toast.error(
        'Error sending invitation: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  const handleFamilyStatus = async (familyId: string, status: FamilyStatus) => {
    try {
      await updateFamilyStatus(familyId, status);
      toast.success(
        status === 'active' ? 'Family reactivated.' : `Family ${status}.`,
      );
    } catch (error) {
      toast.error(
        'Error updating family status: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  const handleEditStudent = (student: StudentRow) => {
    setEditingStudent({
      studentId: student.studentId,
      newBeltLevel: student.beltLevel,
      newStatus: student.status,
    });
  };

  const handleSaveStudent = async () => {
    if (!editingStudent) return;
    try {
      await saveStudent(editingStudent.studentId, {
        belt_level: editingStudent.newBeltLevel as BeltLevel,
        status: editingStudent.newStatus,
      });
      setEditingStudent(null);
      toast.success('Student updated.');
    } catch (error) {
      toast.error(
        'Error updating student: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  const handleArchiveStudent = (student: StudentRow) => {
    setConfirmState({
      title: 'Archive student',
      description: `Archive ${student.studentName}? This keeps history but removes active access.`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const archiveNote = `[Archived by admin ${new Date().toISOString()}]`;
          const nextNotes = student.notes
            ? `${student.notes}\n${archiveNote}`
            : archiveNote;
          await saveStudent(student.studentId, {
            status: 'inactive',
            notes: nextNotes,
          });
          toast.success('Student archived.');
        } catch (error) {
          toast.error(
            'Error archiving student: ' +
              (error instanceof Error ? error.message : 'Unknown error'),
          );
        }
      },
    });
  };

  const handleSaveGuardian = async () => {
    if (!editingGuardian) return;
    try {
      await saveGuardian(editingGuardian.guardianId, {
        first_name: editingGuardian.firstName,
        last_name: editingGuardian.lastName,
        email: editingGuardian.email || null,
        phone_number: editingGuardian.phone || null,
        relationship: (editingGuardian.relationship ||
          null) as Relationship | null,
      });
      setEditingGuardian(null);
      toast.success('Guardian updated.');
    } catch (error) {
      toast.error(
        'Error updating guardian: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  const handleSetPrimaryGuardian = async (guardianId: string) => {
    try {
      await setPrimaryGuardian(guardianId);
      toast.success('Primary guardian updated.');
    } catch (error) {
      toast.error(
        'Error setting primary guardian: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Family Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage families, guardians, and students with safe account lifecycle
            actions.
          </p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Family
        </Button>
      </div>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite New Family</DialogTitle>
            <DialogDescription>
              Send a magic-link invitation to an approved family email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="family@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={!inviteEmail.trim()}>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search families, guardians, or students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="families">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="families">
            Families ({visibleFamilies.length})
          </TabsTrigger>
          <TabsTrigger value="students">
            Students ({filteredStudents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="families">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>Families</CardTitle>
                <div className="flex gap-1.5">
                  {FAMILY_VIEWS.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => setFamilyView(view.id)}
                      className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                        familyView === view.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {view.label} ({familyStatusCounts[view.id]})
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Loading families...
                      </TableCell>
                    </TableRow>
                  ) : visibleFamilies.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-muted-foreground"
                      >{`No ${familyView} families found.`}</TableCell>
                    </TableRow>
                  ) : (
                    visibleFamilies.map((family) => {
                      const familyAvatarUrl = profileAvatarMap.get(
                        family.ownerUserId,
                      );
                      return (
                        <TableRow key={family.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <SignedAvatarImage
                                  path={familyAvatarUrl ?? null}
                                  alt={family.primaryContact}
                                />
                                <AvatarFallback>
                                  {family.primaryContact
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {family.primaryContact}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{family.primaryEmail}</TableCell>
                          <TableCell>{family.phoneNumber ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {family.studentCount}{' '}
                              {family.studentCount === 1
                                ? 'student'
                                : 'students'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                family.status === 'active'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {family.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatShortDate(family.joinedDate)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(family.id)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                              {family.status === 'active' ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={saving}
                                  onClick={() =>
                                    setConfirmState({
                                      title: 'Deactivate family',
                                      description: `Deactivate ${family.primaryContact}? They will lose portal access. History is preserved.`,
                                      onConfirm: () => {
                                        setConfirmState(null);
                                        void handleFamilyStatus(
                                          family.id,
                                          'inactive',
                                        );
                                      },
                                    })
                                  }
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={saving}
                                  onClick={() =>
                                    void handleFamilyStatus(family.id, 'active')
                                  }
                                >
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Reactivate
                                </Button>
                              )}
                              {family.status !== 'archived' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={saving}
                                  onClick={() =>
                                    setConfirmState({
                                      title: 'Archive family',
                                      description: `Archive ${family.primaryContact}? This keeps all history but removes access permanently.`,
                                      onConfirm: () => {
                                        setConfirmState(null);
                                        void handleFamilyStatus(
                                          family.id,
                                          'archived',
                                        );
                                      },
                                    })
                                  }
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Belt Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Family</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No students found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.studentId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {student.photoUrl && (
                                <AvatarImage
                                  src={student.photoUrl}
                                  alt={student.studentName}
                                />
                              )}
                              <AvatarFallback>
                                {student.studentName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {student.studentName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{student.age}</TableCell>
                        <TableCell>
                          {editingStudent?.studentId === student.studentId ? (
                            <Select
                              value={editingStudent.newBeltLevel}
                              onValueChange={(value) =>
                                setEditingStudent((prev) =>
                                  prev
                                    ? { ...prev, newBeltLevel: value }
                                    : prev,
                                )
                              }
                            >
                              <SelectTrigger className="w-[160px]">
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
                          ) : (
                            <Badge className="bg-[#303030] text-background border-primary">
                              {student.beltLevel}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingStudent?.studentId === student.studentId ? (
                            <Select
                              value={editingStudent.newStatus}
                              onValueChange={(value) =>
                                setEditingStudent((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        newStatus: value as StudentStatus,
                                      }
                                    : prev,
                                )
                              }
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">active</SelectItem>
                                <SelectItem value="inactive">
                                  inactive
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant={
                                student.status === 'active'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {student.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{student.primaryContact}</TableCell>
                        <TableCell className="text-right">
                          {editingStudent?.studentId === student.studentId ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={saving}
                                onClick={handleSaveStudent}
                              >
                                {saving ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  'Save'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingStudent(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditStudent(student)}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={saving}
                                onClick={() =>
                                  void handleArchiveStudent(student)
                                }
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedFamily}
        onOpenChange={(open) => !open && setSelectedFamily(null)}
      >
        <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Family Details</DialogTitle>
            <DialogDescription>
              Manage guardians and students using stable IDs.
            </DialogDescription>
          </DialogHeader>
          {selectedFamily && (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Primary Email</p>
                  <p>{selectedFamily.family.primaryEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{selectedFamily.family.phoneNumber}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Address</p>
                  <p>{selectedFamily.family.address}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selectedFamily.family.status === 'active'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {selectedFamily.family.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p>{formatShortDate(selectedFamily.family.joinedDate)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Guardians</h3>
                <div className="space-y-3">
                  {selectedFamily.guardians.map((guardian) => (
                    <div
                      key={guardian.guardianId}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      {editingGuardian?.guardianId === guardian.guardianId ? (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={editingGuardian.firstName}
                              onChange={(e) =>
                                setEditingGuardian({
                                  ...editingGuardian,
                                  firstName: e.target.value,
                                })
                              }
                            />
                            <Input
                              value={editingGuardian.lastName}
                              onChange={(e) =>
                                setEditingGuardian({
                                  ...editingGuardian,
                                  lastName: e.target.value,
                                })
                              }
                            />
                          </div>
                          <Input
                            value={editingGuardian.relationship}
                            onChange={(e) =>
                              setEditingGuardian({
                                ...editingGuardian,
                                relationship: e.target.value,
                              })
                            }
                          />
                          <Input
                            value={editingGuardian.email ?? ''}
                            onChange={(e) =>
                              setEditingGuardian({
                                ...editingGuardian,
                                email: e.target.value || null,
                              })
                            }
                          />
                          <Input
                            value={editingGuardian.phone ?? ''}
                            onChange={(e) =>
                              setEditingGuardian({
                                ...editingGuardian,
                                phone: e.target.value || null,
                              })
                            }
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={saving}
                              onClick={handleSaveGuardian}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingGuardian(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{guardian.name}</p>
                            {guardian.isPrimaryContact && (
                              <Badge variant="secondary">Primary Contact</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {guardian.relationship}
                          </p>
                          <p className="text-sm">{guardian.email ?? '—'}</p>
                          <p className="text-sm">{guardian.phone ?? '—'}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingGuardian({ ...guardian })
                              }
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            {!guardian.isPrimaryContact && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() =>
                                  void handleSetPrimaryGuardian(
                                    guardian.guardianId,
                                  )
                                }
                              >
                                Set Primary
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Students</h3>
                <div className="space-y-3">
                  {selectedFamily.students.map((student) => (
                    <div
                      key={student.studentId}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {student.photoUrl && (
                              <AvatarImage
                                src={student.photoUrl}
                                alt={student.studentName}
                              />
                            )}
                            <AvatarFallback className="text-xs">
                              {student.firstName[0]}
                              {student.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{student.studentName}</p>
                        </div>
                        <Badge
                          variant={
                            student.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {student.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Age {student.age}
                      </p>
                      <p className="text-sm">{student.beltLevel}</p>
                      {student.notes && (
                        <div className="mt-2 bg-accent rounded-md px-2.5 py-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-accent-foreground mb-1">
                            Parent Note
                          </p>
                          <p className="text-sm italic text-foreground leading-relaxed">
                            {student.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        destructive
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
