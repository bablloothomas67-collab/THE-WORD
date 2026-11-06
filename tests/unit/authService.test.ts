import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authErrorKey, createAuthService } from '../../src/features/auth/authService';

describe('authService without Supabase configured', () => {
  const service = createAuthService(null);

  it('reports itself as not configured', () => {
    expect(service.isConfigured).toBe(false);
  });

  it('returns not_configured instead of pretending to succeed', async () => {
    const expected = { ok: false, code: 'not_configured', messageKey: 'auth.notConfigured' };
    await expect(service.signIn('a@example.com', 'password1')).resolves.toEqual(expected);
    await expect(
      service.signUp({ email: 'a@example.com', password: 'password1', displayName: 'A', preferredLanguage: 'ml' }),
    ).resolves.toEqual(expected);
    await expect(service.signOut()).resolves.toEqual(expected);
    await expect(service.requestPasswordReset('a@example.com')).resolves.toEqual(expected);
    await expect(service.updatePassword('password1')).resolves.toEqual(expected);
  });
});

describe('authService with a client', () => {
  function fakeClient() {
    const auth = {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    };
    return { client: { auth } as unknown as SupabaseClient, auth };
  }

  it('trims email and sends sign-up metadata and redirect', async () => {
    const { client, auth } = fakeClient();
    const service = createAuthService(client, 'https://theword.test');
    const result = await service.signUp({
      email: '  anna@example.com ',
      password: 'password1',
      displayName: ' Anna ',
      preferredLanguage: 'ml',
    });
    expect(result).toEqual({ ok: true, needsEmailConfirmation: true });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'anna@example.com',
      password: 'password1',
      options: {
        emailRedirectTo: 'https://theword.test/login',
        data: { display_name: 'Anna', preferred_language: 'ml' },
      },
    });
  });

  it('sends password reset links to /reset-password', async () => {
    const { client, auth } = fakeClient();
    await createAuthService(client, 'https://theword.test').requestPasswordReset('anna@example.com');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('anna@example.com', {
      redirectTo: 'https://theword.test/reset-password',
    });
  });

  it('maps provider errors to translation keys', async () => {
    const { client, auth } = fakeClient();
    auth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials', status: 400, message: 'x' } });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(createAuthService(client).signIn('a@example.com', 'bad')).resolves.toEqual({
      ok: false,
      code: 'auth_error',
      messageKey: 'auth.errors.invalidCredentials',
    });
  });

  it.each([
    [{ code: 'email_not_confirmed' }, 'auth.errors.emailNotConfirmed'],
    [{ code: 'weak_password' }, 'auth.errors.weakPassword'],
    [{ code: 'same_password' }, 'auth.errors.samePassword'],
    [{ code: 'something_new', status: 429 }, 'auth.errors.rateLimited'],
    [{ code: 'something_new', status: 500 }, 'auth.errors.generic'],
  ])('authErrorKey(%o) -> %s', (error, key) => {
    expect(authErrorKey(error as never)).toBe(key);
  });
});
