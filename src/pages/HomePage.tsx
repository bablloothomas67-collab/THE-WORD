import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ButtonLink, Card, EmptyState, LoadingState } from '../components/ui';
import { formatDate } from '../utils/format';
import { PageHeader } from './PageHeader';
import { getReadingPosition, readerPath } from '../features/bible/readingState';
import { PassageView } from '../features/bible/PassageView';
import { useBooks, useUiLanguage, useVersions, pickDefaultVersion } from '../features/bible/useBible';
import { dailyVerseService, pickDailyRef } from '../features/daily/dailyVerse';
import { devotionalService } from '../features/devotionals/devotionalService';
import { nextDay, plansService } from '../features/plans/plansService';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../features/auth/useAuth';
import styles from './pages.module.css';

export function HomePage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const [today] = useState(() => new Date());
  const [position] = useState(getReadingPosition);
  const daily = useAsync(async () => pickDailyRef(await dailyVerseService.listApproved(), today), [today]);
  const devotional = useAsync(async () => (await devotionalService.list(lang, 1))[0] ?? null, [lang]);

  return (
    <>
      <PageHeader eyebrow={formatDate(today, lang)} title={t('home.greeting')} lead={t('home.intro')} />

      <div className={`${styles.grid} ${styles.gridThree}`}>
        <Card className={`${styles.verseCard} ${styles.span2}`} title={t('home.dailyVerse.title')}>
          {daily.loading ? (
            <LoadingState />
          ) : daily.data ? (
            <PassageView
              tone="dark"
              bookCode={daily.data.bookCode}
              chapter={daily.data.chapter}
              verseStart={daily.data.verseStart}
              verseEnd={daily.data.verseEnd}
              errorKey="home.dailyVerse.unavailable"
            />
          ) : (
            <p>{t('home.dailyVerse.unavailable')}</p>
          )}
        </Card>

        <Card title={t('home.ask.title')} accent>
          <p className={styles.muted}>{t('home.ask.body')}</p>
          <p />
          <ButtonLink to="/ask">{t('home.ask.action')}</ButtonLink>
        </Card>

        <Card title={t('home.devotional.title')}>
          {devotional.loading ? (
            <LoadingState />
          ) : devotional.data ? (
            <>
              <h3 className={styles.cardSubtitle}>{devotional.data.title}</h3>
              <ButtonLink to={`/devotionals/${devotional.data.slug}`}>{t('home.devotional.read')}</ButtonLink>
            </>
          ) : (
            <EmptyState body={t('home.devotional.none')} />
          )}
          <p className={styles.cardFooterLink}>
            <Link to="/devotionals">{t('home.devotional.all')}</Link>
          </p>
        </Card>

        <Card title={t('home.continue.title')}>
          {position ? (
            <ButtonLink to={readerPath(position.versionCode, position.bookCode, position.chapter)}>
              {t('home.continue.resume', {
                reference: t('bible.reference', { book: position.bookName, chapter: position.chapter }),
              })}
            </ButtonLink>
          ) : (
            <EmptyState
              body={t('home.continue.empty')}
              action={
                <ButtonLink to="/bible" variant="secondary">
                  {t('home.continue.action')}
                </ButtonLink>
              }
            />
          )}
        </Card>

        <Card title={t('home.plan.title')}>
          <HomePlan />
        </Card>
      </div>
    </>
  );
}

function HomePlan() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const { user, loading } = useAuth();
  const mine = useAsync(async () => (user ? plansService.listMyPlans(lang) : []), [user?.id, lang]);
  const versions = useVersions();
  const version = pickDefaultVersion(versions.data ?? [], lang);
  const books = useBooks(version?.id);

  if (loading || mine.loading) return <LoadingState />;
  if (!user) {
    return (
      <EmptyState
        body={t('home.plan.signIn')}
        action={
          <ButtonLink to="/plans" variant="secondary">
            {t('home.plan.action')}
          </ButtonLink>
        }
      />
    );
  }
  const active = mine.data?.[0];
  if (!active) {
    return (
      <EmptyState
        body={t('home.plan.empty')}
        action={
          <ButtonLink to="/plans" variant="secondary">
            {t('home.plan.action')}
          </ButtonLink>
        }
      />
    );
  }
  const day = nextDay(active.plan.durationDays, active.completed);
  return <PlanSummary planSlug={active.plan.slug} title={active.plan.title} day={day} total={active.plan.durationDays} bookNames={new Map((books.data ?? []).map((b) => [b.code, b.name]))} />;
}

function PlanSummary(props: { planSlug: string; title: string; day: number | null; total: number; bookNames: Map<string, string> }) {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const detail = useAsync(() => plansService.getPlan(props.planSlug, lang), [props.planSlug, lang]);
  const today = props.day && detail.data?.days.find((d) => d.dayNumber === props.day);
  const reading = today
    ? today.chapterStart === today.chapterEnd
      ? t('bible.reference', { book: props.bookNames.get(today.bookCode) ?? today.bookCode, chapter: today.chapterStart })
      : t('plans.range', { book: props.bookNames.get(today.bookCode) ?? today.bookCode, start: today.chapterStart, end: today.chapterEnd })
    : '';
  return (
    <>
      <h3 className={styles.cardSubtitle}>{props.title}</h3>
      <p className={styles.muted}>
        {props.day ? t('home.plan.next', { day: props.day, total: props.total, reading }) : t('home.plan.done')}
      </p>
      <p />
      <ButtonLink to={`/plans/${props.planSlug}`} variant="secondary">
        {t('home.plan.open')}
      </ButtonLink>
    </>
  );
}
