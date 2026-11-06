import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/common.json';
import ml from '../locales/ml/common.json';
import { DEFAULT_LANGUAGE, getLanguage, isEnabledLanguage, type LanguageCode } from '../config/languages';

export const LANGUAGE_STORAGE_KEY = 'theword.language';

/**
 * Only enabled languages are registered as resources, so an unfinished
 * translation (Hindi, Tamil) can never be shown to users by accident.
 */
const resources = {
  en: { common: en },
  ml: { common: ml },
} as const;

export function readStoredLanguage(): LanguageCode {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isEnabledLanguage(stored)) return stored;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); fall back to default.
  }
  return DEFAULT_LANGUAGE;
}

export function storeLanguage(code: LanguageCode): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Non-fatal: the choice still applies for this session.
  }
}

/** Keeps <html lang/dir> in sync so fonts, line-height and screen readers follow the language. */
export function applyDocumentLanguage(code: LanguageCode): void {
  const cfg = getLanguage(code);
  document.documentElement.lang = code;
  document.documentElement.dir = cfg.direction;
}

export async function changeLanguage(code: LanguageCode): Promise<void> {
  if (!isEnabledLanguage(code)) throw new Error(`Language not enabled: ${code}`);
  await i18n.changeLanguage(code);
  storeLanguage(code);
  applyDocumentLanguage(code);
}

export function initI18n(initial: LanguageCode = readStoredLanguage()) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: initial,
      fallbackLng: DEFAULT_LANGUAGE,
      defaultNS: 'common',
      ns: ['common'],
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  }
  applyDocumentLanguage(initial);
  return i18n;
}

export default i18n;
