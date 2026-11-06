import { getLanguage, type LanguageCode } from '../config/languages';

/** Formats a date in the user's interface language (e.g. "6 November 2026" / "2026, നവംബർ 6"). */
export function formatDate(date: Date, lang: LanguageCode, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(getLanguage(lang).locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatNumber(value: number, lang: LanguageCode): string {
  return new Intl.NumberFormat(getLanguage(lang).locale).format(value);
}
