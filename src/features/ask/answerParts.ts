/** One validated Scripture reference attached to an answer (never Bible text). */
export interface AnswerRef {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

export type AnswerPart = { kind: 'text'; text: string } | { kind: 'ref'; index: number };

/**
 * Splits answer prose at its [[n]] markers. A marker that does not point at a
 * validated reference is dropped, so nothing unverified is ever rendered as a citation.
 */
export function splitAnswer(content: string, refCount: number): AnswerPart[] {
  const parts: AnswerPart[] = [];
  let last = 0;
  for (const m of content.matchAll(/\[\[\s*(\d+)\s*\]\]/g)) {
    if (m.index > last) parts.push({ kind: 'text', text: content.slice(last, m.index) });
    const index = Number(m[1]) - 1;
    if (index >= 0 && index < refCount) parts.push({ kind: 'ref', index });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ kind: 'text', text: content.slice(last) });
  return parts;
}

export function verseLabel(ref: AnswerRef): string {
  return ref.verseStart === ref.verseEnd ? String(ref.verseStart) : `${ref.verseStart}–${ref.verseEnd}`;
}
