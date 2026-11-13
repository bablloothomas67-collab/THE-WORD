import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import type { LanguageCode } from '../../config/languages';
import { parseRefs, type ScriptureRef } from '../devotionals/devotionalService';

/**
 * Discover: original educational writing (stories, history, theology, apologetics)
 * and quizzes. Only published items with an approved localisation are readable
 * (enforced by RLS). Scripture is stored as references and shown from the Bible text.
 */
export const CONTENT_KINDS = ['story', 'history', 'theology', 'apologetics', 'quiz'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** URL segment and translation key for each kind. */
export const SECTIONS = ['stories', 'history', 'theology', 'apologetics', 'quizzes'] as const;
export type Section = (typeof SECTIONS)[number];
const SECTION_KIND: Record<Section, ContentKind> = {
  stories: 'story',
  history: 'history',
  theology: 'theology',
  apologetics: 'apologetics',
  quizzes: 'quiz',
};

export function kindOfSection(section: string | undefined): ContentKind | null {
  return section && section in SECTION_KIND ? SECTION_KIND[section as Section] : null;
}
export function sectionOfKind(kind: ContentKind): Section {
  return SECTIONS.find((s) => SECTION_KIND[s] === kind)!;
}
export function contentPath(kind: ContentKind, slug: string): string {
  return `/discover/${sectionOfKind(kind)}/${slug}`;
}

export interface ContentSummary {
  id: string;
  slug: string;
  kind: ContentKind;
  title: string;
  summary: string;
}

export interface ArticleSection {
  heading: string;
  body: string;
}

export interface QuizQuestion {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  ref: ScriptureRef | null;
}

export interface ContentSource {
  label: string;
  url: string | null;
}

export interface ContentItem extends ContentSummary {
  sections: ArticleSection[];
  questions: QuizQuestion[];
  scriptureRefs: ScriptureRef[];
  sources: ContentSource[];
  authorLabel: string;
  reviewerLabel: string | null;
}

export interface QuizBest {
  score: number;
  total: number;
}

type Row = Record<string, unknown>;

function isKind(v: unknown): v is ContentKind {
  return typeof v === 'string' && (CONTENT_KINDS as readonly string[]).includes(v);
}

export function parseSections(v: unknown): ArticleSection[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((s) => {
    const o = (s ?? {}) as Row;
    return typeof o.body === 'string' && o.body.trim()
      ? [{ heading: typeof o.heading === 'string' ? o.heading : '', body: o.body }]
      : [];
  });
}

/** Malformed questions are dropped rather than shown with a wrong "correct" answer. */
export function parseQuestions(v: unknown): QuizQuestion[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((q) => {
    const o = (q ?? {}) as Row;
    const options = Array.isArray(o.options) ? o.options.filter((x): x is string => typeof x === 'string') : [];
    const correct = Number(o.correct);
    const valid =
      typeof o.prompt === 'string' &&
      Array.isArray(o.options) &&
      options.length === o.options.length &&
      options.length >= 2 &&
      options.length <= 6 &&
      Number.isInteger(correct) &&
      correct >= 0 &&
      correct < options.length;
    if (!valid) return [];
    return [
      {
        prompt: o.prompt as string,
        options,
        correct,
        explanation: typeof o.explanation === 'string' ? o.explanation : '',
        ref: parseRefs(o.ref ? [o.ref] : [])[0] ?? null,
      },
    ];
  });
}

export function parseSources(v: unknown): ContentSource[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((s) => {
    const o = (s ?? {}) as Row;
    if (typeof o.label !== 'string' || !o.label.trim()) return [];
    // Only plain https links are ever rendered as links.
    const url = typeof o.url === 'string' && /^https:\/\/[^\s"<>]+$/.test(o.url) ? o.url : null;
    return [{ label: o.label, url }];
  });
}

/** Number of questions answered correctly; unanswered questions count as wrong. */
export function scoreQuiz(questions: QuizQuestion[], answers: ReadonlyArray<number | null | undefined>): number {
  return questions.reduce((n, q, i) => n + (answers[i] === q.correct ? 1 : 0), 0);
}

function summary(r: Row, loc: Row): ContentSummary | null {
  if (!isKind(r.kind)) return null;
  return { id: String(r.id), slug: String(r.slug), kind: r.kind, title: String(loc.title), summary: String(loc.summary ?? '') };
}

const LIST_COLUMNS = 'id, slug, kind, sort_order, content_localisations!inner(language_code, title, summary)';
const FULL_COLUMNS =
  'id, slug, kind, author_label, reviewer_label, content_localisations!inner(language_code, title, summary, sections, questions, scripture_refs, sources)';

function firstLoc(r: Row): Row | undefined {
  return ((r.content_localisations as Row[]) ?? [])[0];
}

export function createContentService(client: SupabaseClient | null = defaultClient) {
  function db(): SupabaseClient {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  }

  return {
    /** Published items available in this language, in editorial order. */
    async list(lang: LanguageCode, kind?: ContentKind): Promise<ContentSummary[]> {
      let q = db().from('content_items').select(LIST_COLUMNS).eq('content_localisations.language_code', lang);
      if (kind) q = q.eq('kind', kind);
      const { data, error } = await q.order('sort_order').order('slug').limit(500);
      if (error) throw new Error(`Load content: ${error.message}`);
      return ((data ?? []) as Row[]).flatMap((r) => {
        const loc = firstLoc(r);
        const s = loc ? summary(r, loc) : null;
        return s ? [s] : [];
      });
    },

    async get(slug: string, lang: LanguageCode): Promise<ContentItem | null> {
      const { data, error } = await db()
        .from('content_items')
        .select(FULL_COLUMNS)
        .eq('slug', slug)
        .eq('content_localisations.language_code', lang)
        .maybeSingle();
      if (error) throw new Error(`Load content item: ${error.message}`);
      if (!data) return null;
      const r = data as Row;
      const loc = firstLoc(r);
      const s = loc ? summary(r, loc) : null;
      if (!loc || !s) return null;
      return {
        ...s,
        sections: parseSections(loc.sections),
        questions: parseQuestions(loc.questions),
        scriptureRefs: parseRefs(loc.scripture_refs),
        sources: parseSources(loc.sources),
        authorLabel: String(r.author_label ?? ''),
        reviewerLabel: typeof r.reviewer_label === 'string' ? r.reviewer_label : null,
      };
    },

    /** Items the signed-in user saved, newest first, in this language. */
    async listSaved(lang: LanguageCode): Promise<ContentSummary[]> {
      const { data, error } = await db()
        .from('saved_content')
        .select(`created_at, content_items!inner(${LIST_COLUMNS})`)
        .eq('content_items.content_localisations.language_code', lang)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(`Load saved content: ${error.message}`);
      return ((data ?? []) as Row[]).flatMap((row) => {
        const r = row.content_items as Row | null;
        const loc = r ? firstLoc(r) : undefined;
        const s = r && loc ? summary(r, loc) : null;
        return s ? [s] : [];
      });
    },

    async isSaved(contentId: string): Promise<boolean> {
      const { data, error } = await db().from('saved_content').select('content_id').eq('content_id', contentId).maybeSingle();
      if (error) throw new Error(`Check saved content: ${error.message}`);
      return Boolean(data);
    },

    async save(contentId: string): Promise<void> {
      const { error } = await db().from('saved_content').upsert({ content_id: contentId }, { onConflict: 'user_id,content_id', ignoreDuplicates: true });
      if (error) throw new Error(`Save content: ${error.message}`);
    },

    async unsave(contentId: string): Promise<void> {
      const { error } = await db().from('saved_content').delete().eq('content_id', contentId);
      if (error) throw new Error(`Remove saved content: ${error.message}`);
    },

    async recordAttempt(contentId: string, score: number, total: number): Promise<void> {
      const { error } = await db().from('quiz_attempts').insert({ content_id: contentId, score, total });
      if (error) throw new Error(`Save quiz result: ${error.message}`);
    },

    /** The signed-in user's best result for one quiz, or null if never taken. */
    async bestAttempt(contentId: string): Promise<QuizBest | null> {
      const { data, error } = await db()
        .from('quiz_attempts')
        .select('score, total')
        .eq('content_id', contentId)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`Load quiz results: ${error.message}`);
      return data ? { score: Number((data as Row).score), total: Number((data as Row).total) } : null;
    },
  };
}

export const contentService = createContentService();
