import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEnrollmentLeads } from '../supabase/queries';
import {
  updateLeadStatus,
  updateLeadAdminNotes,
  dismissLeadSilently,
  closeLead,
  archiveEnrollmentLead,
  restoreEnrollmentLead,
} from '../supabase/mutations';
import { queryKeys } from '../queryKeys';
import type { EnrollmentLead } from '../types';

export function useEnrollmentLeads() {
  return useQuery({
    queryKey: queryKeys.enrollmentLeads(),
    queryFn: getEnrollmentLeads,
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
