import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bibleProvider } from '../../services/bible-provider/supabaseProvider';
import { useAsync } from '../../hooks/useAsync';
import { LoadingState } from '../../components/ui';
import { pickDefaultVersion, useUiLanguage } from './useBible';
import { readerPath } from './readingState';
import styles from './passage.module.css';

interface Props {
  bookCode: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  /** Visual tone: "dark" for the navy daily-verse card. */
  tone?: 'light' | 'dark';
  errorKey: string;
}

/**
 * Shows a short passage live from the reader's preferred version, with the
 * version's short attribution. The text is never stored alongside other content.
 */
export function PassageView({ bookCode, chapter, verseStart, verseEnd, tone = 'light', errorKey }: Props) {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const passage = useAsync(async () => {
    const version = pickDefaultVersion(await bibleProvider.listVersions(), lang);
    if (!version) throw new Error('No Bible version available');
    return bibleProvider.getPassage(version.code, bookCode, chapter, verseStart, verseEnd);
  }, [bookCode, chapter, verseStart, verseEnd, lang]);

  if (passage.loading) return <LoadingState />;
  if (passage.error || !passage.data) return <p className={styles.error}>{t(errorKey)}</p>;

  const { version, book, verses } = passage.data;
  const label = verseStart === verseEnd ? String(verseStart) : `${verseStart}–${verseEnd}`;
  return (
    <figure className={`${styles.passage} ${tone === 'dark' ? styles.dark : ''}`}>
      <blockquote lang={version.languageCode} className={styles.text}>
        {verses.map((v) => (
          <span key={v.verse}>
            {verses.length > 1 && <sup className={styles.num}>{v.label}</sup>}
            {v.text}{' '}
          </span>
        ))}
      </blockquote>
      <figcaption className={styles.caption}>
        <Link to={readerPath(version.code, book.code, chapter)} className={styles.ref}>
          {t('bible.verseReference', { book: book.name, chapter, verse: label })}
        </Link>
        <span className={styles.attr}>
          {' · '}
          {version.shortName}
          {version.attributionRequired ? ` · ${version.licence}` : ''}
        </span>
      </figcaption>
    </figure>
  );
}
