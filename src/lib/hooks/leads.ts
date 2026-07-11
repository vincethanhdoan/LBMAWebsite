import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getActiveEnrollmentLeads,
  getTerminalEnrollmentLeads,
  getTerminalLeadCounts,
  getUpcomingBookings,
  type TerminalLeadFilter,
} from '../supabase/queries';
import {
  updateLeadStatus,
  updateLeadAdminNotes,
  updateEnrollmentLead,
  dismissLeadSilently,
  closeLead,
  archiveEnrollmentLead,
  restoreEnrollmentLead,
  recordLeadAttendance,
} from '../supabase/mutations';
import { queryKeys } from '../queryKeys';
import type { EnrollmentLead } from '../types';
import { deriveAttentionItems } from '../../components/admin/leads/leadViews';
import { toLocalDateKey } from '../../components/admin/leads/leadDisplay';

export function useActiveLeads() {
  return useQuery({
    queryKey: queryKeys.enrollmentLeadsActive(),
    queryFn: getActiveEnrollmentLeads,
  });
}

export function useAttentionCount(): number {
  const { data } = useActiveLeads();
  // Reading the clock each render is intentional: the count reflects current time.
  // eslint-disable-next-line react-hooks/purity
  return deriveAttentionItems(data ?? [], toLocalDateKey(new Date()), Date.now()).length;
}

export function useTerminalLeads(filter: TerminalLeadFilter, search: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.enrollmentLeadsTerminal(filter, search),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getTerminalEnrollmentLeads({ filter, search: search || undefined, page: pageParam }),
    getNextPageParam: (last, all) => (last.hasMore ? all.length : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useTerminalLeadCounts() {
  return useQuery({
    queryKey: queryKeys.enrollmentLeadsTerminalCounts(),
    queryFn: getTerminalLeadCounts,
  });
}

export function useUpcomingBookings() {
  return useQuery({
    queryKey: queryKeys.upcomingBookings(),
    queryFn: getUpcomingBookings,
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: EnrollmentLead['status'] }) =>
      updateLeadStatus(leadId, status),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    },
  });
}

export function useUpdateLeadNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, notes }: { leadId: string; notes: string }) =>
      updateLeadAdminNotes(leadId, notes),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      leadId: string;
      parentName: string;
      parentEmail: string;
      phone: string | null;
      children: Array<{ childId: string | null; name: string; age: number }>;
    }) => updateEnrollmentLead(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    },
  });
}

export function useDismissLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => dismissLeadSilently(leadId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    },
  });
}

export function useCloseLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => closeLead(leadId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    },
  });
}

export function useArchiveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => archiveEnrollmentLead(leadId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    },
  });
}

export function useRestoreLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => restoreEnrollmentLead(leadId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    },
  });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, attendance }: { leadId: string; attendance: 'attended' | 'no_show' }) =>
      recordLeadAttendance(leadId, attendance),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    },
  });
}
