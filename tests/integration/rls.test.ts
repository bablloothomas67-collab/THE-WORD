/**
 * Two-account isolation test against a REAL Supabase project.
 * Run with: npm run test:rls (needs the env vars below; skipped otherwise).
 *
 *   SUPABASE_URL, SUPABASE_ANON_KEY,
 *   TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD,
 *   TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD
 *
 * Both test users must already exist and be email-confirmed.
 * Uses only the public anon key — exactly what a browser has.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const env = process.env;
const ready = Boolean(
  env.SUPABASE_URL &&
    env.SUPABASE_ANON_KEY &&
    env.TEST_USER_A_EMAIL &&
    env.TEST_USER_A_PASSWORD &&
    env.TEST_USER_B_EMAIL &&
    env.TEST_USER_B_PASSWORD,
);

function newClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signedIn(email: string, password: string) {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
}

describe.skipIf(!ready)('Row Level Security: profiles', () => {
  let a: Awaited<ReturnType<typeof signedIn>>;
  let b: Awaited<ReturnType<typeof signedIn>>;
  let bOriginalName = '';

  beforeAll(async () => {
    a = await signedIn(env.TEST_USER_A_EMAIL!, env.TEST_USER_A_PASSWORD!);
    b = await signedIn(env.TEST_USER_B_EMAIL!, env.TEST_USER_B_PASSWORD!);
    const { data } = await b.client.from('profiles').select('display_name').eq('id', b.userId).single();
    bOriginalName = data?.display_name ?? '';
  });

  afterAll(async () => {
    await a?.client.auth.signOut();
    await b?.client.auth.signOut();
  });

  it('each user can read their own profile', async () => {
    for (const u of [a, b]) {
      const { data, error } = await u.client.from('profiles').select('id').eq('id', u.userId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
  });

  it('a user sees only their own row when selecting everything', async () => {
    const { data, error } = await a.client.from('profiles').select('id');
    expect(error).toBeNull();
    expect(data?.map((r) => r.id)).toEqual([a.userId]);
  });

  it("user A cannot read user B's profile", async () => {
    const { data } = await a.client.from('profiles').select('*').eq('id', b.userId);
    expect(data ?? []).toHaveLength(0);
  });

  it("user A cannot update user B's profile", async () => {
    const { data } = await a.client
      .from('profiles')
      .update({ display_name: 'HACKED' })
      .eq('id', b.userId)
      .select();
    expect(data ?? []).toHaveLength(0);
    const check = await b.client.from('profiles').select('display_name').eq('id', b.userId).single();
    expect(check.data?.display_name).toBe(bOriginalName);
  });

  it('user A cannot insert or delete profiles', async () => {
    const insert = await a.client.from('profiles').insert({ id: b.userId, display_name: 'x' });
    expect(insert.error).not.toBeNull();
    await a.client.from('profiles').delete().eq('id', b.userId);
    const stillThere = await b.client.from('profiles').select('id').eq('id', b.userId);
    expect(stillThere.data).toHaveLength(1);
  });

  it('a user cannot change protected columns on their own row', async () => {
    const { error } = await a.client
      .from('profiles')
      .update({ created_at: '2000-01-01T00:00:00Z' })
      .eq('id', a.userId);
    expect(error).not.toBeNull();
  });

  it('a user can update their own allowed fields, but only to an enabled language', async () => {
    const ok = await a.client.from('profiles').update({ preferred_language: 'ml' }).eq('id', a.userId).select();
    expect(ok.error).toBeNull();
    const bad = await a.client.from('profiles').update({ preferred_language: 'ta' }).eq('id', a.userId);
    expect(bad.error).not.toBeNull();
    await a.client.from('profiles').update({ preferred_language: 'en' }).eq('id', a.userId);
  });

  it('anonymous visitors cannot read any profile', async () => {
    const { data } = await newClient().from('profiles').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('anyone can read the language list, but nobody can change it', async () => {
    const anon = newClient();
    const { data } = await anon.from('languages').select('code, is_enabled').order('code');
    expect(data?.filter((l) => l.is_enabled).map((l) => l.code)).toEqual(['en', 'ml']);
    const write = await a.client.from('languages').update({ is_enabled: true }).eq('code', 'ta').select();
    expect(write.data ?? []).toHaveLength(0);
  });
});
