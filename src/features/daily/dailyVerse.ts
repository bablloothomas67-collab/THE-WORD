import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';

export interface DailyVerseRef {
  position: number;
  bookCode: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

/** Whole days since 1 Jan 2026 in the reader's local calendar. */
export function localDayNumber(date: Date): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((local - Date.UTC(2026, 0, 1)) / 86_400_000);
}

/** Same verse for everyone on the same local date; cycles through the approved list. */
export function pickDailyRef(refs: DailyVerseRef[], date: Date): DailyVerseRef | undefined {
  if (refs.length === 0) return undefined;
  const sorted = [...refs].sort((a, b) => a.position - b.position);
  const n = sorted.length;
  return sorted[((localDayNumber(date) % n) + n) % n];
}

export function createDailyVerseService(client: SupabaseClient | null = defaultClient) {
  let cache: Promise<DailyVerseRef[]> | null = null;
  return {
    async listApproved(): Promise<DailyVerseRef[]> {
      if (!client) throw new Error('Supabase is not configured');
      if (!cache) {
        cache = (async () => {
          const { data, error } = await client
            .from('daily_verse_refs')
            .select('position, book_code, chapter, verse_start, verse_end')
            .order('position');
          if (error) throw new Error(`Load daily verses: ${error.message}`);
          return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
            position: Number(r.position),
            bookCode: String(r.book_code),
            chapter: Number(r.chapter),
            verseStart: Number(r.verse_start),
            verseEnd: Number(r.verse_end),
          }));
        })();
        cache.catch(() => (cache = null));
      }
      return cache;
    },
  };
}

export const dailyVerseService = createDailyVerseService();
