import { describe, it, expect, vi } from 'vitest';

// conversations.ts transitively imports the Supabase client, which throws at
// import time without these, so stub before importing.
vi.stubEnv('VITE_SUPABASE_URL', 'https://stub.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'stub-anon-key');

const { isDirectConversationAllowed, countUnread } =
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

describe('countUnread', () => {
  const me = 'user-1';
  const other = 'user-2';
  const msg = (author: string, createdAt: string) => ({
    author_user_id: author,
    created_at: createdAt,
  });

  it('never counts my own messages', () => {
    const messages = [
      msg(me, '2026-07-16T10:00:00Z'),
      msg(me, '2026-07-16T11:00:00Z'),
    ];
    expect(countUnread(messages, me, null)).toBe(0);
  });

  it('counts every message from others when nothing was ever read', () => {
    const messages = [
      msg(other, '2026-07-16T10:00:00Z'),
      msg(me, '2026-07-16T10:30:00Z'),
      msg(other, '2026-07-16T11:00:00Z'),
    ];
    expect(countUnread(messages, me, null)).toBe(2);
    expect(countUnread(messages, me, undefined)).toBe(2);
  });

  it('counts only messages strictly after last_read_at', () => {
    const messages = [
      msg(other, '2026-07-16T09:00:00Z'),
      msg(other, '2026-07-16T10:00:00Z'),
      msg(other, '2026-07-16T11:00:00Z'),
    ];
    expect(countUnread(messages, me, '2026-07-16T10:00:00Z')).toBe(1);
  });

  it('a message stamped exactly at last_read_at counts as read', () => {
    const messages = [msg(other, '2026-07-16T10:00:00Z')];
    expect(countUnread(messages, me, '2026-07-16T10:00:00Z')).toBe(0);
  });
});
