import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase/client';
import { authService } from './authService';
import { AuthContext, type AuthContextValue } from './authContext';
import { profileService, type Profile, type ProfilePatch } from '../profile/profileService';
import { changeLanguage } from '../../app/i18n';
import type { LanguageCode } from '../../config/languages';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(supabase !== null);
  // Profile state is tagged with its owner so a stale profile is never shown for another user.
  const [profileState, setProfileState] = useState<{ ownerId: string; profile: Profile | null; error: boolean } | null>(
    null,
  );
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const userId = session?.user.id ?? null;
  const ownState = profileState && profileState.ownerId === userId ? profileState : null;
  const profile = ownState?.profile ?? null;
  const profileError = ownState?.error ?? false;

  // Session bootstrap + subscription.
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch((err: unknown) => console.error('Failed to read auth session', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
      setSession(next);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Load the profile whenever the signed-in user changes, and adopt its language.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    profileService
      .getOwnProfile(userId)
      .then((p) => {
        if (!active) return;
        setProfileState({ ownerId: userId, profile: p, error: false });
        if (p && p.preferredLanguage !== i18n.language) {
          changeLanguage(p.preferredLanguage).catch((err: unknown) => console.error(err));
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load profile', err);
        if (active) setProfileState({ ownerId: userId, profile: null, error: true });
      });
    return () => {
      active = false;
    };
    // Runs on sign-in only (i18n is a stable object), not on every language switch.
  }, [userId, i18n]);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!userId) throw new Error('Not signed in');
      const updated = await profileService.updateOwnProfile(userId, patch);
      setProfileState({ ownerId: userId, profile: updated, error: false });
      return updated;
    },
    [userId],
  );

  const setLanguage = useCallback(
    async (code: LanguageCode) => {
      await changeLanguage(code);
      if (userId) {
        try {
          const updated = await profileService.updateOwnProfile(userId, { preferredLanguage: code });
          setProfileState({ ownerId: userId, profile: updated, error: false });
        } catch (err) {
          // The local choice still applies; it will sync next time.
          console.error('Failed to save language preference', err);
        }
      }
    },
    [userId],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      isConfigured: authService.isConfigured,
      service: authService,
      profile,
      profileError,
      passwordRecovery,
      updateProfile,
      setLanguage,
    }),
    [session, loading, profile, profileError, passwordRecovery, updateProfile, setLanguage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
