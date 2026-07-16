import { describe, it, expect } from 'vitest';
import { publicUrlToPath } from './storagePaths';

describe('publicUrlToPath', () => {
  it('strips the public-URL prefix and cache-buster to a bare path', () => {
    expect(
      publicUrlToPath(
        'https://ref.supabase.co/storage/v1/object/public/profile-pictures/profiles/u1/avatar?t=123',
        'profile-pictures',
      ),
    ).toBe('profiles/u1/avatar');
  });
  it('handles announcement image paths', () => {
    expect(
      publicUrlToPath(
        'https://ref.supabase.co/storage/v1/object/public/announcement-images/abc/1.jpg',
        'announcement-images',
      ),
    ).toBe('abc/1.jpg');
  });
  it('returns an already-bare path unchanged', () => {
    expect(publicUrlToPath('profiles/u1/avatar', 'profile-pictures')).toBe(
      'profiles/u1/avatar',
    );
  });
  it('returns null for null', () => {
    expect(publicUrlToPath(null, 'profile-pictures')).toBeNull();
  });
});
