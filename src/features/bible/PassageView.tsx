import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bibleProvider } from '../../services/bible-provider/supabaseProvider';
import { useAsync } from '../../hooks/useAsync';
import { LoadingState } from '../../components/ui';
import { pickDefaultVersion, useUiLanguage } from './useBible';
import { readerPath } from './readingState';
import { AudioPlayer } from '../audio/AudioPlayer';
import { audioService, type AudioKind } from '../audio/audioService';
import styles from './passage.module.css';

interface Props {
  bookCode: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  /** Visual tone: "dark" for the navy daily-verse card. */
  tone?: 'light' | 'dark';
  errorKey: string;
  /** When set, a "Listen" player is shown if a recording exists for this content. */
  audio?: { kind: AudioKind; contentKey: string };
}

/**
 * Shows a short passage live from the reader's preferred version, with the
 * version's short attribution. The text is never stored alongside other content.
 */
export function PassageView({ bookCode, chapter, verseStart, verseEnd, tone = 'light', errorKey, audio }: Props) {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const passage = useAsync(async () => {
    const versions = await bibleProvider.listVersions();
    const version = pickDefaultVersion(versions, lang);
    if (!version) throw new Error('No Bible version available');
    const passage = await bibleProvider.getPassage(version.code, bookCode, chapter, verseStart, verseEnd);
    return { ...passage, versions };
  }, [bookCode, chapter, verseStart, verseEnd, lang]);
  const shownVersion = passage.data?.version.code ?? null;
  const track = useAsync(async () => {
    if (!audio || !shownVersion) return null;
    // Audio is optional: a lookup failure must never hide the Scripture text.
    return audioService.getTrack(audio.kind, audio.contentKey, lang, shownVersion).catch((e: unknown) => {
      console.warn(e);
      return null;
    });
  }, [audio?.kind, audio?.contentKey, lang, shownVersion]);

  if (passage.loading) return <LoadingState />;
  if (passage.error || !passage.data) return <p className={styles.error}>{t(errorKey)}</p>;

  const { version, book, verses, versions } = passage.data;
  const label = verseStart === verseEnd ? String(verseStart) : `${verseStart}–${verseEnd}`;
  const reference = t('bible.verseReference', { book: book.name, chapter, verse: label });
  const audioVersion = versions.find((v) => v.code === track.data?.versionCode);
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
          {reference}
        </Link>
        <span className={styles.attr}>
          {' · '}
          {version.shortName}
          {version.attributionRequired ? ` · ${version.licence}` : ''}
        </span>
      </figcaption>
      {track.data && (
        <AudioPlayer
          src={track.data.url}
          durationSecs={track.data.durationSecs}
          label={reference}
          tone={tone}
          caption={
            audioVersion && audioVersion.code !== version.code
              ? t('audio.captionOtherVersion', { version: audioVersion.shortName })
              : t('audio.caption', { version: audioVersion?.shortName ?? version.shortName })
          }
        />
      )}
    </figure>
  );
}
