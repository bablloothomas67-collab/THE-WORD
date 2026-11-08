import { Fragment, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ButtonLink, ErrorState, LoadingState } from '../components/ui';
import { PageHeader } from './PageHeader';
import { VersionSelect } from '../features/bible/VersionSelect';
import { bibleErrorKey, pickDefaultVersion, useBooks, useUiLanguage, useVersions } from '../features/bible/useBible';
import { getReadingPosition, readerPath, savePreferredVersion } from '../features/bible/readingState';
import type { BibleBook, Testament } from '../services/bible-provider/types';
import styles from '../features/bible/bible.module.css';

const SECTIONS: { testament: Testament; titleKey: string; noteKey?: string }[] = [
  { testament: 'OT', titleKey: 'bible.oldTestament' },
  { testament: 'NT', titleKey: 'bible.newTestament' },
  { testament: 'DC', titleKey: 'bible.deuterocanon', noteKey: 'bible.deuterocanonNote' },
];

/** Bible library: version, then testament, book and chapter. */
export function BiblePage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const [params, setParams] = useSearchParams();
  const versions = useVersions();
  const list = versions.data ?? [];
  const version = list.find((v) => v.code === params.get('v')) ?? pickDefaultVersion(list, lang);
  const books = useBooks(version?.id);
  const [openBook, setOpenBook] = useState<string | null>(null);
  const position = getReadingPosition();

  function changeVersion(code: string) {
    const next = list.find((v) => v.code === code);
    if (next) savePreferredVersion(lang, next.code);
    setParams({ v: code }, { replace: true });
  }

  return (
    <>
      <PageHeader title={t('bible.title')} lead={t('bible.intro')} />

      {versions.loading && !versions.data ? (
        <LoadingState />
      ) : versions.error || !version ? (
        <ErrorState message={t(bibleErrorKey(versions.error))} onRetry={versions.reload} />
      ) : (
        <>
          <div className={styles.toolbar}>
            <VersionSelect versions={list} value={version.code} onChange={changeVersion} />
            {position && (
              <ButtonLink to={readerPath(position.versionCode, position.bookCode, position.chapter)}>
                {t('home.continue.resume', {
                  reference: t('bible.reference', { book: position.bookName, chapter: position.chapter }),
                })}
              </ButtonLink>
            )}
            <ButtonLink to={`/bible/search?v=${encodeURIComponent(version.code)}`} variant="secondary">
              {t('bible.search')}
            </ButtonLink>
          </div>

          {books.loading ? (
            <LoadingState />
          ) : books.error ? (
            <ErrorState message={t(bibleErrorKey(books.error))} onRetry={books.reload} />
          ) : (
            SECTIONS.map(({ testament, titleKey, noteKey }) => {
              const inSection = (books.data ?? []).filter((b) => b.testament === testament);
              if (inSection.length === 0) return null;
              return (
                <section key={testament} className={styles.section} aria-labelledby={`sec-${testament}`}>
                  <h2 id={`sec-${testament}`}>{t(titleKey)}</h2>
                  {noteKey && <p className={styles.sectionNote}>{t(noteKey)}</p>}
                  <ul className={styles.bookGrid} lang={version.languageCode}>
                    {inSection.map((book) => (
                      <Fragment key={book.code}>
                        <li>
                          <button
                            type="button"
                            className={styles.bookButton}
                            aria-expanded={openBook === book.code}
                            aria-controls={`ch-${book.code}`}
                            onClick={() => setOpenBook((cur) => (cur === book.code ? null : book.code))}
                          >
                            {book.name}
                          </button>
                        </li>
                        {openBook === book.code && (
                          <li id={`ch-${book.code}`} className={styles.chapterPanel}>
                            <ChapterGrid versionCode={version.code} book={book} />
                          </li>
                        )}
                      </Fragment>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </>
      )}
    </>
  );
}

function ChapterGrid({ versionCode, book }: { versionCode: string; book: BibleBook }) {
  const { t } = useTranslation();
  return (
    <>
      <h3>
        {book.longName ?? book.name} · {t('bible.chapters')}
      </h3>
      <div className={styles.chapterGrid}>
        {Array.from({ length: book.chapterCount }, (_, i) => i + 1).map((n) => (
          <Link
            key={n}
            className={styles.chapterLink}
            to={readerPath(versionCode, book.code, n)}
            aria-label={t('bible.chapterLink', { book: book.name, chapter: n })}
          >
            {n}
          </Link>
        ))}
      </div>
    </>
  );
}
