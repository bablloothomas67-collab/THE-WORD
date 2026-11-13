import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, ButtonLink, Card, ErrorState, LoadingState, Notice } from '../components/ui';
import { PageHeader } from './PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../features/auth/useAuth';
import { useUiLanguage } from '../features/bible/useBible';
import { BillingError, billingService, formatRupees, openCheckout, PLAN_IDS, type PlanId } from '../features/billing/billingService';
import { usePremium } from '../features/billing/usePremium';
import { formatDate } from '../utils/format';
import styles from './pages.module.css';

const FEATURES = ['ask', 'devotionalAudio', 'planAudio', 'discover', 'plans'] as const;
/** Shown before sign-in; the amount actually charged always comes from the server. */
const LIST_PRICES: Record<PlanId, number> = { monthly: 14900, yearly: 119900 };

export function PremiumPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const { user } = useAuth();
  const premium = usePremium();
  const status = useAsync(() => (user ? billingService.status() : Promise.resolve(null)), [user?.id]);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [justPaid, setJustPaid] = useState(false);

  async function buy(plan: PlanId) {
    setBusy(plan);
    setErrorKey(null);
    try {
      const order = await billingService.createOrder(plan);
      const result = await openCheckout(order, { name: t('app.name'), description: t(`premium.plans.${plan}.name`), email: user?.email });
      if (!result) return; // closed without paying
      await billingService.verify(result);
      setJustPaid(true);
      premium.reload();
    } catch (err) {
      console.error(err);
      const code = err instanceof BillingError ? err.code : 'unavailable';
      setErrorKey(`premium.errors.${code}`);
    } finally {
      setBusy(null);
    }
  }

  const paymentsOpen = status.data?.configured === true;

  return (
    <>
      <PageHeader title={t('premium.title')} lead={t('premium.intro')} />

      {premium.premium && premium.premiumUntil && (
        <Notice>
          <strong>{justPaid ? t('premium.thankYou') : t('premium.active')}</strong>{' '}
          {t('premium.until', { date: formatDate(new Date(premium.premiumUntil), lang) })}
        </Notice>
      )}

      <Card title={t('premium.featuresTitle')} accent>
        <ul>
          {FEATURES.map((f) => (
            <li key={f}>{t(`premium.features.${f}`)}</li>
          ))}
        </ul>
        <p className={styles.meta}>{t('premium.freeStays')}</p>
      </Card>

      <div className={styles.grid} style={{ marginTop: 'var(--space-5)' }}>
        {PLAN_IDS.map((plan) => (
          <Card
            key={plan}
            as="article"
            title={t(`premium.plans.${plan}.name`)}
            aside={plan === 'yearly' ? <Badge>{t('premium.bestValue')}</Badge> : undefined}
          >
            <p className={styles.quizScore}>{formatRupees(status.data?.plans[plan].amountPaise ?? LIST_PRICES[plan], lang)}</p>
            <p className={styles.muted}>{t(`premium.plans.${plan}.detail`)}</p>
            {!user ? (
              <ButtonLink to="/login" state={{ from: '/premium' }}>
                {t('premium.signInToBuy')}
              </ButtonLink>
            ) : status.loading ? (
              <LoadingState />
            ) : (
              <Button disabled={!paymentsOpen || busy !== null} onClick={() => void buy(plan)}>
                {busy === plan ? t('premium.opening') : premium.premium ? t('premium.extend') : t('premium.buy')}
              </Button>
            )}
          </Card>
        ))}
      </div>

      {user && !status.loading && !paymentsOpen && <Notice>{t('premium.notOpen')}</Notice>}
      {status.error ? <ErrorState message={t('premium.errors.unavailable')} onRetry={status.reload} /> : null}
      {errorKey && <ErrorState message={t(errorKey)} />}
      <p className={styles.meta}>{t('premium.terms')}</p>
    </>
  );
}
