import { describe, expect, it } from 'vitest';
import {
  answerSchema,
  buildSystemPrompt,
  compactRefs,
  hasUncheckedCitation,
  normaliseRef,
  rewriteMarkers,
} from '../../supabase/functions/ask-the-word/logic';

const books = new Set(['JHN', 'PSA', 'SIR']);

describe('Ask the Word: reference handling', () => {
  it('accepts well-formed references and rejects malformed or oversized ones', () => {
    expect(normaliseRef({ book: 'jhn', chapter: 3, verse_start: 16, verse_end: 17 }, books)).toEqual({
      book: 'JHN',
      chapter: 3,
      verse_start: 16,
      verse_end: 17,
    });
    expect(normaliseRef({ book: 'XXX', chapter: 1, verse_start: 1, verse_end: 1 }, books)).toBeNull();
    expect(normaliseRef({ book: 'JHN', chapter: 0, verse_start: 1, verse_end: 1 }, books)).toBeNull();
    expect(normaliseRef({ book: 'JHN', chapter: 3, verse_start: 17, verse_end: 16 }, books)).toBeNull();
    expect(normaliseRef({ book: 'PSA', chapter: 119, verse_start: 1, verse_end: 100 }, books)).toBeNull();
    expect(normaliseRef({ book: 'JHN', chapter: 3.5, verse_start: 1, verse_end: 1 }, books)).toBeNull();
    expect(normaliseRef('John 3:16', books)).toBeNull();
    expect(normaliseRef(null, books)).toBeNull();
  });

  it('drops removed references, merges duplicates and renumbers the markers', () => {
    const a = { book: 'JHN', chapter: 3, verse_start: 16, verse_end: 16 };
    const b = { book: 'PSA', chapter: 23, verse_start: 1, verse_end: 3 };
    const { refs, renumber } = compactRefs([a, null, b, { ...a }]);
    expect(refs).toEqual([a, b]);
    expect(renumber).toEqual([1, null, 2, 1]);
    expect(rewriteMarkers('God loves the world [[1]]. An invented point [[2]]. He leads us [[3]], as said [[4]].', renumber)).toBe(
      'God loves the world [[1]]. An invented point. He leads us [[2]], as said [[1]].',
    );
  });

  it('caps the number of references', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ book: 'PSA', chapter: i + 1, verse_start: 1, verse_end: 1 }));
    const { refs, renumber } = compactRefs(many);
    expect(refs).toHaveLength(8);
    expect(renumber.slice(8)).toEqual([null, null, null, null]);
  });

  it('flags chapter:verse citations written in the prose, but not markers or plain numbers', () => {
    expect(hasUncheckedCitation('As John 3:16 says, God loves the world.')).toBe(true);
    expect(hasUncheckedCitation('യോഹന്നാൻ 3:16 ൽ പറയുന്നു')).toBe(true);
    expect(hasUncheckedCitation('God loves the world [[1]]. Written around AD 90, in 21 chapters.')).toBe(false);
    expect(hasUncheckedCitation('See [[12]] and [[3]].')).toBe(false);
  });
});

describe('Ask the Word: prompt and schema', () => {
  it('carries the theological and safety rules in both languages', () => {
    const en = buildSystemPrompt('en', 'JHN = John');
    const ml = buildSystemPrompt('ml', 'JHN = John');
    expect(en).toContain('in English');
    expect(ml).toContain('Malayalam');
    for (const p of [en, ml]) {
      expect(p).toContain('NEVER quote Bible wording');
      expect(p).toContain('Catholic, Orthodox and Protestant views fairly');
      expect(p).toContain('never claim to speak for God');
      expect(p).toContain('fear-based');
      expect(p).toContain('14416');
      expect(p).toContain('JHN = John');
    }
  });

  it('restricts books to the catalogue with a strict schema', () => {
    const schema = answerSchema(['JHN', 'PSA']);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.references.items.properties.book.enum).toEqual(['JHN', 'PSA']);
    expect(schema.required).toEqual(['answer', 'references', 'uncertain']);
  });
});
