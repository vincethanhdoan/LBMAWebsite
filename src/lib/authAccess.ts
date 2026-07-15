import type { User, Profile, Family } from './types';

export const ACCESS_MESSAGES = {
  notProvisioned:
    'Your account is not provisioned for the portal yet. Please contact the academy for an invitation.',
  deactivated:
    'Your account has been deactivated. Please contact the academy for support.',
  onboardingCheckFailed:
    'Unable to verify onboarding status. Please try again.',
  familyInactive:
    'Your family portal access is currently inactive. Please contact the academy.',
} as const;

export type AccessState = 'ready' | 'needs_onboarding' | 'blocked';

export type FetchOutcome<T> = { data: T | null; error: boolean };

export type AccessDecision = {
  accessState: AccessState;
  accessMessage: string | null;
  user: User;
  profile: Profile | null;
};

/**
 * Pure access-state decision for the portal. `useAuth` performs the Supabase
 * fetches, wraps each as a FetchOutcome, and calls this to derive the state.
 * `familyOutcome` is omitted for non-family or non-active profiles (the hook
 * only queries `families` for an active family user).
 */
export function deriveAccess(
  supabaseUser: { id: string; email: string | null },
  profileOutcome: FetchOutcome<Profile>,
  familyOutcome?: FetchOutcome<Family>,
): AccessDecision {
  if (profileOutcome.error || !profileOutcome.data) {
    return {
      accessState: 'blocked',
      accessMessage: ACCESS_MESSAGES.notProvisioned,
      user: null,
      profile: null,
    };
  }

  const profile = profileOutcome.data;
  const isActive = profile.is_active ?? true;
  const nextUser: User = {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    role: profile.role,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url ?? null,
  };

  if (!isActive) {
    return {
      accessState: 'blocked',
      accessMessage: ACCESS_MESSAGES.deactivated,
      user: null,
      profile,
    };
  }

  if (profile.role === 'family') {
    const outcome = familyOutcome ?? { data: null, error: false };
    if (outcome.error) {
      return {
        accessState: 'blocked',
        accessMessage: ACCESS_MESSAGES.onboardingCheckFailed,
        user: nextUser,
        profile,
      };
    }
    if (!outcome.data) {
      return {
        accessState: 'needs_onboarding',
        accessMessage: null,
        user: nextUser,
        profile,
      };
    }
    const accountStatus = outcome.data.account_status ?? 'active';
    if (accountStatus !== 'active') {
      return {
        accessState: 'blocked',
        accessMessage: ACCESS_MESSAGES.familyInactive,
        user: null,
        profile,
      };
    }
  }

  return {
    accessState: 'ready',
    accessMessage: null,
    user: nextUser,
    profile,
  };
}
