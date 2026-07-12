import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getUserConversations,
  getAllProfiles,
  getConversationMembers,
  getMessages,
  type MessageWithMeta,
} from '../supabase/queries';
import { createMessage, markConversationAsRead } from '../supabase/mutations';
import { queryKeys } from '../queryKeys';

// Inlined from messages/helpers.ts to avoid lib→component import
function isDirectConversationAllowed(
  currentUserRole: 'admin' | 'family',
  otherRole?: string | null,
) {
  if (!otherRole) return false;
  if (currentUserRole === 'family') return otherRole === 'admin';
  return otherRole === 'family' || otherRole === 'admin';
}

function countUnread(
  messages: Array<{ author_user_id: string; created_at: string }>,
  userId: string,
  lastReadAt?: string | null,
): number {
  return messages.filter((m) => {
    if (m.author_user_id === userId) return false;
    if (!lastReadAt) return true;
    return new Date(m.created_at).getTime() > new Date(lastReadAt).getTime();
  }).length;
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

async function fetchConversationsForUser(
  user: FetchUser,
): Promise<ConversationsData> {
  const [profiles, userConvs] = await Promise.all([
    getAllProfiles(),
    getUserConversations(user.id),
  ]);

  const formattedConvs: FormattedConversation[] = [];
  const allowedDirectIds: string[] = [];

  for (const conv of userConvs) {
    if ((conv as any).hidden && user.role !== 'admin') continue;

    if (conv.type === 'global') {
      const convMessages = await getMessages(conv.conversation_id);
      const lastMsg = convMessages[convMessages.length - 1] as
        MessageWithMeta | undefined;
      const memberRecord = (conv as any).conversation_members?.find(
        (m: any) => m.user_id === user.id,
      );
      const lastReadAt = memberRecord?.last_read_at ?? null;
      const unreadCount = countUnread(convMessages, user.id, lastReadAt);

      formattedConvs.push({
        id: conv.conversation_id,
        name: 'Group Chat',
        type: 'group',
        unreadCount,
        lastMessage: lastMsg?.body?.substring(0, 50),
        lastMessageTime: lastMsg?.created_at,
      });
      continue;
    }

    if (conv.type !== 'dm') continue;

    const members = await getConversationMembers(conv.conversation_id);
    const otherMember = members.find((m) => m.user_id !== user.id);
    if (!otherMember) continue;

    const otherProfile = profiles.find(
      (p) => p.user_id === otherMember.user_id,
    );
    if (!isDirectConversationAllowed(user.role, otherProfile?.role)) continue;

    allowedDirectIds.push(conv.conversation_id);

    const convMessages = await getMessages(conv.conversation_id);
    const lastMsg = convMessages[convMessages.length - 1] as
      MessageWithMeta | undefined;
    const memberRecord = (conv as any).conversation_members?.find(
      (m: any) => m.user_id === user.id,
    );
    const lastReadAt = memberRecord?.last_read_at ?? null;
    const unreadCount = countUnread(convMessages, user.id, lastReadAt);

    formattedConvs.push({
      id: conv.conversation_id,
      name: otherProfile?.display_name || 'Unknown',
      type: 'direct',
      unreadCount,
      lastMessage: lastMsg?.body?.substring(0, 50),
      lastMessageTime: lastMsg?.created_at,
      avatarUrl: otherProfile?.avatar_url ?? null,
    });
  }

  return { conversations: formattedConvs, allowedDirectIds };
}

export function useConversations(user: FetchUser) {
  return useQuery({
    queryKey: queryKeys.conversations(user.id),
    queryFn: () => fetchConversationsForUser(user),
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
