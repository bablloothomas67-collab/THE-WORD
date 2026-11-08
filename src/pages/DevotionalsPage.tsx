import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, ErrorState, LoadingState } from '../components/ui';
import { PageHeader } from './PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useUiLanguage } from '../features/bible/useBible';
import { PassageView } from '../features/bible/PassageView';
import { devotionalService } from '../features/devotionals/devotionalService';
import { formatDate } from '../utils/format';
import styles from './pages.module.css';

export function DevotionalsPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const list = useAsync(() => devotionalService.list(lang), [lang]);
  return (
    <>
      <PageHeader title={t('devotionals.title')} lead={t('devotionals.intro')} />
      {list.loading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={t('devotionals.error')} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <EmptyState body={t('devotionals.none')} />
      ) : (
        <div className={styles.grid}>
          {list.data.map((d) => (
            <Card key={d.slug} as="article" accent title={<Link to={`/devotionals/${d.slug}`}>{d.title}</Link>}>
              <p className={styles.meta}>{formatDate(new Date(`${d.publicationDate}T00:00:00`), lang)}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function DevotionalPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const { slug = '' } = useParams();
  const d = useAsync(() => devotionalService.get(slug, lang), [slug, lang]);
  const [shared, setShared] = useState(false);

  if (d.loading) return <LoadingState />;
  if (d.error) return <ErrorState message={t('devotionals.error')} onRetry={d.reload} />;
  if (!d.data) {
    return (
      <>
        <PageHeader title={t('devotionals.title')} />
        <ErrorState message={t('devotionals.notFound')} />
      </>
    );
  }
  const dev = d.data;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: dev.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {
      // user cancelled the share sheet
    }
  }

  return (
    <article lang={lang}>
      <PageHeader eyebrow={formatDate(new Date(`${dev.publicationDate}T00:00:00`), lang)} title={dev.title} />

      <section className={styles.devSection} aria-labelledby="dev-scripture">
        <h2 id="dev-scripture">{t('devotionals.scripture')}</h2>
        {dev.scriptureRefs.map((r) => (
          <div key={`${r.book}${r.chapter}${r.verseStart}`} className={styles.scriptureBox}>
            <PassageView
              bookCode={r.book}
              chapter={r.chapter}
              verseStart={r.verseStart}
              verseEnd={r.verseEnd}
              errorKey="devotionals.passageError"
            />
          </div>
        ))}
      </section>

      <section className={styles.devSection} aria-labelledby="dev-reflection">
        <h2 id="dev-reflection">{t('devotionals.reflection')}</h2>
        <p className={styles.devText}>{dev.reflection}</p>
      </section>

      <section className={styles.devSection} aria-labelledby="dev-application">
        <h2 id="dev-application">{t('devotionals.application')}</h2>
        <p className={styles.devText}>{dev.application}</p>
      </section>

      {dev.questions.length > 0 && (
        <section className={styles.devSection} aria-labelledby="dev-questions">
          <h2 id="dev-questions">{t('devotionals.questions')}</h2>
          <ul>
            {dev.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.devSection} aria-labelledby="dev-prayer">
        <h2 id="dev-prayer">{t('devotionals.prayer')}</h2>
        <p className={`${styles.devText} ${styles.prayerBox}`}>{dev.prayer}</p>
      </section>

      <footer className={styles.devSection}>
        <p className={styles.meta}>
          {t('devotionals.original', { author: dev.authorLabel })}
          {dev.reviewerLabel && ` ${t('devotionals.reviewed', { reviewer: dev.reviewerLabel })}`}
        </p>
        <Button variant="secondary" onClick={() => void share()}>
          {shared ? t('devotionals.shared') : t('devotionals.share')}
        </Button>
      </footer>
    </article>
  );
}
