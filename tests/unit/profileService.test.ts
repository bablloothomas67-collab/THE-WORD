import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createProfileService, parseProfile } from '../../src/features/profile/profileService';

const row = {
  id: '11111111-1111-1111-1111-111111111111',
  display_name: 'Anna',
  preferred_language: 'ml',
  timezone: 'Asia/Kolkata',
  created_at: '2026-11-06T00:00:00Z',
  updated_at: '2026-11-06T00:00:00Z',
};

describe('parseProfile', () => {
  it('maps a valid row', () => {
    expect(parseProfile(row)).toMatchObject({ displayName: 'Anna', preferredLanguage: 'ml' });
  });
  it('falls back to English for a disabled language', () => {
    expect(parseProfile({ ...row, preferred_language: 'ta' }).preferredLanguage).toBe('en');
  });
  it('rejects malformed rows', () => {
    expect(() => parseProfile(null)).toThrow();
    expect(() => parseProfile({ ...row, display_name: 5 })).toThrow();
  });
});

describe('profileService', () => {
  function fakeClient(result: { data: unknown; error: unknown }) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
      single: vi.fn().mockResolvedValue(result),
    };
    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    return { client, chain };
  }

  it('returns null when Supabase is not configured', async () => {
    await expect(createProfileService(null).getOwnProfile('x')).resolves.toBeNull();
  });

  it('queries only the given user id', async () => {
    const { client, chain } = fakeClient({ data: row, error: null });
    await createProfileService(client).getOwnProfile(row.id);
    expect(chain.eq).toHaveBeenCalledWith('id', row.id);
  });

  it('only sends allowed columns on update, trimmed', async () => {
    const { client, chain } = fakeClient({ data: row, error: null });
    await createProfileService(client).updateOwnProfile(row.id, { displayName: '  Anna  ', preferredLanguage: 'ml' });
    expect(chain.update).toHaveBeenCalledWith({ display_name: 'Anna', preferred_language: 'ml' });
  });

  it('rejects an empty name or a disabled language before calling the server', async () => {
    const { client, chain } = fakeClient({ data: row, error: null });
    const service = createProfileService(client);
    await expect(service.updateOwnProfile(row.id, { displayName: '   ' })).rejects.toThrow();
    await expect(service.updateOwnProfile(row.id, { preferredLanguage: 'ta' as never })).rejects.toThrow();
    expect(chain.update).not.toHaveBeenCalled();
  });

  it('surfaces server errors', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });
    await expect(createProfileService(client).getOwnProfile(row.id)).rejects.toThrow(/boom/);
  });
});
