/**
 * Interface languages. Bible translation metadata is kept separately
 * (see docs/ARCHITECTURE.md) — this list only controls the UI language.
 *
 * Hindi and Tamil are prepared but disabled until their translations
 * are complete and editorially reviewed.
 */
export type LanguageCode = 'en' | 'ml' | 'hi' | 'ta';

export interface LanguageConfig {
  code: LanguageCode;
  /** Name shown in the language selector, written in the language itself. */
  nativeName: string;
  /** BCP 47 locale used for dates and numbers. */
  locale: string;
  direction: 'ltr' | 'rtl';
  enabled: boolean;
}

export const LANGUAGES: readonly LanguageConfig[] = [
  { code: 'en', nativeName: 'English', locale: 'en-IN', direction: 'ltr', enabled: true },
  { code: 'ml', nativeName: 'മലയാളം', locale: 'ml-IN', direction: 'ltr', enabled: true },
  { code: 'hi', nativeName: 'हिन्दी', locale: 'hi-IN', direction: 'ltr', enabled: false },
  { code: 'ta', nativeName: 'தமிழ்', locale: 'ta-IN', direction: 'ltr', enabled: false },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const ENABLED_LANGUAGES = LANGUAGES.filter((l) => l.enabled);

export function isEnabledLanguage(code: string | null | undefined): code is LanguageCode {
  return ENABLED_LANGUAGES.some((l) => l.code === code);
}

export function getLanguage(code: LanguageCode): LanguageConfig {
  const found = LANGUAGES.find((l) => l.code === code);
  if (!found) throw new Error(`Unknown language code: ${code}`);
  return found;
}
