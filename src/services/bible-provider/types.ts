/**
 * Bible provider adapter contract. The UI depends only on this interface,
 * so a different licensed source (e.g. a commercial API behind an Edge
 * Function) can replace the current one without changing screens.
 */
import type { LanguageCode } from '../../config/languages';

export type Testament = 'OT' | 'NT' | 'DC';

export interface BibleVersion {
  id: string;
  code: string;
  languageCode: LanguageCode;
  name: string;
  shortName: string;
  copyrightNotice: string;
  licence: string;
  licenceUrl: string | null;
  sourceUrl: string | null;
  attributionRequired: boolean;
  hasDeuterocanon: boolean;
}

export interface BibleBook {
  code: string;
  order: number;
  testament: Testament;
  name: string;
  longName: string | null;
  abbreviation: string | null;
  chapterCount: number;
}

export interface BibleVerse {
  verse: number;
  /** Printed number; "30-31" when a version combines verses. */
  label: string;
  text: string;
}

export interface BibleChapter {
  version: BibleVersion;
  book: BibleBook;
  chapter: number;
  /** Psalm superscription, when present. Not a numbered verse. */
  title: string | null;
  verses: BibleVerse[];
}

export interface SearchHit {
  bookCode: string;
  chapter: number;
  verse: number;
  label: string;
  text: string;
}

export interface SearchResult {
  hits: SearchHit[];
  /** True when the result cap was reached and the search should be refined. */
  truncated: boolean;
}

export type BibleErrorCode = 'not_configured' | 'unavailable' | 'not_found' | 'invalid_query';

export class BibleProviderError extends Error {
  readonly code: BibleErrorCode;
  constructor(code: BibleErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'BibleProviderError';
    this.code = code;
  }
}

export interface BibleProvider {
  listVersions(): Promise<BibleVersion[]>;
  listBooks(versionId: string): Promise<BibleBook[]>;
  getChapter(versionCode: string, bookCode: string, chapter: number): Promise<BibleChapter>;
  search(versionId: string, query: string): Promise<SearchResult>;
}

export const SEARCH_RESULT_CAP = 200;
export const SEARCH_MIN_LENGTH = 2;
