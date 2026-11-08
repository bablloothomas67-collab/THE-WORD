import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import { isEnabledLanguage, type LanguageCode } from '../../config/languages';

/**
 * Private study tools. Every table is owner-only under Row Level Security;
 * user_id defaults to auth.uid() on the server, so the client never sends it.
 */
export const HIGHLIGHT_COLOURS = ['gold', 'blue', 'green', 'rose'] as const;
export type HighlightColour = (typeof HIGHLIGHT_COLOURS)[number];
export const MAX_NOTE_LENGTH = 5000;

export interface VerseRef {
  versionId: string;
  bookCode: string;
  chapter: number;
  verse: number;
}

export interface ChapterAnnotations {
  bookmarks: Set<number>;
  highlights: Map<number, HighlightColour>;
  notes: Map<number, string>;
}

export type StudyKind = 'bookmarks' | 'highlights' | 'study_notes';

export interface StudyItem extends VerseRef {
  id: string;
  kind: StudyKind;
  createdAt: string;
  colour?: HighlightColour;
  note?: string;
  verseLabel: string;
  verseText: string;
}

type Row = Record<string, unknown>;

function isColour(v: unknown): v is HighlightColour {
  return typeof v === 'string' && (HIGHLIGHT_COLOURS as readonly string[]).includes(v);
}

function refFilter(ref: VerseRef) {
  return {
    version_id: ref.versionId,
    book_code: ref.bookCode,
    chapter: ref.chapter,
    verse: ref.verse,
  };
}

export function createStudyService(client: SupabaseClient | null = defaultClient) {
  function db(): SupabaseClient {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  }
  function check(error: { message: string } | null, what: string) {
    if (error) throw new Error(`${what}: ${error.message}`);
  }

  return {
    async getChapterAnnotations(versionId: string, bookCode: string, chapter: number): Promise<ChapterAnnotations> {
      const where = { version_id: versionId, book_code: bookCode, chapter };
      const [b, h, n] = await Promise.all([
        db().from('bookmarks').select('verse').match(where),
        db().from('highlights').select('verse, colour_key').match(where),
        db().from('study_notes').select('verse, note_text').match(where),
      ]);
      check(b.error, 'Load bookmarks');
      check(h.error, 'Load highlights');
      check(n.error, 'Load notes');
      const result: ChapterAnnotations = { bookmarks: new Set(), highlights: new Map(), notes: new Map() };
      for (const r of (b.data ?? []) as Row[]) if (typeof r.verse === 'number') result.bookmarks.add(r.verse);
      for (const r of (h.data ?? []) as Row[])
        if (typeof r.verse === 'number' && isColour(r.colour_key)) result.highlights.set(r.verse, r.colour_key);
      for (const r of (n.data ?? []) as Row[])
        if (typeof r.verse === 'number' && typeof r.note_text === 'string') result.notes.set(r.verse, r.note_text);
      return result;
    },

    async setBookmark(ref: VerseRef, on: boolean): Promise<void> {
      if (on) {
        const { error } = await db()
          .from('bookmarks')
          .upsert(refFilter(ref), { onConflict: 'user_id,version_id,book_code,chapter,verse', ignoreDuplicates: true });
        check(error, 'Save bookmark');
      } else {
        const { error } = await db().from('bookmarks').delete().match(refFilter(ref));
        check(error, 'Remove bookmark');
      }
    },

    async setHighlight(ref: VerseRef, colour: HighlightColour | null): Promise<void> {
      if (colour === null) {
        const { error } = await db().from('highlights').delete().match(refFilter(ref));
        check(error, 'Remove highlight');
        return;
      }
      if (!isColour(colour)) throw new Error('Invalid highlight colour');
      const existing = await db().from('highlights').select('id').match(refFilter(ref)).maybeSingle();
      check(existing.error, 'Load highlight');
      const { error } = existing.data
        ? await db().from('highlights').update({ colour_key: colour }).match(refFilter(ref))
        : await db().from('highlights').insert({ ...refFilter(ref), colour_key: colour });
      check(error, 'Save highlight');
    },

    async saveNote(ref: VerseRef, text: string, language: LanguageCode): Promise<void> {
      const note = text.trim();
      if (!note) {
        const { error } = await db().from('study_notes').delete().match(refFilter(ref));
        check(error, 'Remove note');
        return;
      }
      if (note.length > MAX_NOTE_LENGTH) throw new Error('Note too long');
      const lang = isEnabledLanguage(language) ? language : 'en';
      const existing = await db().from('study_notes').select('id').match(refFilter(ref)).maybeSingle();
      check(existing.error, 'Load note');
      const { error } = existing.data
        ? await db().from('study_notes').update({ note_text: note, language_code: lang }).match(refFilter(ref))
        : await db().from('study_notes').insert({ ...refFilter(ref), note_text: note, language_code: lang });
      check(error, 'Save note');
    },

    /** Most recent items of one kind, with the verse text (via the composite foreign key). */
    async listRecent(kind: StudyKind, limit = 50): Promise<StudyItem[]> {
      const extra = kind === 'highlights' ? ', colour_key' : kind === 'study_notes' ? ', note_text' : '';
      const orderBy = kind === 'study_notes' ? 'updated_at' : 'created_at';
      const { data, error } = await db()
        .from(kind)
        .select(`id, version_id, book_code, chapter, verse, created_at${extra}, bible_verses(label, text)`)
        .order(orderBy, { ascending: false })
        .limit(limit);
      check(error, `Load ${kind}`);
      return ((data ?? []) as unknown as Row[]).flatMap((r) => {
        const v = r.bible_verses as Row | null;
        if (!v || typeof r.id !== 'string') return [];
        return [
          {
            id: r.id,
            kind,
            versionId: String(r.version_id),
            bookCode: String(r.book_code),
            chapter: Number(r.chapter),
            verse: Number(r.verse),
            createdAt: String(r.created_at),
            colour: isColour(r.colour_key) ? r.colour_key : undefined,
            note: typeof r.note_text === 'string' ? r.note_text : undefined,
            verseLabel: typeof v.label === 'string' && v.label ? v.label : String(r.verse),
            verseText: typeof v.text === 'string' ? v.text : '',
          },
        ];
      });
    },
  };
}

export type StudyService = ReturnType<typeof createStudyService>;
export const studyService = createStudyService();
