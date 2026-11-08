import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import fixtures from './searchNormalise.fixtures.json';
import { normaliseSearch } from '../../src/features/bible/searchNormalise';
import { createSupabaseBibleProvider, parseVersion } from '../../src/services/bible-provider/supabaseProvider';
import { BibleProviderError } from '../../src/services/bible-provider/types';
import { neighbours } from '../../src/features/bible/chapterNav';
import { getReadingPosition, saveReadingPosition } from '../../src/features/bible/readingState';

describe('search normalisation matches the Python/SQL implementation', () => {
  it.each(fixtures.map((f) => [f.input, f.expected]))('%s', (input, expected) => {
    expect(normaliseSearch(input)).toBe(expected);
  });

  it('makes the 1910 and IRV spellings of the same word identical', () => {
    // IRV writes ന്‍റ with ZWJ; the 1910 edition uses the conjunct ന്റ
    expect(normaliseSearch('തന്‍റെ')).toBe(normaliseSearch('തന്റെ'));
    // atomic chillu ൽ vs ല് + ZWJ
    expect(normaliseSearch('ഉല്‍പത്തി')).toBe(normaliseSearch('ഉൽപത്തി'));
  });
});

const VERSION_ROW = {
  id: 'v1',
  code: 'mal1910',
  language_code: 'ml',
  name: 'സത്യവേദപുസ്തകം 1910',
  short_name: 'MAL1910',
  copyright_notice: 'Copyright © 2015 The Free Bible Foundation.',
  licence: 'CC BY-SA 4.0',
  licence_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  source_url: 'https://ebible.org/mal2015/',
  attribution_required: true,
  has_deuterocanon: false,
};
const BOOK_ROWS = [
  { book_code: 'GEN', name: 'ഉല്പത്തി', long_name: null, abbreviation: null, chapter_count: 50, bible_books: { canonical_order: 2, testament: 'OT' } },
  { book_code: 'PSA', name: 'സങ്കീർത്തനങ്ങൾ', long_name: null, abbreviation: null, chapter_count: 150, bible_books: { canonical_order: 20, testament: 'OT' } },
];

/** Minimal chainable stand-in for the Supabase query builder. */
function fakeClient(tables: Record<string, { data: unknown; error: unknown }>) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const client = {
    from(table: string) {
      const result = tables[table] ?? { data: [], error: null };
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'gt', 'order', 'ilike', 'limit', 'match']) {
        builder[m] = (...args: unknown[]) => {
          calls.push({ table, method: m, args });
          return builder;
        };
      }
      builder.then = (resolve: (v: unknown) => void) => resolve(result);
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('Supabase Bible provider', () => {
  it('reports not_configured without a client', async () => {
    await expect(createSupabaseBibleProvider(null).listVersions()).rejects.toMatchObject({ code: 'not_configured' });
  });

  it('validates version rows', () => {
    expect(parseVersion(VERSION_ROW).languageCode).toBe('ml');
    expect(() => parseVersion({ ...VERSION_ROW, language_code: 'ta' })).toThrow(BibleProviderError);
    expect(() => parseVersion({ ...VERSION_ROW, copyright_notice: null })).toThrow(BibleProviderError);
  });

  it('loads a chapter and separates the psalm title from numbered verses', async () => {
    const { client } = fakeClient({
      bible_versions: { data: [VERSION_ROW], error: null },
      bible_book_names: { data: BOOK_ROWS, error: null },
      bible_verses: {
        data: [
          { verse: 0, label: '', text: 'ദാവീദിന്റെ സങ്കീർത്തനം.' },
          { verse: 1, label: '1', text: 'വാക്യം ഒന്ന്' },
          { verse: 2, label: '2-3', text: 'വാക്യം രണ്ട്' },
        ],
        error: null,
      },
    });
    const chapter = await createSupabaseBibleProvider(client).getChapter('mal1910', 'PSA', 3);
    expect(chapter.title).toBe('ദാവീദിന്റെ സങ്കീർത്തനം.');
    expect(chapter.verses.map((v) => v.label)).toEqual(['1', '2-3']);
    expect(chapter.version.copyrightNotice).toMatch(/Free Bible Foundation/);
  });

  it('rejects unknown versions, books and out-of-range chapters (no substitution)', async () => {
    const { client } = fakeClient({
      bible_versions: { data: [VERSION_ROW], error: null },
      bible_book_names: { data: BOOK_ROWS, error: null },
    });
    const p = createSupabaseBibleProvider(client);
    await expect(p.getChapter('kjv', 'GEN', 1)).rejects.toMatchObject({ code: 'not_found' });
    await expect(p.getChapter('mal1910', 'TOB', 1)).rejects.toMatchObject({ code: 'not_found' });
    await expect(p.getChapter('mal1910', 'GEN', 51)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('maps database errors to unavailable', async () => {
    const { client } = fakeClient({ bible_versions: { data: null, error: { message: 'down' } } });
    await expect(createSupabaseBibleProvider(client).listVersions()).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('searches normalised words, escapes wildcards and sorts in canonical order', async () => {
    const { client, calls } = fakeClient({
      bible_book_names: { data: BOOK_ROWS, error: null },
      bible_verses: {
        data: [
          { book_code: 'PSA', chapter: 1, verse: 1, label: '1', text: 'b' },
          { book_code: 'GEN', chapter: 1, verse: 3, label: '3', text: 'a' },
        ],
        error: null,
      },
    });
    const result = await createSupabaseBibleProvider(client).search('v1', ' Light, 100%_ ');
    expect(result.hits.map((h) => h.bookCode)).toEqual(['GEN', 'PSA']);
    const ilikes = calls.filter((c) => c.method === 'ilike').map((c) => c.args[1]);
    expect(ilikes).toEqual(['%light%', '%100%', '%\\_%']); // % is punctuation and dropped; _ is escaped
  });

  it('refuses one-letter searches', async () => {
    const { client } = fakeClient({});
    await expect(createSupabaseBibleProvider(client).search('v1', 'a')).rejects.toMatchObject({ code: 'invalid_query' });
  });
});

describe('chapter navigation', () => {
  const books = [
    { code: 'GEN', order: 2, testament: 'OT' as const, name: 'Genesis', longName: null, abbreviation: null, chapterCount: 50 },
    { code: 'EXO', order: 3, testament: 'OT' as const, name: 'Exodus', longName: null, abbreviation: null, chapterCount: 40 },
  ];
  it('crosses book boundaries', () => {
    expect(neighbours(books, books[0], 50).next).toEqual({ book: books[1], chapter: 1 });
    expect(neighbours(books, books[1], 1).prev).toEqual({ book: books[0], chapter: 50 });
  });
  it('stops at the ends', () => {
    expect(neighbours(books, books[0], 1).prev).toBeNull();
    expect(neighbours(books, books[1], 40).next).toBeNull();
  });
});

describe('reading position', () => {
  it('round-trips and rejects corrupt values', () => {
    saveReadingPosition({ versionCode: 'kjv', bookCode: 'JHN', chapter: 3, bookName: 'John' });
    expect(getReadingPosition()).toEqual({ versionCode: 'kjv', bookCode: 'JHN', chapter: 3, bookName: 'John' });
    window.localStorage.setItem('theword.reading.position', '{"versionCode":"kjv","bookCode":"<script>","chapter":3}');
    expect(getReadingPosition()).toBeNull();
    vi.restoreAllMocks();
  });
});
