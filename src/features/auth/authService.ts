import type { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import type { LanguageCode } from '../../config/languages';

/**
 * Thin wrapper over Supabase Auth so UI components never talk to the
 * provider directly. Errors are mapped to translation keys; raw provider
 * messages are logged, never shown, so users always see localised text.
 */
export type AuthResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; code: 'not_configured' | 'auth_error'; messageKey: string };

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  preferredLanguage: LanguageCode;
}

const ERROR_KEYS: Record<string, string> = {
  invalid_credentials: 'auth.errors.invalidCredentials',
  email_not_confirmed: 'auth.errors.emailNotConfirmed',
  over_email_send_rate_limit: 'auth.errors.rateLimited',
  over_request_rate_limit: 'auth.errors.rateLimited',
  weak_password: 'auth.errors.weakPassword',
  same_password: 'auth.errors.samePassword',
  user_already_exists: 'auth.errors.userExists',
  email_exists: 'auth.errors.userExists',
};

export function authErrorKey(error: Pick<AuthError, 'code' | 'status'> | null | undefined): string {
  if (error?.code && ERROR_KEYS[error.code]) return ERROR_KEYS[error.code];
  if (error?.status === 429) return 'auth.errors.rateLimited';
  return 'auth.errors.generic';
}

function fail(error: AuthError): AuthResult {
  console.warn('Auth request failed', { code: error.code, status: error.status });
  return { ok: false, code: 'auth_error', messageKey: authErrorKey(error) };
}

const NOT_CONFIGURED: AuthResult = { ok: false, code: 'not_configured', messageKey: 'auth.notConfigured' };

export function createAuthService(client: SupabaseClient | null = defaultClient, origin?: string) {
  const siteOrigin = () => origin ?? window.location.origin;

  return {
    isConfigured: client !== null,

    async signIn(email: string, password: string): Promise<AuthResult> {
      if (!client) return NOT_CONFIGURED;
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      return error ? fail(error) : { ok: true };
    },

    async signUp(input: SignUpInput): Promise<AuthResult> {
      if (!client) return NOT_CONFIGURED;
      const { data, error } = await client.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          emailRedirectTo: `${siteOrigin()}/login`,
          data: { display_name: input.displayName.trim(), preferred_language: input.preferredLanguage },
        },
      });
      if (error) return fail(error);
      return { ok: true, needsEmailConfirmation: !data.session };
    },

    async signOut(): Promise<AuthResult> {
      if (!client) return NOT_CONFIGURED;
      const { error } = await client.auth.signOut();
      return error ? fail(error) : { ok: true };
    },

    /** Always reports success for unknown emails, so accounts can't be discovered. */
    async requestPasswordReset(email: string): Promise<AuthResult> {
      if (!client) return NOT_CONFIGURED;
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${siteOrigin()}/reset-password`,
      });
      return error ? fail(error) : { ok: true };
    },

    /** Requires the recovery session created by the reset link. */
    async updatePassword(password: string): Promise<AuthResult> {
      if (!client) return NOT_CONFIGURED;
      const { error } = await client.auth.updateUser({ password });
      return error ? fail(error) : { ok: true };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
export const authService = createAuthService();
