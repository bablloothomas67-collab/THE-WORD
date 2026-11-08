import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../supabase/client';
import { isEnabledLanguage } from '../../config/languages';
import { normaliseSearch } from '../../features/bible/searchNormalise';
import {
  BibleProviderError,
  SEARCH_MIN_LENGTH,
  SEARCH_RESULT_CAP,
  type BibleBook,
  type BiblePassage,
  type BibleChapter,
  type BibleProvider,
  type BibleVersion,
  type SearchHit,
  type Testament,
} from './types';

/**
 * Reads licensed Bible text stored in Supabase (public, read-only, RLS:
 * enabled versions only). Every row is validated before the UI sees it.
 */

type Row = Record<string, unknown>;

function str(r: Row, k: string): string {
  const v = r[k];
  if (typeof v !== 'string') throw new BibleProviderError('unavailable', `Field ${k} missing`);
  return v;
}
function optStr(r: Row, k: string): string | null {
  const v = r[k];
  return typeof v === 'string' ? v : null;
}
function num(r: Row, k: string): number {
  const v = r[k];
  if (typeof v !== 'number') throw new BibleProviderError('unavailable', `Field ${k} missing`);
  return v;
}

export function parseVersion(r: Row): BibleVersion {
  const lang = str(r, 'language_code');
  if (!isEnabledLanguage(lang)) throw new BibleProviderError('unavailable', `Language ${lang} not enabled`);
  return {
    id: str(r, 'id'),
    code: str(r, 'code'),
    languageCode: lang,
    name: str(r, 'name'),
    shortName: str(r, 'short_name'),
    copyrightNotice: str(r, 'copyright_notice'),
    licence: str(r, 'licence'),
    licenceUrl: optStr(r, 'licence_url'),
    sourceUrl: optStr(r, 'source_url'),
    attributionRequired: r.attribution_required === true,
    hasDeuterocanon: r.has_deuterocanon === true,
  };
}

export function parseBook(r: Row): BibleBook {
  const meta = r.bible_books as Row | null;
  if (!meta) throw new BibleProviderError('unavailable', 'Book metadata missing');
  const testament = str(meta, 'testament');
  if (testament !== 'OT' && testament !== 'NT' && testament !== 'DC') {
    throw new BibleProviderError('unavailable', 'Bad testament');
  }
  return {
    code: str(r, 'book_code'),
    order: num(meta, 'canonical_order'),
    testament: testament as Testament,
    name: str(r, 'name'),
    longName: optStr(r, 'long_name'),
    abbreviation: optStr(r, 'abbreviation'),
    chapterCount: num(r, 'chapter_count'),
  };
}

/** Escapes LIKE wildcards so user input is matched literally. */
function likeEscape(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const VERSION_COLUMNS =
  'id, code, language_code, name, short_name, copyright_notice, licence, licence_url, source_url, attribution_required, has_deuterocanon, sort_order';

export function createSupabaseBibleProvider(client: SupabaseClient | null = defaultClient): BibleProvider {
  let versionsCache: Promise<BibleVersion[]> | null = null;
  const booksCache = new Map<string, Promise<BibleBook[]>>();

  function requireClient(): SupabaseClient {
    if (!client) throw new BibleProviderError('not_configured');
    return client;
  }

  async function listVersions(): Promise<BibleVersion[]> {
    if (!versionsCache) {
      versionsCache = (async () => {
        const { data, error } = await requireClient()
          .from('bible_versions')
          .select(VERSION_COLUMNS)
          .order('sort_order');
        if (error) throw new BibleProviderError('unavailable', error.message);
        return (data ?? []).map((r) => parseVersion(r as Row));
      })();
      versionsCache.catch(() => {
        versionsCache = null; // allow retry after a failure
      });
    }
    return versionsCache;
  }

  async function listBooks(versionId: string): Promise<BibleBook[]> {
    let cached = booksCache.get(versionId);
    if (!cached) {
      cached = (async () => {
        const { data, error } = await requireClient()
          .from('bible_book_names')
          .select('book_code, name, long_name, abbreviation, chapter_count, bible_books(canonical_order, testament)')
          .eq('version_id', versionId);
        if (error) throw new BibleProviderError('unavailable', error.message);
        return (data ?? []).map((r) => parseBook(r as Row)).sort((a, b) => a.order - b.order);
      })();
      booksCache.set(versionId, cached);
      cached.catch(() => booksCache.delete(versionId));
    }
    return cached;
  }

  async function getChapter(versionCode: string, bookCode: string, chapter: number): Promise<BibleChapter> {
    const version = (await listVersions()).find((v) => v.code === versionCode);
    if (!version) throw new BibleProviderError('not_found', `Version ${versionCode}`);
    const book = (await listBooks(version.id)).find((b) => b.code === bookCode);
    if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) {
      throw new BibleProviderError('not_found', `${bookCode} ${chapter}`);
    }
    const { data, error } = await requireClient()
      .from('bible_verses')
      .select('verse, label, text')
      .eq('version_id', version.id)
      .eq('book_code', bookCode)
      .eq('chapter', chapter)
      .order('verse');
    if (error) throw new BibleProviderError('unavailable', error.message);
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) throw new BibleProviderError('not_found', `${bookCode} ${chapter}`);
    const titleRow = rows.find((r) => r.verse === 0);
    return {
      version,
      book,
      chapter,
      title: titleRow ? str(titleRow, 'text') : null,
      verses: rows
        .filter((r) => r.verse !== 0)
        .map((r) => ({ verse: num(r, 'verse'), label: str(r, 'label') || String(r.verse), text: str(r, 'text') })),
    };
  }

  async function search(versionId: string, query: string): Promise<{ hits: SearchHit[]; truncated: boolean }> {
    const terms = normaliseSearch(query).split(' ').filter(Boolean);
    if (terms.join('').length < SEARCH_MIN_LENGTH) throw new BibleProviderError('invalid_query');
    let q = requireClient()
      .from('bible_verses')
      .select('book_code, chapter, verse, label, text')
      .eq('version_id', versionId)
      .gt('verse', 0);
    for (const term of terms.slice(0, 6)) q = q.ilike('search_text', `%${likeEscape(term)}%`);
    const { data, error } = await q.limit(SEARCH_RESULT_CAP + 1);
    if (error) throw new BibleProviderError('unavailable', error.message);
    const books = await listBooks(versionId);
    const order = new Map(books.map((b) => [b.code, b.order]));
    const hits = ((data ?? []) as Row[])
      .map((r) => ({
        bookCode: str(r, 'book_code'),
        chapter: num(r, 'chapter'),
        verse: num(r, 'verse'),
        label: str(r, 'label') || String(r.verse),
        text: str(r, 'text'),
      }))
      .sort(
        (a, b) =>
          (order.get(a.bookCode) ?? 0) - (order.get(b.bookCode) ?? 0) || a.chapter - b.chapter || a.verse - b.verse,
      );
    return { hits: hits.slice(0, SEARCH_RESULT_CAP), truncated: hits.length > SEARCH_RESULT_CAP };
  }

  async function getPassage(
    versionCode: string,
    bookCode: string,
    chapter: number,
    start: number,
    end: number,
  ): Promise<BiblePassage> {
    const version = (await listVersions()).find((v) => v.code === versionCode);
    if (!version) throw new BibleProviderError('not_found', `Version ${versionCode}`);
    const book = (await listBooks(version.id)).find((b) => b.code === bookCode);
    if (!book || start < 1 || end < start || end - start > 30) throw new BibleProviderError('not_found');
    const { data, error } = await requireClient()
      .from('bible_verses')
      .select('verse, label, text')
      .eq('version_id', version.id)
      .eq('book_code', bookCode)
      .eq('chapter', chapter)
      .gte('verse', start)
      .lte('verse', end)
      .order('verse');
    if (error) throw new BibleProviderError('unavailable', error.message);
    const verses = ((data ?? []) as Row[]).map((r) => ({
      verse: num(r, 'verse'),
      label: str(r, 'label') || String(r.verse),
      text: str(r, 'text'),
    }));
    // Every requested verse must exist — never show a partial passage silently.
    if (verses.length !== end - start + 1) throw new BibleProviderError('not_found', `${bookCode} ${chapter}:${start}-${end}`);
    return { version, book, chapter, verses };
  }

  return { listVersions, listBooks, getChapter, search, getPassage };
}

export const bibleProvider = createSupabaseBibleProvider();
