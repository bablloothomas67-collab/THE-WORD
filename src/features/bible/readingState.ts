import type { LanguageCode } from '../../config/languages';

/** Per-browser reading conveniences (no personal data leaves the device). */

export interface ReadingPosition {
  versionCode: string;
  bookCode: string;
  chapter: number;
  /** Book name in that version, for display without a network call. */
  bookName: string;
}

const POSITION_KEY = 'theword.reading.position';
const VERSION_KEY = 'theword.reading.version.';
const FONT_KEY = 'theword.reading.fontScale';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable — the reader still works without persistence
  }
}

export function getReadingPosition(): ReadingPosition | null {
  const raw = read(POSITION_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<ReadingPosition>;
    if (
      typeof p.versionCode === 'string' &&
      typeof p.bookCode === 'string' &&
      /^[A-Z0-9]{3}$/.test(p.bookCode) &&
      typeof p.chapter === 'number' &&
      p.chapter > 0 &&
      typeof p.bookName === 'string'
    ) {
      return p as ReadingPosition;
    }
  } catch {
    // corrupt value: ignore
  }
  return null;
}

export function saveReadingPosition(p: ReadingPosition) {
  write(POSITION_KEY, JSON.stringify(p));
}

export function getPreferredVersion(lang: LanguageCode): string | null {
  return read(VERSION_KEY + lang);
}
export function savePreferredVersion(lang: LanguageCode, code: string) {
  write(VERSION_KEY + lang, code);
}

export const FONT_SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;
export function getFontScaleIndex(): number {
  const n = Number(read(FONT_KEY));
  return Number.isInteger(n) && n >= 0 && n < FONT_SCALES.length ? n : 1;
}
export function saveFontScaleIndex(i: number) {
  write(FONT_KEY, String(i));
}

export function readerPath(versionCode: string, bookCode: string, chapter: number) {
  return `/bible/${encodeURIComponent(versionCode)}/${bookCode}/${chapter}`;
}
