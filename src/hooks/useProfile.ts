import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFamilyByOwner,
  getGuardiansByFamily,
  getStudentsByFamily,
  getReviewByFamily,
} from '../lib/supabase/queries';
import {
  updateFamily,
  createGuardian,
  updateGuardian,
  deleteGuardian,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../lib/supabase/mutations';
import { queryKeys } from '../lib/queryKeys';
import type { Family, Guardian, Student } from '../lib/types';

type ProfileUser = {
  id: string;
  email: string;
};

async function fetchProfile(userId: string) {
  const familyData = await getFamilyByOwner(userId);

  if (!familyData) {
    return { family: null, guardians: [], students: [], review: null };
  }

  const [guardians, students, review] = await Promise.all([
    getGuardiansByFamily(familyData.family_id),
    getStudentsByFamily(familyData.family_id),
    getReviewByFamily(familyData.family_id).catch(() => null),
  ]);

  return { family: familyData, guardians, students, review };
}

export function useProfile(user: ProfileUser | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.profile(user?.id ?? ''),
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const family = data?.family ?? null;
  const guardians = data?.guardians ?? [];
  const students = data?.students ?? [];
  const review = data?.review ?? null;
  const loading = isLoading;
  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? 'Failed to load profile'
        : null;

  const invalidate = useCallback(() => {
    if (user)
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
  }, [queryClient, user]);

  const saveFamily = async (updates: Partial<Family>) => {
    if (!family) throw new Error('No family found');
    const updated = await updateFamily(family.family_id, updates);
    invalidate();
    return updated;
  };

  const addGuardian = async (
    guardian: Omit<
      Guardian,
      'guardian_id' | 'created_at' | 'updated_at' | 'family_id'
    >,
  ) => {
    if (!family) throw new Error('No family found');
    const newGuardian = await createGuardian({
      ...guardian,
      family_id: family.family_id,
    });
    invalidate();
    return newGuardian;
  };

  const updateGuardianData = async (
    guardianId: string,
    updates: Partial<Guardian>,
  ) => {
    const updated = await updateGuardian(guardianId, updates);
    invalidate();
    return updated;
  };

  const removeGuardian = async (guardianId: string) => {
    await deleteGuardian(guardianId);
    invalidate();
  };

  const addStudent = async (
    student: Omit<
      Student,
      'student_id' | 'created_at' | 'updated_at' | 'family_id'
    >,
  ) => {
    if (!family) throw new Error('No family found');
    const newStudent = await createStudent({
      ...student,
      family_id: family.family_id,
    });
    invalidate();
    return newStudent;
  };

  const updateStudentData = async (
    studentId: string,
    updates: Partial<Student>,
  ) => {
    const updated = await updateStudent(studentId, updates);
    invalidate();
    return updated;
  };

  const removeStudent = async (studentId: string) => {
    await deleteStudent(studentId);
    invalidate();
  };

  return {
    family,
    guardians,
    students,
    review,
    loading,
    error: errorMessage,
    saveFamily,
    addGuardian,
    updateGuardian: updateGuardianData,
    removeGuardian,
    addStudent,
    updateStudent: updateStudentData,
    removeStudent,
    reload: refetch,
  };
}
