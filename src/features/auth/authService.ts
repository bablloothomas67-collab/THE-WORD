import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import type { LanguageCode } from '../../config/languages';

/**
 * Thin wrapper over Supabase Auth so UI components never talk to the
 * provider directly. Task 002 adds the profiles table, RLS and
 * preferred-language sync on top of this.
 */
export type AuthResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; code: 'not_configured' | 'auth_error'; message?: string };

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  preferredLanguage: LanguageCode;
}

export function createAuthService(client: SupabaseClient | null = defaultClient) {
  const notConfigured: AuthResult = { ok: false, code: 'not_configured' };

  return {
    isConfigured: client !== null,

    async signIn(email: string, password: string): Promise<AuthResult> {
      if (!client) return notConfigured;
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { ok: false, code: 'auth_error', message: error.message } : { ok: true };
    },

    async signUp(input: SignUpInput): Promise<AuthResult> {
      if (!client) return notConfigured;
      const { data, error } = await client.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: { display_name: input.displayName.trim(), preferred_language: input.preferredLanguage },
        },
      });
      if (error) return { ok: false, code: 'auth_error', message: error.message };
      return { ok: true, needsEmailConfirmation: !data.session };
    },

    async signOut(): Promise<AuthResult> {
      if (!client) return notConfigured;
      const { error } = await client.auth.signOut();
      return error ? { ok: false, code: 'auth_error', message: error.message } : { ok: true };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
export const authService = createAuthService();
