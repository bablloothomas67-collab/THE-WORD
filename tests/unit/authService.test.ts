import { describe, expect, it } from 'vitest';
import { createAuthService } from '../../src/features/auth/authService';

describe('authService without Supabase configured', () => {
  const service = createAuthService(null);

  it('reports itself as not configured', () => {
    expect(service.isConfigured).toBe(false);
  });

  it('returns not_configured instead of pretending to sign in', async () => {
    await expect(service.signIn('a@example.com', 'password1')).resolves.toEqual({ ok: false, code: 'not_configured' });
    await expect(
      service.signUp({ email: 'a@example.com', password: 'password1', displayName: 'A', preferredLanguage: 'ml' }),
    ).resolves.toEqual({ ok: false, code: 'not_configured' });
    await expect(service.signOut()).resolves.toEqual({ ok: false, code: 'not_configured' });
  });
});
