import { describe, it, expect } from 'vitest';
import type { Profile, Family } from './types';
import { deriveAccess, ACCESS_MESSAGES } from './authAccess';

const su = { id: 'u1', email: 'u@example.com' };

function profile(partial: Partial<Profile> = {}): Profile {
  return {
    user_id: 'u1',
    role: 'family',
    display_name: 'Parent One',
    is_active: true,
    is_owner: false,
    deactivated_at: null,
    created_at: '',
    updated_at: '',
    avatar_url: null,
    ...partial,
  };
}

function family(partial: Partial<Family> = {}): Family {
  return {
    family_id: 'f1',
    owner_user_id: 'u1',
    primary_email: 'u@example.com',
    account_status: 'active',
    address: null,
    city: null,
    state: null,
    zip: null,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

describe('deriveAccess', () => {
  it('blocks when the profile fetch errored', () => {
    const d = deriveAccess(su, { data: null, error: true });
    expect(d.accessState).toBe('blocked');
    expect(d.accessMessage).toBe(ACCESS_MESSAGES.notProvisioned);
    expect(d.user).toBeNull();
    expect(d.profile).toBeNull();
  });

  it('blocks when there is no profile row', () => {
    const d = deriveAccess(su, { data: null, error: false });
    expect(d.accessState).toBe('blocked');
    expect(d.profile).toBeNull();
  });

  it('blocks a deactivated profile and keeps the profile for display', () => {
    const p = profile({ is_active: false });
    const d = deriveAccess(su, { data: p, error: false });
    expect(d.accessState).toBe('blocked');
    expect(d.accessMessage).toBe(ACCESS_MESSAGES.deactivated);
    expect(d.user).toBeNull();
    expect(d.profile).toBe(p);
  });

  it('marks an admin ready without a family lookup', () => {
    const d = deriveAccess(su, {
      data: profile({ role: 'admin' }),
      error: false,
    });
    expect(d.accessState).toBe('ready');
    expect(d.user?.role).toBe('admin');
  });

  it('blocks a family when the family lookup errored, keeping the user', () => {
    const d = deriveAccess(
      su,
      { data: profile(), error: false },
      { data: null, error: true },
    );
    expect(d.accessState).toBe('blocked');
    expect(d.accessMessage).toBe(ACCESS_MESSAGES.onboardingCheckFailed);
    expect(d.user).not.toBeNull();
  });

  it('routes a family with no family row to onboarding', () => {
    const d = deriveAccess(
      su,
      { data: profile(), error: false },
      { data: null, error: false },
    );
    expect(d.accessState).toBe('needs_onboarding');
    expect(d.user).not.toBeNull();
  });

  it('blocks a family whose account is inactive', () => {
    const d = deriveAccess(
      su,
      { data: profile(), error: false },
      { data: family({ account_status: 'inactive' }), error: false },
    );
    expect(d.accessState).toBe('blocked');
    expect(d.accessMessage).toBe(ACCESS_MESSAGES.familyInactive);
    expect(d.user).toBeNull();
  });

  it('marks an active family ready', () => {
    const d = deriveAccess(
      su,
      { data: profile(), error: false },
      { data: family(), error: false },
    );
    expect(d.accessState).toBe('ready');
    expect(d.user?.email).toBe('u@example.com');
  });
});
