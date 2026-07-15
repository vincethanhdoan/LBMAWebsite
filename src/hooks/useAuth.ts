import { useEffect, useRef, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { User, Profile, Family } from '../lib/types';
import { FAMILY_COLUMNS, PROFILE_COLUMNS } from '../lib/supabase/selects';
import { deriveAccess, type FetchOutcome } from '../lib/authAccess';

type AccessState = 'ready' | 'needs_onboarding' | 'blocked';

export function useAuth() {
  const loadSeqRef = useRef(0);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accessState, setAccessState] = useState<AccessState>('ready');
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        let session: Session | null = null;

        // 1) If we arrived via magic link, explicitly set the session from the hash
        if (
          typeof window !== 'undefined' &&
          window.location.hash.includes('access_token')
        ) {
          const params = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // Clear the hash immediately before the async call so the token is
            // not present in the URL during the setSession round-trip.
            const url = new URL(window.location.href);
            if (url.pathname === '/') url.pathname = '/dashboard';
            window.history.replaceState(
              window.history.state,
              '',
              url.pathname + url.search,
            );

            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (!error) {
              session = data.session;
            } else {
              console.error('Error setting session from magic link:', error);
            }
          }
        }

        // 2) Fallback to the current stored session (non-magic-link loads)
        if (!session) {
          const { data, error } = await supabase.auth.getSession();
          if (!isMounted) return;

          if (error && error.name !== 'AbortError') {
            console.error('Error getting session:', error);
            setLoading(false);
            return;
          }
          session = data.session;
        }

        if (!isMounted) return;

        if (session?.user) {
          await loadUserProfile(session.user, ++loadSeqRef.current);
        } else {
          setAccessState('ready');
          setAccessMessage(null);
          setLoading(false);
        }
      } catch (error) {
        if (!isMounted) return;

        const err = error as { name?: string };
        // Supabase auth can throw AbortError from internal locks when a request is superseded.
        // Treat this as non-fatal but still resolve loading so the UI can recover.
        if (err?.name === 'AbortError') {
          setLoading(false);
          return;
        }

        console.error('Error during auth init:', error);
        setLoading(false);
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        // Avoid awaiting async work inside auth callback to prevent lock contention.
        const seq = ++loadSeqRef.current;
        setTimeout(() => {
          if (!isMounted) return;
          void loadUserProfile(session.user, seq);
        }, 0);
      } else {
        setUser(null);
        setProfile(null);
        setAccessState('ready');
        setAccessMessage(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser, seq: number) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (seq !== loadSeqRef.current) return;

      if (profileError) console.error('Error loading profile:', profileError);
      const profileOutcome: FetchOutcome<Profile> = {
        data: profileData ?? null,
        error: !!profileError,
      };

      let familyOutcome: FetchOutcome<Family> | undefined;
      const activeProfile =
        profileOutcome.data && (profileOutcome.data.is_active ?? true);
      if (activeProfile && profileOutcome.data!.role === 'family') {
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select(FAMILY_COLUMNS)
          .eq('owner_user_id', supabaseUser.id)
          .maybeSingle();

        if (seq !== loadSeqRef.current) return;

        if (familyError)
          console.error('Error checking family onboarding:', familyError);
        familyOutcome = {
          data: (familyData as Family) ?? null,
          error: !!familyError,
        };
      }

      const decision = deriveAccess(
        { id: supabaseUser.id, email: supabaseUser.email ?? null },
        profileOutcome,
        familyOutcome,
      );
      setProfile(decision.profile);
      setUser(decision.user);
      setAccessState(decision.accessState);
      setAccessMessage(decision.accessMessage);
    } catch (error) {
      if (seq !== loadSeqRef.current) return;
      console.error('Error in loadUserProfile:', error);
      setProfile(null);
      setUser(null);
      setAccessState('blocked');
      setAccessMessage('Authentication failed. Please try signing in again.');
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  };

  const refreshUser = async () => {
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error('refreshUser: failed to get user', error);
      return;
    }
    if (supabaseUser) await loadUserProfile(supabaseUser, ++loadSeqRef.current);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAccessState('ready');
    setAccessMessage(null);
  };

  return {
    user,
    profile,
    loading,
    accessState,
    accessMessage,
    signOut,
    refreshUser,
    isOwner: profile?.is_owner ?? false,
  };
}
