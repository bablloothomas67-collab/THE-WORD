import { useTranslation } from 'react-i18next';
import { bibleProvider } from '../../services/bible-provider/supabaseProvider';
import { BibleProviderError, type BibleVersion } from '../../services/bible-provider/types';
import { useAsync } from '../../hooks/useAsync';
import { isEnabledLanguage, type LanguageCode } from '../../config/languages';
import { getPreferredVersion } from './readingState';

export function useVersions() {
  return useAsync(() => bibleProvider.listVersions(), []);
}

export function useBooks(versionId: string | undefined) {
  return useAsync(async () => (versionId ? bibleProvider.listBooks(versionId) : []), [versionId]);
}

export function useUiLanguage(): LanguageCode {
  const { i18n } = useTranslation();
  return isEnabledLanguage(i18n.language) ? i18n.language : 'en';
}

/**
 * Version to open when none is in the URL: the reader's last choice for this
 * interface language, else the first version in that language, else the first.
 */
export function pickDefaultVersion(versions: BibleVersion[], lang: LanguageCode): BibleVersion | undefined {
  const preferred = getPreferredVersion(lang);
  return (
    versions.find((v) => v.code === preferred) ?? versions.find((v) => v.languageCode === lang) ?? versions[0]
  );
}

/** Translation key for a provider error — never a silent fallback to another version. */
export function bibleErrorKey(error: unknown): string {
  if (error instanceof BibleProviderError) {
    if (error.code === 'not_found') return 'bible.notFound';
    if (error.code === 'not_configured') return 'bible.notConfigured';
  }
  return 'bible.unavailable';
}
