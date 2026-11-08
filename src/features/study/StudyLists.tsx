import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { bibleProvider } from '../../services/bible-provider/supabaseProvider';
import { readerPath } from '../bible/readingState';
import { studyService, type StudyKind } from './studyService';
import styles from '../bible/bible.module.css';

const TABS: { kind: StudyKind; labelKey: string; emptyKey: string }[] = [
  { kind: 'bookmarks', labelKey: 'journey.sections.bookmarks', emptyKey: 'journey.lists.bookmarksEmpty' },
  { kind: 'highlights', labelKey: 'journey.sections.highlights', emptyKey: 'journey.lists.highlightsEmpty' },
  { kind: 'study_notes', labelKey: 'journey.sections.notes', emptyKey: 'journey.lists.notesEmpty' },
];

/** The signed-in user's bookmarks, highlights and notes (owner-only via RLS). */
export function StudyLists() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<StudyKind>('bookmarks');
  const items = useAsync(async () => {
    const [list, versions] = await Promise.all([studyService.listRecent(kind), bibleProvider.listVersions()]);
    const versionIds = [...new Set(list.map((i) => i.versionId))];
    const bookLists = await Promise.all(versionIds.map((id) => bibleProvider.listBooks(id)));
    const bookNames = new Map<string, string>();
    versionIds.forEach((id, n) => bookLists[n].forEach((b) => bookNames.set(`${id}:${b.code}`, b.name)));
    const byId = new Map(versions.map((v) => [v.id, v]));
    return list.flatMap((item) => {
      const version = byId.get(item.versionId);
      return version ? [{ ...item, version, bookName: bookNames.get(`${item.versionId}:${item.bookCode}`) ?? item.bookCode }] : [];
    });
  }, [kind]);
  const tab = TABS.find((x) => x.kind === kind)!;

  return (
    <section>
      <div className={styles.tabs} role="tablist">
        {TABS.map((x) => (
          <button
            key={x.kind}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={kind === x.kind}
            onClick={() => setKind(x.kind)}
          >
            {t(x.labelKey)}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={t(tab.labelKey)}>
        {items.loading ? (
          <LoadingState />
        ) : items.error ? (
          <ErrorState message={t('journey.lists.loadError')} onRetry={items.reload} />
        ) : !items.data?.length ? (
          <EmptyState body={t(tab.emptyKey)} />
        ) : (
          <ul className={styles.studyList}>
            {items.data.map((item) => (
              <li key={item.id}>
                <Link
                  className={[styles.studyItem, item.colour ? styles[`border-${item.colour}`] : ''].join(' ')}
                  to={readerPath(item.version.code, item.bookCode, item.chapter)}
                >
                  <span className={styles.resultRef}>
                    {t('bible.verseReference', { book: item.bookName, chapter: item.chapter, verse: item.verseLabel })} ·{' '}
                    {item.version.shortName}
                  </span>
                  <span className={styles.clamp} lang={item.version.languageCode}>
                    {item.verseText}
                  </span>
                  {item.note && <p className={styles.studyNote}>{item.note}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
