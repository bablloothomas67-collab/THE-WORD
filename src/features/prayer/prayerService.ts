import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';

/**
 * Private prayer journal. Owner-only under RLS; there is no admin read policy.
 * Never log entry text, never send it to analytics or AI.
 */
export const PRAYER_CATEGORIES = ['thanksgiving', 'petition', 'intercession', 'confession', 'praise', 'other'] as const;
export type PrayerCategory = (typeof PRAYER_CATEGORIES)[number];
export const MAX_TITLE = 120;
export const MAX_BODY = 10_000;

export interface PrayerEntry {
  id: string;
  title: string;
  body: string;
  category: PrayerCategory;
  status: 'open' | 'answered';
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerInput {
  title: string;
  body: string;
  category: PrayerCategory;
}

type Row = Record<string, unknown>;

function isCategory(v: unknown): v is PrayerCategory {
  return typeof v === 'string' && (PRAYER_CATEGORIES as readonly string[]).includes(v);
}

export function parseEntry(r: Row): PrayerEntry {
  if (typeof r.id !== 'string' || typeof r.title !== 'string') throw new Error('Malformed prayer entry');
  return {
    id: r.id,
    title: r.title,
    body: typeof r.body === 'string' ? r.body : '',
    category: isCategory(r.category) ? r.category : 'other',
    status: r.status === 'answered' ? 'answered' : 'open',
    answeredAt: typeof r.answered_at === 'string' ? r.answered_at : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export function validatePrayer(input: PrayerInput): string | null {
  const title = input.title.trim();
  if (!title) return 'prayer.errors.titleRequired';
  if (title.length > MAX_TITLE) return 'prayer.errors.titleLong';
  if (input.body.length > MAX_BODY) return 'prayer.errors.bodyLong';
  if (!isCategory(input.category)) return 'prayer.errors.category';
  return null;
}

const COLUMNS = 'id, title, body, category, status, answered_at, created_at, updated_at';

export function createPrayerService(client: SupabaseClient | null = defaultClient) {
  function db(): SupabaseClient {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  }
  // Error messages never include entry text.
  function check(error: { message: string; code?: string } | null, what: string) {
    if (error) throw new Error(`${what} failed (${error.code ?? 'error'})`);
  }

  return {
    async list(): Promise<PrayerEntry[]> {
      const { data, error } = await db().from('prayer_entries').select(COLUMNS).order('created_at', { ascending: false });
      check(error, 'Load prayers');
      return ((data ?? []) as Row[]).map(parseEntry);
    },

    async create(input: PrayerInput): Promise<PrayerEntry> {
      const problem = validatePrayer(input);
      if (problem) throw new Error(problem);
      const { data, error } = await db()
        .from('prayer_entries')
        .insert({ title: input.title.trim(), body: input.body.trim(), category: input.category })
        .select(COLUMNS)
        .single();
      check(error, 'Save prayer');
      return parseEntry(data as Row);
    },

    async update(id: string, input: PrayerInput): Promise<PrayerEntry> {
      const problem = validatePrayer(input);
      if (problem) throw new Error(problem);
      const { data, error } = await db()
        .from('prayer_entries')
        .update({ title: input.title.trim(), body: input.body.trim(), category: input.category })
        .eq('id', id)
        .select(COLUMNS)
        .single();
      check(error, 'Update prayer');
      return parseEntry(data as Row);
    },

    async setAnswered(id: string, answered: boolean): Promise<PrayerEntry> {
      const { data, error } = await db()
        .from('prayer_entries')
        .update({ status: answered ? 'answered' : 'open', answered_at: answered ? new Date().toISOString() : null })
        .eq('id', id)
        .select(COLUMNS)
        .single();
      check(error, 'Update prayer');
      return parseEntry(data as Row);
    },

    async remove(id: string): Promise<void> {
      const { error } = await db().from('prayer_entries').delete().eq('id', id);
      check(error, 'Delete prayer');
    },

    /** Deletes every entry of the signed-in user (RLS limits it to their own rows). */
    async removeAll(userId: string): Promise<void> {
      const { error } = await db().from('prayer_entries').delete().eq('user_id', userId);
      check(error, 'Delete prayers');
    },
  };
}

/** JSON export the user can download; generated in the browser, never uploaded. */
export function exportPrayers(entries: PrayerEntry[], exportedAt = new Date()): string {
  return JSON.stringify(
    {
      app: 'THE WORD',
      kind: 'prayer-journal-export',
      exportedAt: exportedAt.toISOString(),
      entries: entries.map(({ id, ...rest }) => ({ id, ...rest })),
    },
    null,
    2,
  );
}

export const prayerService = createPrayerService();
