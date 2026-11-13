import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  contentPath,
  createContentService,
  kindOfSection,
  parseQuestions,
  parseSections,
  parseSources,
  scoreQuiz,
  sectionOfKind,
  SECTIONS,
} from '../../src/features/discover/contentService';
import { splitAnswer } from '../../src/features/ask/answerParts';

describe('discover sections and paths', () => {
  it('maps URL sections to content kinds and back', () => {
    expect(SECTIONS.map(kindOfSection)).toEqual(['story', 'history', 'theology', 'apologetics', 'quiz']);
    expect(kindOfSection('nonsense')).toBeNull();
    expect(kindOfSection(undefined)).toBeNull();
    expect(sectionOfKind('quiz')).toBe('quizzes');
    expect(contentPath('story', 'creation')).toBe('/discover/stories/creation');
  });
});

describe('content parsing', () => {
  it('keeps only sections with a body', () => {
    expect(parseSections([{ heading: 'A', body: 'text' }, { heading: 'B', body: ' ' }, { body: 'no heading' }, null, 'x'])).toEqual([
      { heading: 'A', body: 'text' },
      { heading: '', body: 'no heading' },
    ]);
    expect(parseSections('nope')).toEqual([]);
  });

  it('drops malformed quiz questions instead of showing a wrong answer key', () => {
    const good = { prompt: 'Q?', options: ['a', 'b', 'c', 'd'], correct: 2, explanation: 'because', ref: { book: 'GEN', chapter: 1, verse_start: 1, verse_end: 1 } };
    const parsed = parseQuestions([
      good,
      { ...good, correct: 4 },
      { ...good, correct: 1.5 },
      { ...good, options: ['only one'] },
      { ...good, options: ['a', 2, 'c', 'd'] },
      { ...good, prompt: undefined },
      { ...good, ref: { book: 'genesis', chapter: 1, verse_start: 1 } },
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ correct: 2, ref: { book: 'GEN', chapter: 1, verseStart: 1, verseEnd: 1 } });
    expect(parsed[1].ref).toBeNull();
  });

  it('only ever turns plain https addresses into links', () => {
    expect(
      parseSources([
        { label: 'Book', url: null },
        { label: 'Site', url: 'https://example.org/a' },
        { label: 'Script', url: 'javascript:alert(1)' },
        { label: 'Plain', url: 'http://example.org' },
        { label: ' ' },
      ]),
    ).toEqual([
      { label: 'Book', url: null },
      { label: 'Site', url: 'https://example.org/a' },
      { label: 'Script', url: null },
      { label: 'Plain', url: null },
    ]);
  });

  it('scores a quiz; unanswered questions count as wrong', () => {
    const qs = parseQuestions([0, 1, 2].map((correct) => ({ prompt: 'Q', options: ['a', 'b', 'c'], correct, explanation: '' })));
    expect(scoreQuiz(qs, [0, 1, 2])).toBe(3);
    expect(scoreQuiz(qs, [0, null, 1])).toBe(1);
    expect(scoreQuiz(qs, [])).toBe(0);
  });
});

describe('content service', () => {
  function clientReturning(result: unknown) {
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'delete', 'upsert']) builder[m] = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(() => Promise.resolve(result));
    builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    const from = vi.fn(() => builder);
    return { client: { from } as unknown as SupabaseClient, builder, from };
  }

  it('lists published items and skips rows with an unknown kind or no text', async () => {
    const { client, builder } = clientReturning({
      data: [
        { id: '1', slug: 'creation', kind: 'story', content_localisations: [{ title: 'Creation', summary: 'S' }] },
        { id: '2', slug: 'x', kind: 'video', content_localisations: [{ title: 'X', summary: '' }] },
        { id: '3', slug: 'y', kind: 'history', content_localisations: [] },
      ],
      error: null,
    });
    const list = await createContentService(client).list('ml', 'story');
    expect(list).toEqual([{ id: '1', slug: 'creation', kind: 'story', title: 'Creation', summary: 'S' }]);
    expect(builder.eq).toHaveBeenCalledWith('content_localisations.language_code', 'ml');
    expect(builder.eq).toHaveBeenCalledWith('kind', 'story');
  });

  it('returns null when an item has no text in the chosen language, and surfaces errors', async () => {
    expect(await createContentService(clientReturning({ data: null, error: null }).client).get('creation', 'en')).toBeNull();
    await expect(createContentService(clientReturning({ data: null, error: { message: 'boom' } }).client).list('en')).rejects.toThrow('boom');
    await expect(createContentService(null).list('en')).rejects.toThrow('not configured');
  });

  it('records a quiz result without sending a user id (the server sets it)', async () => {
    const { client, builder, from } = clientReturning({ error: null });
    await createContentService(client).recordAttempt('c1', 7, 10);
    expect(from).toHaveBeenCalledWith('quiz_attempts');
    expect(builder.insert).toHaveBeenCalledWith({ content_id: 'c1', score: 7, total: 10 });
  });
});

/** The drafted starter content must stay well-formed in both languages. */
describe('starter content files', () => {
  type Loc = { title: string; summary: string; sections?: { heading: string; body: string }[]; questions?: { prompt: string; options: string[]; explanation: string }[] };
  type Item = { slug: string; kind: string; scripture_refs?: unknown[]; answers?: { correct: number; ref: unknown }[]; sources?: unknown[]; en: Loc; ml: Loc };
  const dir = join(process.cwd(), 'content', 'discover');
  const items = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')) as Item[]);

  it('has the agreed starter set with unique slugs', () => {
    const count = (kind: string) => items.filter((i) => i.kind === kind).length;
    expect([count('story'), count('history'), count('theology'), count('apologetics'), count('quiz')]).toEqual([6, 6, 6, 6, 5]);
    expect(new Set(items.map((i) => i.slug)).size).toBe(items.length);
  });

  it('cites only listed references, identically in English and Malayalam', () => {
    for (const item of items.filter((i) => i.kind !== 'quiz')) {
      const refCount = item.scripture_refs!.length;
      expect(item.en.sections!.length, item.slug).toBe(item.ml.sections!.length);
      for (const lang of ['en', 'ml'] as const) {
        const cited = new Set<number>();
        for (const s of item[lang].sections!) {
          for (const m of s.body.matchAll(/\[\[(\d+)\]\]/g)) cited.add(Number(m[1]));
          // every marker resolves to a reference when rendered
          expect(splitAnswer(s.body, refCount).filter((p) => p.kind === 'ref').length, `${item.slug} ${lang}`).toBe(
            [...s.body.matchAll(/\[\[\d+\]\]/g)].length,
          );
        }
        expect([...cited].sort((a, b) => a - b), `${item.slug} ${lang}`).toEqual(Array.from({ length: refCount }, (_, i) => i + 1));
      }
    }
  });

  it('gives every quiz ten four-option questions with one answer key for both languages', () => {
    for (const quiz of items.filter((i) => i.kind === 'quiz')) {
      expect(quiz.answers, quiz.slug).toHaveLength(10);
      for (const lang of ['en', 'ml'] as const) {
        expect(quiz[lang].questions, `${quiz.slug} ${lang}`).toHaveLength(10);
        const merged = quiz[lang].questions!.map((q, i) => ({ ...q, ...quiz.answers![i] }));
        expect(parseQuestions(merged), `${quiz.slug} ${lang}`).toHaveLength(10);
        for (const q of quiz[lang].questions!) expect(new Set(q.options).size, `${quiz.slug} ${lang} ${q.prompt}`).toBe(4);
      }
    }
  });

  it('lists sources for history, theology and apologetics', () => {
    for (const item of items.filter((i) => ['history', 'theology', 'apologetics'].includes(i.kind))) {
      expect(item.sources!.length, item.slug).toBeGreaterThan(0);
    }
  });
});
