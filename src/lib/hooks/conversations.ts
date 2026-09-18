import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getConversationSummaries,
  getMessages,
  type ConversationSummary,
  type MessageWithMeta,
} from '../supabase/queries';
import { createMessage, markConversationAsRead } from '../supabase/mutations';
import { queryKeys } from '../queryKeys';

// Inlined from messages/helpers.ts to avoid lib→component import
export function isDirectConversationAllowed(
  currentUserRole: 'admin' | 'family',
  otherRole?: string | null,
) {
  if (!otherRole) return false;
  if (currentUserRole === 'family') return otherRole === 'admin';
  return otherRole === 'family' || otherRole === 'admin';
}

export type FormattedConversation = {
  id: string;
  name: string;
  type: 'direct' | 'group';
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  avatarUrl?: string | null;
};

export type ConversationsData = {
  conversations: FormattedConversation[];
  allowedDirectIds: string[];
};

type FetchUser = {
  id: string;
  role: 'admin' | 'family';
};

export function formatConversationSummaries(
  summaries: ConversationSummary[],
  role: FetchUser['role'],
): ConversationsData {
  const conversations: FormattedConversation[] = [];
  const allowedDirectIds: string[] = [];

  for (const summary of summaries) {
    if (summary.hidden && role !== 'admin') continue;

    const shared = {
      id: summary.conversation_id,
      unreadCount: summary.unread_count,
      lastMessage: summary.last_message_preview ?? undefined,
      lastMessageTime: summary.last_message_at ?? undefined,
    };

    if (summary.type === 'global') {
      conversations.push({ ...shared, name: 'Group Chat', type: 'group' });
      continue;
    }

    if (summary.type !== 'dm' || !summary.other_user_id) continue;
    if (!isDirectConversationAllowed(role, summary.other_role)) continue;

    allowedDirectIds.push(summary.conversation_id);
    conversations.push({
      ...shared,
      name: summary.other_display_name || 'Unknown',
      type: 'direct',
      avatarUrl: summary.other_avatar_url,
    });
  }

  return { conversations, allowedDirectIds };
}

export function useConversations(user: FetchUser) {
  return useQuery({
    queryKey: queryKeys.conversations(user.id),
    queryFn: async () =>
      formatConversationSummaries(await getConversationSummaries(), user.role),
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.messages(conversationId!),
    queryFn: () => getMessages(conversationId!),
    enabled: !!conversationId,
  });
}

type SendMessageVars = {
  conversationId: string;
  body: string;
};

type SendMessageUser = {
  id: string;
  displayName: string;
  role: 'admin' | 'family';
};

export function useSendMessage(user: SendMessageUser) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, body }: SendMessageVars) =>
      createMessage({
        conversation_id: conversationId,
        author_user_id: user.id,
        body,
      }),

    onMutate: async ({ conversationId, body }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.messages(conversationId),
      });
      const snapshot = queryClient.getQueryData<MessageWithMeta[]>(
        queryKeys.messages(conversationId),
      );

      const tempMessage = {
        message_id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        author_user_id: user.id,
        body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: {
          display_name: user.displayName,
          role: user.role,
          avatar_url: null,
        },
        message_attachments: [],
      } as MessageWithMeta;

      queryClient.setQueryData<MessageWithMeta[]>(
        queryKeys.messages(conversationId),
        (old) => [...(old ?? []), tempMessage],
      );

      return { snapshot, conversationId };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx) {
        queryClient.setQueryData(
          queryKeys.messages(ctx.conversationId),
          ctx.snapshot,
        );
      }
      toast.error('Message failed to send');
    },

    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages(vars.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(user.id),
      });
    },
  });
}

export function useMarkConversationRead(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      markConversationAsRead(conversationId, userId),
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations(userId),
      });
      const snapshot = queryClient.getQueryData<ConversationsData>(
        queryKeys.conversations(userId),
      );
      queryClient.setQueryData<ConversationsData>(
        queryKeys.conversations(userId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            conversations: old.conversations.map((c) =>
              c.id === conversationId ? { ...c, unreadCount: 0 } : c,
            ),
          };
        },
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(queryKeys.conversations(userId), ctx.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.sidebarCounts(userId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.homeCounts(userId) });
    },
  });
}
