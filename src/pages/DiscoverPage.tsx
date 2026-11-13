import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '../components/ui';
import { PageHeader } from './PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../features/auth/useAuth';
import { useUiLanguage } from '../features/bible/useBible';
import { CitedText, PassageDetails } from '../features/bible/Citations';
import { useRefLinks } from '../features/bible/useRefLinks';
import {
  contentPath,
  contentService,
  kindOfSection,
  scoreQuiz,
  SECTIONS,
  sectionOfKind,
  type ContentItem,
  type ContentSummary,
} from '../features/discover/contentService';
import styles from './pages.module.css';

/** Discover hub: one card per section with the number of items available in this language. */
export function DiscoverPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const all = useAsync(() => contentService.list(lang), [lang]);
  const count = (section: (typeof SECTIONS)[number]) =>
    all.data?.filter((c) => sectionOfKind(c.kind) === section).length ?? 0;

  return (
    <>
      <PageHeader title={t('discover.title')} lead={t('discover.intro')} />
      {all.error ? <ErrorState message={t('discover.error')} onRetry={all.reload} /> : null}
      <div className={`${styles.grid} ${styles.gridThree}`}>
        {SECTIONS.map((section) => (
          <Card
            key={section}
            as="article"
            title={<Link to={`/discover/${section}`}>{t(`discover.categories.${section}.title`)}</Link>}
            aside={all.data ? <Badge>{t('discover.count', { count: count(section) })}</Badge> : undefined}
            accent
          >
            <p className={styles.muted}>{t(`discover.categories.${section}.body`)}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

export function ContentList({ items }: { items: ContentSummary[] }) {
  return (
    <div className={styles.grid}>
      {items.map((c) => (
        <Card key={c.id} as="article" accent title={<Link to={contentPath(c.kind, c.slug)}>{c.title}</Link>}>
          <p className={styles.muted}>{c.summary}</p>
        </Card>
      ))}
    </div>
  );
}

export function DiscoverSectionPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const { section } = useParams();
  const kind = kindOfSection(section);
  const list = useAsync(() => (kind ? contentService.list(lang, kind) : Promise.resolve([])), [lang, kind]);

  if (!kind) {
    return (
      <>
        <PageHeader title={t('discover.title')} />
        <ErrorState message={t('discover.notFound')} />
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow={<Link to="/discover">{t('discover.title')}</Link>}
        title={t(`discover.categories.${section}.title`)}
        lead={t(`discover.categories.${section}.body`)}
      />
      {list.loading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={t('discover.error')} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <EmptyState body={t('discover.none')} />
      ) : (
        <ContentList items={list.data} />
      )}
    </>
  );
}

export function ContentPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const { section, slug = '' } = useParams();
  const kind = kindOfSection(section);
  const item = useAsync(() => contentService.get(slug, lang), [slug, lang]);

  if (item.loading) return <LoadingState />;
  if (item.error) return <ErrorState message={t('discover.error')} onRetry={item.reload} />;
  if (!item.data || item.data.kind !== kind) {
    return (
      <>
        <PageHeader title={t('discover.title')} />
        <ErrorState message={t('discover.notFound')} />
      </>
    );
  }
  const c = item.data;
  return (
    <article lang={lang}>
      <PageHeader
        eyebrow={<Link to={`/discover/${section}`}>{t(`discover.categories.${section}.title`)}</Link>}
        title={c.title}
        lead={c.summary}
      />
      {c.kind === 'quiz' ? <Quiz key={`${c.id}${lang}`} item={c} /> : <Article item={c} />}
      <footer className={styles.devSection}>
        <p className={styles.meta}>
          {t('discover.original', { author: c.authorLabel })}
          {c.reviewerLabel && ` ${t('discover.reviewed', { reviewer: c.reviewerLabel })}`}
        </p>
        <SaveButton contentId={c.id} />
      </footer>
    </article>
  );
}

function Article({ item }: { item: ContentItem }) {
  const { t } = useTranslation();
  const { label, link } = useRefLinks();
  return (
    <>
      {item.sections.map((s, i) => (
        <section key={i} className={`${styles.devSection} ${styles.devText}`}>
          {s.heading && <h2>{s.heading}</h2>}
          <CitedText text={s.body} refs={item.scriptureRefs} link={link} />
        </section>
      ))}

      {item.scriptureRefs.length > 0 && (
        <section className={styles.askPassages} aria-labelledby="content-passages">
          <h3 id="content-passages">{t('discover.passages')}</h3>
          {item.scriptureRefs.map((ref, i) => (
            <PassageDetails key={i} title={label(ref)} passage={ref} errorKey="discover.passageError" />
          ))}
        </section>
      )}

      {item.sources.length > 0 && (
        <section className={styles.devSection} aria-labelledby="content-sources">
          <h2 id="content-sources">{t('discover.sources')}</h2>
          <ul className={styles.sourceList}>
            {item.sources.map((s) => (
              <li key={s.label}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                ) : (
                  s.label
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Quiz({ item }: { item: ContentItem }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { link } = useRefLinks();
  const [answers, setAnswers] = useState<Array<number | null>>(() => item.questions.map(() => null));
  const [checked, setChecked] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const best = useAsync(
    () => (user ? contentService.bestAttempt(item.id) : Promise.resolve(null)),
    [user?.id, item.id, checked],
  );
  const total = item.questions.length;
  const unanswered = answers.filter((a) => a === null).length;
  const score = scoreQuiz(item.questions, answers);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (unanswered > 0) return;
    setSaveFailed(false);
    if (user) {
      try {
        await contentService.recordAttempt(item.id, score, total);
      } catch (err) {
        console.error(err);
        setSaveFailed(true);
      }
    }
    setChecked(true);
  }

  function retry() {
    setAnswers(item.questions.map(() => null));
    setChecked(false);
    window.scrollTo({ top: 0 });
  }

  if (total === 0) return <EmptyState body={t('discover.none')} />;

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      {best.data && (
        <p className={styles.meta} role="status">
          {t('discover.quiz.best', { ...best.data })}
        </p>
      )}
      {checked && (
        <p className={styles.quizScore} role="status">
          {t('discover.quiz.score', { score, total })}
        </p>
      )}
      <ol className={styles.quizList}>
        {item.questions.map((q, i) => (
          <li key={i}>
            <fieldset className={styles.quizQuestion} disabled={checked}>
              <legend>{q.prompt}</legend>
              {q.options.map((option, j) => (
                <label
                  key={j}
                  className={styles.quizOption}
                  data-state={checked ? (j === q.correct ? 'correct' : answers[i] === j ? 'wrong' : undefined) : undefined}
                >
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === j}
                    onChange={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))}
                  />
                  <span>{option}</span>
                  {checked && j === q.correct && <Badge>{t('discover.quiz.correctAnswer')}</Badge>}
                </label>
              ))}
            </fieldset>
            {checked && (
              <p className={styles.askNote}>
                <strong>{answers[i] === q.correct ? t('discover.quiz.right') : t('discover.quiz.wrong')}</strong>{' '}
                {q.explanation}
                {q.ref && <> ({link(q.ref)})</>}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className={styles.actionsRow}>
        {checked ? (
          <Button type="button" variant="secondary" onClick={retry}>
            {t('discover.quiz.retry')}
          </Button>
        ) : (
          <Button type="submit" disabled={unanswered > 0}>
            {t('discover.quiz.check')}
          </Button>
        )}
        {!checked && unanswered > 0 && (
          <span className={styles.meta}>{t('discover.quiz.unanswered', { count: unanswered })}</span>
        )}
        {checked && !user && <span className={styles.meta}>{t('discover.quiz.signInToSave')}</span>}
      </div>
      {saveFailed && <ErrorState message={t('discover.quiz.saveError')} />}
    </form>
  );
}

/** Save / remove from "Saved content" in My Journey. Shown only to signed-in users. */
function SaveButton({ contentId }: { contentId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const saved = useAsync(() => (user ? contentService.isSaved(contentId) : Promise.resolve(false)), [user?.id, contentId]);
  const [override, setOverride] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!user || saved.loading || saved.error) return null;
  const isSaved = override ?? saved.data ?? false;

  async function toggle() {
    setBusy(true);
    setFailed(false);
    try {
      if (isSaved) await contentService.unsave(contentId);
      else await contentService.save(contentId);
      setOverride(!isSaved);
    } catch (err) {
      console.error(err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => void toggle()} disabled={busy} aria-pressed={isSaved}>
        {isSaved ? t('discover.saved') : t('discover.save')}
      </Button>
      {failed && <ErrorState message={t('discover.saveError')} />}
    </>
  );
}
