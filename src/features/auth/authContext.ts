import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthService } from './authService';
import type { Profile, ProfilePatch } from '../profile/profileService';
import type { LanguageCode } from '../../config/languages';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** True until the initial session check finishes. */
  loading: boolean;
  isConfigured: boolean;
  service: AuthService;
  /** The signed-in user's profile; null when signed out or not yet loaded. */
  profile: Profile | null;
  profileError: boolean;
  /** True after the reset-password email link opened a recovery session. */
  passwordRecovery: boolean;
  updateProfile: (patch: ProfilePatch) => Promise<Profile>;
  /** Changes the interface language and, when signed in, saves it to the profile. */
  setLanguage: (code: LanguageCode) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
