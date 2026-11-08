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
import { createPlansService } from '../../src/features/plans/plansService';

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

describe.skipIf(!ready)('Row Level Security: Bible text and study tools', () => {
  let a: Awaited<ReturnType<typeof signedIn>>;
  let b: Awaited<ReturnType<typeof signedIn>>;
  let versionId = '';
  const ref = () => ({ version_id: versionId, book_code: 'JHN', chapter: 3, verse: 16 });

  beforeAll(async () => {
    a = await signedIn(env.TEST_USER_A_EMAIL!, env.TEST_USER_A_PASSWORD!);
    b = await signedIn(env.TEST_USER_B_EMAIL!, env.TEST_USER_B_PASSWORD!);
    const { data } = await newClient().from('bible_versions').select('id').eq('code', 'kjv').single();
    versionId = data!.id as string;
    for (const t of ['bookmarks', 'highlights', 'study_notes']) await a.client.from(t).delete().match(ref());
  });

  afterAll(async () => {
    for (const t of ['bookmarks', 'highlights', 'study_notes']) await a?.client.from(t).delete().match(ref());
    await a?.client.auth.signOut();
    await b?.client.auth.signOut();
  });

  it('anyone can read enabled Bible versions and verses', async () => {
    const anon = newClient();
    const versions = await anon.from('bible_versions').select('code').order('sort_order');
    expect(versions.data?.map((v) => v.code)).toEqual(['mal1910', 'malirv', 'kjv', 'web']);
    const verse = await anon.from('bible_verses').select('text').match(ref()).single();
    expect(verse.data?.text).toMatch(/^For God so loved the world/);
  });

  it('ordinary users cannot add, change or delete Bible text', async () => {
    const insert = await a.client.from('bible_verses').insert({ ...ref(), verse: 999, text: 'x', search_text: 'x' });
    expect(insert.error).not.toBeNull();
    await a.client.from('bible_verses').update({ text: 'changed' }).match(ref());
    await a.client.from('bible_verses').delete().match(ref());
    const still = await newClient().from('bible_verses').select('text').match(ref()).single();
    expect(still.data?.text).toMatch(/^For God so loved the world/);
    const roles = await a.client.from('admin_roles').insert({ user_id: a.userId, role: 'admin' });
    expect(roles.error).not.toBeNull();
  });

  it("user A's bookmark, highlight and note are invisible to user B and anonymous visitors", async () => {
    expect((await a.client.from('bookmarks').insert(ref())).error).toBeNull();
    expect((await a.client.from('highlights').insert({ ...ref(), colour_key: 'gold' })).error).toBeNull();
    expect((await a.client.from('study_notes').insert({ ...ref(), note_text: 'private test note' })).error).toBeNull();

    for (const t of ['bookmarks', 'highlights', 'study_notes']) {
      expect((await a.client.from(t).select('id').match(ref())).data).toHaveLength(1);
      expect((await b.client.from(t).select('id').match(ref())).data ?? []).toHaveLength(0);
      expect((await newClient().from(t).select('id')).data ?? []).toHaveLength(0);
    }
  });

  it("user B cannot change or delete user A's study items", async () => {
    await b.client.from('highlights').update({ colour_key: 'rose' }).match(ref());
    await b.client.from('study_notes').update({ note_text: 'HACKED' }).match(ref());
    for (const t of ['bookmarks', 'highlights', 'study_notes']) await b.client.from(t).delete().match(ref());
    const h = await a.client.from('highlights').select('colour_key').match(ref()).single();
    const n = await a.client.from('study_notes').select('note_text').match(ref()).single();
    const bm = await a.client.from('bookmarks').select('id').match(ref());
    expect(h.data?.colour_key).toBe('gold');
    expect(n.data?.note_text).toBe('private test note');
    expect(bm.data).toHaveLength(1);
  });

  it("user B cannot create items in user A's name", async () => {
    const { error } = await b.client.from('bookmarks').insert({ ...ref(), user_id: a.userId });
    expect(error).not.toBeNull();
  });

  it('rejects references to verses that do not exist and invalid colours', async () => {
    const badRef = await a.client.from('bookmarks').insert({ ...ref(), chapter: 99 });
    expect(badRef.error).not.toBeNull();
    const badColour = await a.client.from('highlights').update({ colour_key: 'purple' }).match(ref());
    expect(badColour.error).not.toBeNull();
  });
});

describe.skipIf(!ready)('Row Level Security: plans, prayer journal, devotionals', () => {
  let a: Awaited<ReturnType<typeof signedIn>>;
  let b: Awaited<ReturnType<typeof signedIn>>;
  let planId = '';

  beforeAll(async () => {
    a = await signedIn(env.TEST_USER_A_EMAIL!, env.TEST_USER_A_PASSWORD!);
    b = await signedIn(env.TEST_USER_B_EMAIL!, env.TEST_USER_B_PASSWORD!);
    const { data } = await newClient().from('reading_plans').select('id').eq('slug', 'john-21').single();
    planId = data!.id as string;
    await a.client.from('user_reading_progress').delete().eq('plan_id', planId);
    await a.client.from('user_reading_plans').delete().eq('plan_id', planId);
    await a.client.from('prayer_entries').delete().eq('user_id', a.userId);
  });

  afterAll(async () => {
    await a?.client.from('user_reading_progress').delete().eq('plan_id', planId);
    await a?.client.from('user_reading_plans').delete().eq('plan_id', planId);
    await a?.client.from('prayer_entries').delete().eq('user_id', a.userId);
    await a?.client.auth.signOut();
    await b?.client.auth.signOut();
  });

  it('published plans and approved daily verses are public; nobody can change them', async () => {
    const anon = newClient();
    expect((await anon.from('reading_plans').select('slug')).data).toHaveLength(3);
    expect((await anon.from('reading_plan_days').select('day_number').eq('plan_id', planId)).data).toHaveLength(21);
    expect((await anon.from('daily_verse_refs').select('position')).data).toHaveLength(87);
    const write = await a.client.from('reading_plans').insert({ slug: 'x', duration_days: 1, status: 'published' });
    expect(write.error).not.toBeNull();
  });

  it('the app plans service loads every plan with its days against the real API', async () => {
    const service = createPlansService(newClient());
    const plans = await service.listPlans('ml');
    expect(plans.map((p) => p.slug)).toEqual(['john-21', 'psalms-30', 'new-testament-260']);
    for (const p of plans) {
      const detail = await service.getPlan(p.slug, 'en');
      expect(detail?.days).toHaveLength(p.durationDays);
    }
  });

  it("plan progress is private to its owner", async () => {
    expect((await a.client.from('user_reading_plans').insert({ plan_id: planId })).error).toBeNull();
    expect((await a.client.from('user_reading_progress').insert({ plan_id: planId, day_number: 1 })).error).toBeNull();
    expect((await b.client.from('user_reading_progress').select('day_number').eq('plan_id', planId)).data ?? []).toHaveLength(0);
    await b.client.from('user_reading_progress').delete().eq('plan_id', planId);
    expect((await a.client.from('user_reading_progress').select('day_number').eq('plan_id', planId)).data).toHaveLength(1);
    const invalidDay = await a.client.from('user_reading_progress').insert({ plan_id: planId, day_number: 99 });
    expect(invalidDay.error).not.toBeNull();
  });

  it("prayer entries are private: other users and anonymous visitors see nothing and cannot change them", async () => {
    const created = await a.client
      .from('prayer_entries')
      .insert({ title: 'Private test prayer', body: 'Only A may read this', category: 'petition' })
      .select('id')
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    expect((await b.client.from('prayer_entries').select('id').eq('id', id)).data ?? []).toHaveLength(0);
    expect((await newClient().from('prayer_entries').select('id')).data ?? []).toHaveLength(0);

    await b.client.from('prayer_entries').update({ title: 'HACKED' }).eq('id', id);
    await b.client.from('prayer_entries').delete().eq('id', id);
    const still = await a.client.from('prayer_entries').select('title').eq('id', id).single();
    expect(still.data?.title).toBe('Private test prayer');

    const spoof = await b.client.from('prayer_entries').insert({ title: 'x', user_id: a.userId });
    expect(spoof.error).not.toBeNull();
  });

  it('unpublished devotionals are hidden and devotionals cannot be written by users', async () => {
    const anon = newClient();
    const visible = await anon.from('devotionals').select('status');
    expect((visible.data ?? []).every((d) => d.status === 'published')).toBe(true);
    const write = await a.client.from('devotionals').insert({ slug: 'hack', publication_date: '2026-01-01', status: 'published' });
    expect(write.error).not.toBeNull();
  });
});

describe.skipIf(!ready)('Row Level Security: scripture audio', () => {
  it('anyone can read the published catalogue; ordinary users cannot add or upload audio', async () => {
    const anon = newClient();
    const read = await anon.from('audio_tracks').select('kind, published').limit(5);
    expect(read.error).toBeNull();
    expect((read.data ?? []).every((r) => r.published === true)).toBe(true);

    const a = await signedIn(env.TEST_USER_A_EMAIL!, env.TEST_USER_A_PASSWORD!);
    const row = {
      kind: 'devotional_prayer',
      content_key: 'rls-test',
      language_code: 'en',
      storage_path: 'rls/test.mp3',
      duration_secs: 1,
      text_sha256: '0'.repeat(64),
      voice_label: 'test',
      published: true,
    };
    expect((await a.client.from('audio_tracks').insert(row)).error).not.toBeNull();
    expect((await anon.from('audio_tracks').insert(row)).error).not.toBeNull();
    const upload = await a.client.storage
      .from('scripture-audio')
      .upload('rls/test.mp3', new Blob([new Uint8Array([0xff, 0xfb])], { type: 'audio/mpeg' }));
    expect(upload.error).not.toBeNull();
    await a.client.auth.signOut();
  });
});
