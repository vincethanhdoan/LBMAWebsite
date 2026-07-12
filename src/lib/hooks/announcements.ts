import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAnnouncements, getAnnouncementComments } from '../supabase/queries';
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  createAnnouncementComment,
} from '../supabase/mutations';
import { queryKeys } from '../queryKeys';
import type { Announcement } from '../types';

export function useAnnouncements() {
  return useQuery({
    queryKey: queryKeys.announcements(),
    queryFn: getAnnouncements,
  });
}

export function useAnnouncementComments(announcementId: string | null) {
  return useQuery({
    queryKey: queryKeys.announcementComments(announcementId!),
    queryFn: () => getAnnouncementComments(announcementId!),
    enabled: !!announcementId,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<Announcement, 'announcement_id' | 'created_at' | 'updated_at'>,
    ) => createAnnouncement(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements() });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Announcement>;
    }) => updateAnnouncement(id, updates),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements() });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements() });
    },
  });
}

export function useCreateAnnouncementComment(announcementId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      parentCommentId,
    }: {
      body: string;
      parentCommentId?: string;
    }) => createAnnouncementComment(announcementId, body, parentCommentId),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcementComments(announcementId),
      });
    },
  });
}
