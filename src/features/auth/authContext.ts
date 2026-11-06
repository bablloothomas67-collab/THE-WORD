import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthService } from './authService';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** True until the initial session check finishes. */
  loading: boolean;
  isConfigured: boolean;
  service: AuthService;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
