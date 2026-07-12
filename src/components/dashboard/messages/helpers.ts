export type MessageRecord = {
  message_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  profiles?: {
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
  message_attachments?: Array<{
    file_name?: string | null;
    storage_path?: string | null;
  }> | null;
};

export type MessageListItem = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  attachmentName?: string;
  attachmentPath?: string;
};

export function isDirectConversationAllowed(
  currentUserRole: 'admin' | 'family',
  otherRole?: string,
) {
  if (!otherRole) return false;
  if (currentUserRole === 'family') return otherRole === 'admin';
  return otherRole === 'family' || otherRole === 'admin';
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Unknown error');
  }
  return 'Unknown error';
}

export function calculateUnreadCount(
  messagesData: Array<{ author_user_id: string; created_at: string }>,
  userId: string,
  lastReadAt?: string | null,
) {
  return messagesData.filter((message) => {
    if (message.author_user_id === userId) return false;
    if (!lastReadAt) return true;
    return (
      new Date(message.created_at).getTime() > new Date(lastReadAt).getTime()
    );
  }).length;
}

export function formatMessages(
  messagesData: MessageRecord[],
): MessageListItem[] {
  return messagesData.map((message) => ({
    id: message.message_id,
    authorId: message.author_user_id,
    authorName: message.profiles?.display_name || 'Unknown',
    authorAvatarUrl: message.profiles?.avatar_url ?? null,
    body: message.body,
    createdAt: message.created_at,
    attachmentName: message.message_attachments?.[0]?.file_name || undefined,
    attachmentPath: message.message_attachments?.[0]?.storage_path || undefined,
  }));
}

export function formatConversationTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatMessageTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMessageTimestamp(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export type MessageRenderItem = {
  message: MessageListItem;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showDateSeparator: boolean;
  dateLabel: string;
};

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isWithin5Minutes(a: string, b: string): boolean {
  return (
    Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 5 * 60 * 1000
  );
}

export function computeMessageRenderList(
  messages: MessageListItem[],
): MessageRenderItem[] {
  return messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];

    const groupedWithPrev =
      !!prev &&
      prev.authorId === msg.authorId &&
      isSameDay(prev.createdAt, msg.createdAt) &&
      isWithin5Minutes(prev.createdAt, msg.createdAt);

    const groupedWithNext =
      !!next &&
      next.authorId === msg.authorId &&
      isSameDay(next.createdAt, msg.createdAt) &&
      isWithin5Minutes(next.createdAt, msg.createdAt);

    const showDateSeparator =
      !prev || !isSameDay(prev.createdAt, msg.createdAt);

    return {
      message: msg,
      isFirstInGroup: !groupedWithPrev,
      isLastInGroup: !groupedWithNext,
      showDateSeparator,
      dateLabel: showDateSeparator ? formatMessageDate(msg.createdAt) : '',
    };
  });
}
