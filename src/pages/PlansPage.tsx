import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Card, ErrorState, LoadingState } from '../components/ui';
import { PageHeader } from './PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../features/auth/useAuth';
import { useUiLanguage } from '../features/bible/useBible';
import { nextDay, plansService } from '../features/plans/plansService';
import styles from './pages.module.css';

export function PlansPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const { user } = useAuth();
  const plans = useAsync(() => plansService.listPlans(lang), [lang]);
  const mine = useAsync(async () => (user ? plansService.listMyPlans(lang) : []), [user?.id, lang]);
  const progress = new Map((mine.data ?? []).map((m) => [m.plan.id, m.completed.size]));

  return (
    <>
      <PageHeader title={t('plans.title')} lead={t('plans.intro')} />
      {plans.loading ? (
        <LoadingState />
      ) : plans.error ? (
        <ErrorState message={t('plans.error')} onRetry={plans.reload} />
      ) : (
        <div className={`${styles.grid} ${styles.gridThree}`}>
          {(plans.data ?? []).map((p) => {
            const done = progress.get(p.id);
            const finished = done !== undefined && nextDay(p.durationDays, mine.data!.find((m) => m.plan.id === p.id)!.completed) === null;
            return (
              <Card
                key={p.id}
                as="article"
                accent
                title={<Link to={`/plans/${p.slug}`}>{p.title}</Link>}
                aside={<Badge>{finished ? t('plans.complete') : t('plans.days', { count: p.durationDays })}</Badge>}
              >
                <p className={styles.muted}>{p.description}</p>
                {done !== undefined && (
                  <>
                    <div className={styles.progressBar} aria-hidden="true">
                      <div className={styles.progressFill} style={{ width: `${(done / p.durationDays) * 100}%` }} />
                    </div>
                    <p className={styles.meta}>{t('plans.progress', { done, total: p.durationDays })}</p>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
