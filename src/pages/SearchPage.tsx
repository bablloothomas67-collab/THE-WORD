import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, LoadingState } from '../components/ui';
import { PageHeader } from './PageHeader';
import { bibleProvider } from '../services/bible-provider/supabaseProvider';
import { SEARCH_MIN_LENGTH } from '../services/bible-provider/types';
import { useAsync } from '../hooks/useAsync';
import { VersionSelect } from '../features/bible/VersionSelect';
import { Attribution } from '../features/bible/Attribution';
import { normaliseSearch } from '../features/bible/searchNormalise';
import { bibleErrorKey, pickDefaultVersion, useBooks, useUiLanguage, useVersions } from '../features/bible/useBible';
import { readerPath } from '../features/bible/readingState';
import styles from '../features/bible/bible.module.css';

export function SearchPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const [params, setParams] = useSearchParams();
  const versions = useVersions();
  const list = versions.data ?? [];
  const version = list.find((v) => v.code === params.get('v')) ?? pickDefaultVersion(list, lang);
  const query = params.get('q') ?? '';
  const [draft, setDraft] = useState(query);
  const [tooShort, setTooShort] = useState(false);
  const books = useBooks(version?.id);
  const names = new Map((books.data ?? []).map((b) => [b.code, b.name]));

  const valid = normaliseSearch(query).replace(/ /g, '').length >= SEARCH_MIN_LENGTH;
  const results = useAsync(
    async () => (version && valid ? bibleProvider.search(version.id, query) : null),
    [version?.id, query, valid],
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    const ok = normaliseSearch(draft).replace(/ /g, '').length >= SEARCH_MIN_LENGTH;
    setTooShort(!ok);
    if (ok && version) setParams({ v: version.code, q: draft.trim() });
  }

  return (
    <>
      <PageHeader title={t('search.title')} lead={t('search.intro')} />
      {versions.error ? (
        <ErrorState message={t(bibleErrorKey(versions.error))} onRetry={versions.reload} />
      ) : !version ? (
        <LoadingState />
      ) : (
        <>
          <form role="search" className={styles.searchForm} onSubmit={submit}>
            <div className={styles.searchInput}>
              <label htmlFor="bible-search" className={styles.smallLabel}>
                {t('search.label')}
              </label>
              <input
                id="bible-search"
                type="search"
                value={draft}
                placeholder={t('search.placeholder')}
                onChange={(e) => setDraft(e.target.value)}
                lang={version.languageCode}
              />
            </div>
            <VersionSelect
              versions={list}
              value={version.code}
              label={t('search.searchIn')}
              onChange={(code) => setParams(query ? { v: code, q: query } : { v: code })}
            />
            <Button type="submit">{t('search.submit')}</Button>
          </form>
          {tooShort && <p role="alert">{t('search.minLength')}</p>}

          {results.loading && query ? (
            <LoadingState />
          ) : results.error ? (
            <ErrorState message={t(bibleErrorKey(results.error))} onRetry={results.reload} />
          ) : results.data ? (
            results.data.hits.length === 0 ? (
              <EmptyState body={t('search.noResults')} />
            ) : (
              <>
                <p role="status">{t('search.resultCount', { count: results.data.hits.length })}</p>
                {results.data.truncated && <p className={styles.hint}>{t('search.truncated')}</p>}
                <ol className={styles.results} lang={version.languageCode}>
                  {results.data.hits.map((h) => {
                    const ref = t('bible.verseReference', {
                      book: names.get(h.bookCode) ?? h.bookCode,
                      chapter: h.chapter,
                      verse: h.label,
                    });
                    return (
                      <li key={`${h.bookCode}-${h.chapter}-${h.verse}`}>
                        <Link className={styles.result} to={readerPath(version.code, h.bookCode, h.chapter)}>
                          <span className={styles.resultRef}>{ref}</span>
                          {h.text}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
                <Attribution version={version} />
              </>
            )
          ) : null}
        </>
      )}
    </>
  );
}
