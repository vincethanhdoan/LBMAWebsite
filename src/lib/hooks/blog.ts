import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBlogPosts, getBlogComments } from '../supabase/queries';
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  createBlogComment,
  deleteBlogComment,
} from '../supabase/mutations';
import { queryKeys } from '../queryKeys';
import type { BlogPost } from '../types';

export function useBlogPosts() {
  return useQuery({
    queryKey: queryKeys.blogPosts(),
    queryFn: getBlogPosts,
  });
}

export function useBlogComments(postId: string | null) {
  return useQuery({
    queryKey: queryKeys.blogComments(postId!),
    queryFn: () => getBlogComments(postId!),
    enabled: !!postId,
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<BlogPost, 'post_id' | 'created_at' | 'updated_at'>,
    ) => createBlogPost(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts() });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BlogPost> }) =>
      updateBlogPost(id, updates),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts() });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlogPost(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts() });
    },
  });
}

export function useCreateBlogComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      parentCommentId,
    }: {
      body: string;
      parentCommentId?: string;
    }) => createBlogComment(postId, body, parentCommentId),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.blogComments(postId),
      });
    },
  });
}

export function useDeleteBlogComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteBlogComment(commentId),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.blogComments(postId),
      });
    },
  });
}
