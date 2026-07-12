import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAllFamiliesWithRelations,
  getFamilyWithRelations,
  type FamilyWithRelations,
} from '../lib/supabase/queries';
import {
  setFamilyAccountStatus,
  updateGuardian,
  updateStudent,
  updateStudentsByFamily,
} from '../lib/supabase/mutations';
import { supabase } from '../lib/supabase/client';
import { calculateAge } from '../lib/format';
import type { BeltLevel, Guardian, Student } from '../lib/types';

export type FamilyStatus = 'active' | 'inactive' | 'archived';
export type StudentStatus = 'active' | 'inactive';

export type GuardianRow = {
  guardianId: string;
  name: string;
  firstName: string;
  lastName: string;
  relationship: string;
  email: string | null;
  phone: string | null;
  isPrimaryContact: boolean;
};

export type StudentRow = {
  studentId: string;
  studentName: string;
  firstName: string;
  lastName: string;
  age: number;
  beltLevel: string;
  status: StudentStatus;
  notes: string;
  photoUrl: string | null;
  familyId: string;
  familyName: string;
  primaryContact: string;
  primaryEmail: string;
};

export type Family = {
  id: string;
  ownerUserId: string;
  primaryEmail: string;
  primaryContact: string;
  phoneNumber: string | null;
  address: string;
  studentCount: number;
  status: FamilyStatus;
  joinedDate: string;
  students: StudentRow[];
  guardians: GuardianRow[];
};

type FamilyDetails = {
  family: Family;
  guardians: GuardianRow[];
  students: StudentRow[];
};

function toFamilyStatus(status: unknown): FamilyStatus {
  return status === 'inactive' || status === 'archived' ? status : 'active';
}

function mapGuardian(guardian: Guardian): GuardianRow {
  return {
    guardianId: guardian.guardian_id,
    name: `${guardian.first_name} ${guardian.last_name}`,
    firstName: guardian.first_name,
    lastName: guardian.last_name,
    relationship: guardian.relationship ?? 'Guardian',
    email: guardian.email,
    phone: guardian.phone_number,
    isPrimaryContact: Boolean(guardian.is_primary_contact),
  };
}

function mapFamilyRecord(details: FamilyWithRelations): Family {
  const guardians = (details.guardians || []).map(mapGuardian);
  const primaryGuardian =
    guardians.find((g) => g.isPrimaryContact) ?? guardians[0];

  const students: StudentRow[] = (details.students || []).map(
    (student: Student) => ({
      studentId: student.student_id,
      studentName: `${student.first_name} ${student.last_name}`,
      firstName: student.first_name,
      lastName: student.last_name,
      age: calculateAge(student.date_of_birth),
      beltLevel: student.belt_level ?? 'White Belt',
      status: student.status === 'inactive' ? 'inactive' : 'active',
      notes: student.notes ?? '',
      photoUrl: student.photo_url ?? null,
      familyId: details.family_id,
      familyName: `${primaryGuardian?.name ?? 'Unknown'} Family`,
      primaryContact: primaryGuardian?.name ?? 'Unknown',
      primaryEmail: details.primary_email,
    }),
  );

  return {
    id: details.family_id,
    ownerUserId: details.owner_user_id,
    primaryEmail: details.primary_email,
    primaryContact: primaryGuardian?.name ?? 'Unknown',
    phoneNumber: primaryGuardian?.phone ?? null,
    address:
      [details.address, details.city, details.state, details.zip]
        .filter(Boolean)
        .join(', ') || 'Not set',
    studentCount: students.length,
    status: toFamilyStatus(details.account_status),
    joinedDate: details.created_at,
    students,
    guardians,
  };
}

export function useAdminFamilies(searchTerm: string) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFamilies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllFamiliesWithRelations();
      setFamilies(data.map(mapFamilyRecord));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load families');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFamilies();
  }, [refreshFamilies]);

  const allStudents: StudentRow[] = useMemo(
    () => families.flatMap((f) => f.students),
    [families],
  );

  const filteredFamilies = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    if (!searchLower) return families;
    return families.filter((family) => {
      if (family.primaryContact.toLowerCase().includes(searchLower))
        return true;
      if (family.primaryEmail.toLowerCase().includes(searchLower)) return true;
      return family.guardians.some(
        (g) =>
          g.name.toLowerCase().includes(searchLower) ||
          (g.email ?? '').toLowerCase().includes(searchLower),
      );
    });
  }, [families, searchTerm]);

  const filteredStudents = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    if (!searchLower) return allStudents;
    return allStudents.filter((student) => {
      if (student.studentName.toLowerCase().includes(searchLower)) return true;
      if (student.primaryContact.toLowerCase().includes(searchLower))
        return true;
      return student.primaryEmail.toLowerCase().includes(searchLower);
    });
  }, [allStudents, searchTerm]);

  const loadFamilyDetails = useCallback(async (familyId: string) => {
    const details = await getFamilyWithRelations(familyId);
    const mapped = mapFamilyRecord(details);
    setSelectedFamily({
      family: mapped,
      guardians: mapped.guardians,
      students: mapped.students,
    });
  }, []);

  const reloadSelectedFamily = useCallback(async () => {
    if (!selectedFamily) return;
    await loadFamilyDetails(selectedFamily.family.id);
  }, [loadFamilyDetails, selectedFamily]);

  const updateFamilyStatus = useCallback(
    async (familyId: string, status: FamilyStatus) => {
      setSaving(true);
      setError(null);
      try {
        await setFamilyAccountStatus(familyId, status);
        if (status !== 'active') {
          await updateStudentsByFamily(familyId, { status: 'inactive' });
        }
        await refreshFamilies();
        await reloadSelectedFamily();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update family status',
        );
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [refreshFamilies, reloadSelectedFamily],
  );

  const saveStudent = useCallback(
    async (
      studentId: string,
      updates: {
        belt_level?: BeltLevel | null;
        status?: StudentStatus;
        notes?: string | null;
      },
    ) => {
      setSaving(true);
      setError(null);
      try {
        await updateStudent(studentId, updates);
        await refreshFamilies();
        await reloadSelectedFamily();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save student');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [refreshFamilies, reloadSelectedFamily],
  );

  const saveGuardian = useCallback(
    async (
      guardianId: string,
      updates: Partial<
        Pick<
          Guardian,
          'first_name' | 'last_name' | 'email' | 'phone_number' | 'relationship'
        >
      >,
    ) => {
      setSaving(true);
      setError(null);
      try {
        await updateGuardian(guardianId, updates);
        await refreshFamilies();
        await reloadSelectedFamily();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to save guardian',
        );
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [refreshFamilies, reloadSelectedFamily],
  );

  const setPrimaryGuardian = useCallback(
    async (guardianId: string) => {
      setSaving(true);
      setError(null);
      try {
        const { error: rpcError } = await supabase.rpc('set_primary_guardian', {
          p_guardian_id: guardianId,
        });
        if (rpcError) throw rpcError;
        await refreshFamilies();
        await reloadSelectedFamily();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to set primary guardian',
        );
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [refreshFamilies, reloadSelectedFamily],
  );

  return {
    families,
    filteredFamilies,
    filteredStudents,
    selectedFamily,
    setSelectedFamily,
    loading,
    saving,
    error,
    refreshFamilies,
    loadFamilyDetails,
    updateFamilyStatus,
    saveStudent,
    saveGuardian,
    setPrimaryGuardian,
  };
}
