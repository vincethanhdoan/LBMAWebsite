import { describe, it, expect, vi } from 'vitest';
import type { ConversationSummary } from '../supabase/queries';

// conversations.ts transitively imports the Supabase client, which throws at
// import time without these, so stub before importing.
vi.stubEnv('VITE_SUPABASE_URL', 'https://stub.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'stub-anon-key');

const { isDirectConversationAllowed, formatConversationSummaries } =
  await import('./conversations');

describe('isDirectConversationAllowed', () => {
  it('allows a family user to DM an admin', () => {
    expect(isDirectConversationAllowed('family', 'admin')).toBe(true);
  });

  it('blocks family-to-family DMs', () => {
    expect(isDirectConversationAllowed('family', 'family')).toBe(false);
  });

  it('allows an admin to DM a family', () => {
    expect(isDirectConversationAllowed('admin', 'family')).toBe(true);
  });

  it('allows admin-to-admin DMs', () => {
    expect(isDirectConversationAllowed('admin', 'admin')).toBe(true);
  });

  it('blocks conversations with a missing or unknown role', () => {
    expect(isDirectConversationAllowed('family', undefined)).toBe(false);
    expect(isDirectConversationAllowed('family', null)).toBe(false);
    expect(isDirectConversationAllowed('admin', '')).toBe(false);
    expect(isDirectConversationAllowed('family', 'other')).toBe(false);
  });
});

describe('formatConversationSummaries', () => {
  const summary = (overrides: Partial<ConversationSummary>) => ({
    conversation_id: 'conv-1',
    type: 'dm',
    hidden: false,
    other_user_id: 'user-2',
    other_display_name: 'Coach Ana',
    other_role: 'admin',
    other_avatar_url: null,
    last_message_preview: 'See you Monday',
    last_message_at: '2026-07-16T10:00:00Z',
    unread_count: 2,
    ...overrides,
  });

  it('maps a direct conversation and records it as allowed', () => {
    const result = formatConversationSummaries([summary({})], 'family');
    expect(result.allowedDirectIds).toEqual(['conv-1']);
    expect(result.conversations).toEqual([
      {
        id: 'conv-1',
        name: 'Coach Ana',
        type: 'direct',
        unreadCount: 2,
        lastMessage: 'See you Monday',
        lastMessageTime: '2026-07-16T10:00:00Z',
        avatarUrl: null,
      },
    ]);
  });

  it('maps the global conversation to the group chat', () => {
    const result = formatConversationSummaries(
      [summary({ type: 'global', other_user_id: null, other_role: null })],
      'family',
    );
    expect(result.allowedDirectIds).toEqual([]);
    expect(result.conversations[0]).toMatchObject({
      name: 'Group Chat',
      type: 'group',
      unreadCount: 2,
    });
  });

  it('drops family-to-family conversations', () => {
    const result = formatConversationSummaries(
      [summary({ other_role: 'family' })],
      'family',
    );
    expect(result).toEqual({ conversations: [], allowedDirectIds: [] });
  });

  it('drops a direct conversation whose other member is missing or not visible', () => {
    const result = formatConversationSummaries(
      [
        summary({ other_user_id: null, other_role: null }),
        summary({ conversation_id: 'conv-2', other_role: null }),
      ],
      'admin',
    );
    expect(result).toEqual({ conversations: [], allowedDirectIds: [] });
  });

  it('hides hidden conversations from families but not admins', () => {
    const hidden = [summary({ type: 'global', hidden: true })];
    expect(formatConversationSummaries(hidden, 'family').conversations).toEqual(
      [],
    );
    expect(
      formatConversationSummaries(hidden, 'admin').conversations,
    ).toHaveLength(1);
  });

  it('falls back to Unknown and leaves the preview empty with no messages', () => {
    const [conversation] = formatConversationSummaries(
      [
        summary({
          other_display_name: null,
          last_message_preview: null,
          last_message_at: null,
          unread_count: 0,
        }),
      ],
      'admin',
    ).conversations;
    expect(conversation.name).toBe('Unknown');
    expect(conversation.lastMessage).toBeUndefined();
    expect(conversation.lastMessageTime).toBeUndefined();
  });
});
