import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, ButtonLink, ErrorState, LoadingState, Notice } from '../components/ui';
import { PageHeader } from './PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../features/auth/useAuth';
import { pickDefaultVersion, useBooks, useUiLanguage, useVersions } from '../features/bible/useBible';
import { readerPath } from '../features/bible/readingState';
import { nextDay, plansService } from '../features/plans/plansService';
import { audioService } from '../features/audio/audioService';
import { AudioPlayer } from '../features/audio/AudioPlayer';
import { usePremium } from '../features/billing/usePremium';
import { PremiumHint } from '../features/billing/PremiumHint';
import styles from './pages.module.css';

export function PlanDetailPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const plan = useAsync(() => plansService.getPlan(slug, lang), [slug, lang]);
  const planId = plan.data?.id;
  const progress = useAsync(
    async () => (user && planId ? plansService.getProgress(planId) : { enrolled: false, completed: new Set<number>() }),
    [user?.id, planId],
  );
  const versions = useVersions();
  const version = pickDefaultVersion(versions.data ?? [], lang);
  const books = useBooks(version?.id);
  const names = new Map((books.data ?? []).map((b) => [b.code, b.name]));
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setSaveError(false);
    try {
      await action();
      progress.reload();
    } catch (err) {
      console.error('Plan update failed', err);
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  }

  if (plan.loading) return <LoadingState />;
  if (plan.error) return <ErrorState message={t('plans.error')} onRetry={plan.reload} />;
  if (!plan.data) {
    return (
      <>
        <PageHeader title={t('plans.title')} />
        <ErrorState message={t('plans.notFound')} />
      </>
    );
  }

  const p = plan.data;
  const enrolled = progress.data?.enrolled ?? false;
  const completed = progress.data?.completed ?? new Set<number>();
  const todayNumber = nextDay(p.durationDays, completed);
  const today = p.days.find((d) => d.dayNumber === todayNumber);

  return (
    <>
      <PageHeader eyebrow={t('plans.days', { count: p.durationDays })} title={p.title} lead={p.description} />

      {!user ? (
        <Notice>
          {t('plans.signIn')} <Link to="/login" state={{ from: `/plans/${p.slug}` }}>{t('nav.signIn')}</Link>
        </Notice>
      ) : enrolled ? (
        <>
          <p className={styles.meta}>{t('plans.progress', { done: completed.size, total: p.durationDays })}</p>
          <div className={styles.progressBar} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${(completed.size / p.durationDays) * 100}%` }} />
          </div>
        </>
      ) : (
        <div className={styles.actionsRow}>
          <Button disabled={busy} onClick={() => void run(() => plansService.startPlan(p.id))}>
            {t('plans.start')}
          </Button>
        </div>
      )}
      {saveError && <ErrorState message={t('plans.saveError')} />}
      {enrolled && today && <PlanDayAudio bookCode={today.bookCode} chapterStart={today.chapterStart} chapterEnd={today.chapterEnd} bookName={names.get(today.bookCode) ?? today.bookCode} />}

      <ol className={styles.dayList} style={{ marginTop: 'var(--space-4)' }}>
        {p.days.map((d) => {
          const bookName = names.get(d.bookCode) ?? d.bookCode;
          const reading =
            d.chapterStart === d.chapterEnd
              ? t('bible.reference', { book: bookName, chapter: d.chapterStart })
              : t('plans.range', { book: bookName, start: d.chapterStart, end: d.chapterEnd });
          const done = completed.has(d.dayNumber);
          return (
            <li key={d.dayNumber} className={`${styles.dayRow} ${done ? styles.dayDone : ''}`}>
              {enrolled && (
                <input
                  type="checkbox"
                  checked={done}
                  disabled={busy}
                  aria-label={t('plans.markDone', { day: d.dayNumber })}
                  onChange={(e) => void run(() => plansService.setDayDone(p.id, d.dayNumber, e.target.checked))}
                />
              )}
              <span className={styles.dayLabel}>{t('plans.day', { day: d.dayNumber })}</span>
              <span className={styles.dayReading}>{reading}</span>
              {version && (
                <ButtonLink variant="ghost" to={readerPath(version.code, d.bookCode, d.chapterStart)}>
                  {t('plans.read')}
                </ButtonLink>
              )}
            </li>
          );
        })}
      </ol>

      {enrolled && (
        <div className={styles.actionsRow}>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm(t('plans.leaveConfirm'))) void run(() => plansService.leavePlan(p.id));
            }}
          >
            {t('plans.leave')}
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * English recordings for the chapters of the reader's next unread day. Shows nothing
 * until a recording exists; shows a Premium line when it exists but is locked.
 */
function PlanDayAudio({ bookCode, chapterStart, chapterEnd, bookName }: { bookCode: string; chapterStart: number; chapterEnd: number; bookName: string }) {
  const { t } = useTranslation();
  const premium = usePremium();
  const chapters = Array.from({ length: chapterEnd - chapterStart + 1 }, (_, i) => chapterStart + i);
  const tracks = useAsync(
    () =>
      Promise.all(chapters.map((c) => audioService.getPlanChapter(bookCode, c))).catch((e: unknown) => {
        console.warn(e);
        return [];
      }),
    [bookCode, chapterStart, chapterEnd, premium.premium],
  );
  const available = (tracks.data ?? []).map((tr, i) => ({ ...tr, chapter: chapters[i] })).filter((tr) => tr.available);
  if (available.length === 0) return null;
  if (premium.locked || available.every((tr) => !tr.url)) return <PremiumHint messageKey="premium.locked.planAudio" />;
  return (
    <section aria-label={t('plans.listen')}>
      <h2 className={styles.sectionTitle}>{t('plans.listen')}</h2>
      {available.map(
        (tr) =>
          tr.url && (
            <AudioPlayer
              key={tr.chapter}
              src={tr.url}
              durationSecs={tr.durationSecs}
              label={t('bible.reference', { book: bookName, chapter: tr.chapter })}
              caption={t('plans.audioCaption')}
            />
          ),
      )}
    </section>
  );
}
