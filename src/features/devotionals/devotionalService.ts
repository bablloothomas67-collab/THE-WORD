import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import type { LanguageCode } from '../../config/languages';

/**
 * Devotionals are original writing by THE WORD editorial team. Only published,
 * approved localisations are readable (enforced by RLS). Bible passages are
 * stored as references and shown live from the Bible text, never copied in.
 */
export interface ScriptureRef {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

export interface Devotional {
  slug: string;
  publicationDate: string;
  authorLabel: string;
  reviewerLabel: string | null;
  title: string;
  scriptureRefs: ScriptureRef[];
  reflection: string;
  application: string;
  questions: string[];
  prayer: string;
}

type Row = Record<string, unknown>;

/**
 * Devotional audio is free for seven days from publication (the same rule the
 * database applies); earlier devotionals' audio is part of Premium.
 */
export function isCurrentWeek(publicationDate: string, today = new Date()): boolean {
  const published = Date.parse(`${publicationDate}T00:00:00Z`);
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Number.isFinite(published) && published >= utcToday - 6 * 86_400_000;
}

export function parseRefs(v: unknown): ScriptureRef[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((r) => {
    const o = r as Row;
    const ref = {
      book: String(o.book ?? ''),
      chapter: Number(o.chapter),
      verseStart: Number(o.verse_start),
      verseEnd: Number(o.verse_end ?? o.verse_start),
    };
    return /^[A-Z0-9]{3}$/.test(ref.book) && ref.chapter > 0 && ref.verseStart > 0 && ref.verseEnd >= ref.verseStart
      ? [ref]
      : [];
  });
}

function parse(r: Row, loc: Row): Devotional {
  return {
    slug: String(r.slug),
    publicationDate: String(r.publication_date),
    authorLabel: String(r.author_label),
    reviewerLabel: typeof r.reviewer_label === 'string' ? r.reviewer_label : null,
    title: String(loc.title),
    scriptureRefs: parseRefs(loc.scripture_refs),
    reflection: String(loc.reflection),
    application: String(loc.application_text),
    questions: Array.isArray(loc.reflection_questions) ? loc.reflection_questions.map(String) : [],
    prayer: String(loc.prayer_text),
  };
}

const COLUMNS =
  'slug, publication_date, author_label, reviewer_label, devotional_localisations!inner(language_code, title, scripture_refs, reflection, application_text, reflection_questions, prayer_text)';

export function createDevotionalService(client: SupabaseClient | null = defaultClient) {
  function db(): SupabaseClient {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  }

  return {
    /** Published devotionals that exist in the given language, newest first. */
    async list(lang: LanguageCode, limit = 30): Promise<Devotional[]> {
      const { data, error } = await db()
        .from('devotionals')
        .select(COLUMNS)
        .eq('devotional_localisations.language_code', lang)
        .order('publication_date', { ascending: false })
        .limit(limit);
      if (error) throw new Error(`Load devotionals: ${error.message}`);
      return ((data ?? []) as Row[]).flatMap((r) => {
        const loc = ((r.devotional_localisations as Row[]) ?? [])[0];
        return loc ? [parse(r, loc)] : [];
      });
    },

    async get(slug: string, lang: LanguageCode): Promise<Devotional | null> {
      const { data, error } = await db()
        .from('devotionals')
        .select(COLUMNS)
        .eq('slug', slug)
        .eq('devotional_localisations.language_code', lang)
        .maybeSingle();
      if (error) throw new Error(`Load devotional: ${error.message}`);
      if (!data) return null;
      const loc = (((data as Row).devotional_localisations as Row[]) ?? [])[0];
      return loc ? parse(data as Row, loc) : null;
    },
  };
}

export const devotionalService = createDevotionalService();
