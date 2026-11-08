import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ButtonLink, ErrorState, LoadingState, Notice } from '../components/ui';
import { PageHeader } from './PageHeader';
import { bibleProvider } from '../services/bible-provider/supabaseProvider';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../features/auth/useAuth';
import { VersionSelect } from '../features/bible/VersionSelect';
import { VerseActions } from '../features/bible/VerseActions';
import { Attribution } from '../features/bible/Attribution';
import { bibleErrorKey, useBooks, useUiLanguage, useVersions } from '../features/bible/useBible';
import {
  FONT_SCALES,
  getFontScaleIndex,
  readerPath,
  saveFontScaleIndex,
  savePreferredVersion,
  saveReadingPosition,
} from '../features/bible/readingState';
import {
  studyService,
  type ChapterAnnotations,
  type HighlightColour,
  type VerseRef,
} from '../features/study/studyService';
import { neighbours } from '../features/bible/chapterNav';
import styles from '../features/bible/bible.module.css';

const EMPTY: ChapterAnnotations = { bookmarks: new Set(), highlights: new Map(), notes: new Map() };

export function ReaderPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = useParams();
  const versionCode = params.version ?? '';
  const bookCode = (params.book ?? '').toUpperCase();
  const chapterNum = Number(params.chapter);

  const versions = useVersions();
  const chapter = useAsync(
    () => bibleProvider.getChapter(versionCode, bookCode, chapterNum),
    [versionCode, bookCode, chapterNum],
  );
  const books = useBooks(chapter.data?.version.id);

  // Selection and annotations are tagged with the chapter they belong to, so
  // moving to another chapter resets them without extra effects.
  const chapterKey = `${versionCode}/${bookCode}/${chapterNum}`;
  const [selection, setSelection] = useState<{ key: string; verse: number } | null>(null);
  const selected = selection?.key === chapterKey ? selection.verse : null;
  const setSelected = (verse: number | null) => setSelection(verse === null ? null : { key: chapterKey, verse });
  const [stored, setStored] = useState<{ key: string; data: ChapterAnnotations } | null>(null);
  const [fontIndex, setFontIndex] = useState(getFontScaleIndex);

  const data = chapter.data;
  const versionId = data?.version.id;
  const userId = user?.id;

  // Remember position for "Continue reading".
  useEffect(() => {
    if (data) {
      saveReadingPosition({
        versionCode: data.version.code,
        bookCode: data.book.code,
        chapter: data.chapter,
        bookName: data.book.name,
      });
    }
  }, [data]);

  // Load this user's private annotations for the chapter.
  const annotationKey = userId && versionId ? `${userId}:${versionId}/${bookCode}/${chapterNum}` : null;
  const annotations = stored && stored.key === annotationKey ? stored.data : EMPTY;
  const loadAnnotations = useCallback(async () => {
    if (!userId || !versionId || !annotationKey) return;
    try {
      const result = await studyService.getChapterAnnotations(versionId, bookCode, chapterNum);
      setStored({ key: annotationKey, data: result });
    } catch (err) {
      console.error('Failed to load annotations', err);
    }
  }, [userId, versionId, bookCode, chapterNum, annotationKey]);

  useEffect(() => {
    if (!userId || !versionId || !annotationKey) return;
    let active = true;
    studyService.getChapterAnnotations(versionId, bookCode, chapterNum).then(
      (data) => active && setStored({ key: annotationKey, data }),
      (err: unknown) => console.error('Failed to load annotations', err),
    );
    return () => {
      active = false;
    };
  }, [userId, versionId, bookCode, chapterNum, annotationKey]);

  function changeFont(delta: number) {
    const next = Math.min(FONT_SCALES.length - 1, Math.max(0, fontIndex + delta));
    setFontIndex(next);
    saveFontScaleIndex(next);
  }

  function changeVersion(code: string) {
    const target = versions.data?.find((v) => v.code === code);
    if (target) savePreferredVersion(lang, code);
    navigate(readerPath(code, bookCode, chapterNum));
  }

  if (chapter.loading && !data) return <LoadingState />;

  if (chapter.error || !data) {
    return (
      <>
        <PageHeader title={t('bible.title')} />
        {versions.data && (
          <div className={styles.toolbar}>
            <VersionSelect versions={versions.data} value={versionCode} onChange={changeVersion} />
          </div>
        )}
        <ErrorState message={t(bibleErrorKey(chapter.error))} onRetry={chapter.reload} />
        <p />
        <ButtonLink to="/bible" variant="secondary">
          {t('bible.openLibrary')}
        </ButtonLink>
      </>
    );
  }

  const { version, book } = data;
  const verseRef = (verse: number): VerseRef => ({ versionId: version.id, bookCode: book.code, chapter: data.chapter, verse });
  const selectedVerse = data.verses.find((v) => v.verse === selected);
  const reference = (label: string) =>
    t('bible.verseReference', { book: book.name, chapter: data.chapter, verse: label });

  async function mutate(action: () => Promise<void>) {
    await action();
    await loadAnnotations();
  }

  const { prev, next } = neighbours(books.data ?? [], book, data.chapter);

  return (
    <>
      <PageHeader eyebrow={version.shortName} title={t('bible.reference', { book: book.name, chapter: data.chapter })} />

      <div className={styles.toolbar}>
        {versions.data && <VersionSelect versions={versions.data} value={version.code} onChange={changeVersion} />}
        <div className={styles.sizeButtons} role="group" aria-label={t('bible.textSize')}>
          <button
            type="button"
            className={styles.sizeButton}
            onClick={() => changeFont(-1)}
            disabled={fontIndex === 0}
            aria-label={t('bible.smaller')}
          >
            A−
          </button>
          <button
            type="button"
            className={styles.sizeButton}
            onClick={() => changeFont(1)}
            disabled={fontIndex === FONT_SCALES.length - 1}
            aria-label={t('bible.larger')}
          >
            A+
          </button>
        </div>
        <ButtonLink to={`/bible?v=${encodeURIComponent(version.code)}`} variant="ghost">
          {t('bible.openLibrary')}
        </ButtonLink>
      </div>

      <p className={styles.hint}>{t('reader.selectHint')}</p>

      <article
        className={styles.reading}
        lang={version.languageCode}
        style={{ '--reader-scale': FONT_SCALES[fontIndex] } as CSSProperties}
      >
        {data.title && <p className={styles.psalmTitle}>{data.title}</p>}
        <ol className={styles.verseList} aria-label={t('reader.versesLabel')}>
          {data.verses.map((v) => {
            const colour = annotations.highlights.get(v.verse);
            return (
              <li key={v.verse}>
                <button
                  type="button"
                  className={[styles.verse, colour ? styles[`hl-${colour}`] : ''].join(' ')}
                  aria-pressed={selected === v.verse}
                  onClick={() => setSelected(selected === v.verse ? null : v.verse)}
                >
                  <span className={styles.verseNum}>{v.label}</span>
                  {v.text}
                  {annotations.bookmarks.has(v.verse) && (
                    <span className={styles.marks} role="img" aria-label={t('reader.hasBookmark')}>
                      ◆
                    </span>
                  )}
                  {annotations.notes.has(v.verse) && (
                    <span className={styles.marks} role="img" aria-label={t('reader.hasNote')}>
                      ✎
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </article>

      <nav className={styles.chapterNav} aria-label={t('bible.chapters')}>
        {prev ? (
          <Link to={readerPath(version.code, prev.book.code, prev.chapter)}>
            ← {t('bible.reference', { book: prev.book.name, chapter: prev.chapter })}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={readerPath(version.code, next.book.code, next.chapter)}>
            {t('bible.reference', { book: next.book.name, chapter: next.chapter })} →
          </Link>
        )}
      </nav>

      <Attribution version={version} />
      {!user && selected === null && (
        <>
          <p />
          <Notice>{t('reader.signInToSave')}</Notice>
        </>
      )}

      {selectedVerse && (
        <>
          <div className={styles.readerSpacer} aria-hidden="true" />
          <VerseActions
            key={`${version.id}-${book.code}-${data.chapter}-${selectedVerse.verse}`}
            reference={reference(selectedVerse.label)}
            signedIn={Boolean(user)}
            bookmarked={annotations.bookmarks.has(selectedVerse.verse)}
            colour={annotations.highlights.get(selectedVerse.verse)}
            note={annotations.notes.get(selectedVerse.verse)}
            copyText={`${selectedVerse.text}\n— ${reference(selectedVerse.label)} (${version.shortName}${
              version.attributionRequired ? `, ${version.licence}` : ''
            })`}
            onBookmark={(on) => mutate(() => studyService.setBookmark(verseRef(selectedVerse.verse), on))}
            onHighlight={(c: HighlightColour | null) =>
              mutate(() => studyService.setHighlight(verseRef(selectedVerse.verse), c))
            }
            onSaveNote={(text) => mutate(() => studyService.saveNote(verseRef(selectedVerse.verse), text, lang))}
            onClose={() => setSelected(null)}
          />
        </>
      )}
    </>
  );
}
