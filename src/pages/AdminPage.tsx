import { useTranslation } from 'react-i18next';
import { Card, ErrorState, LoadingState } from '../components/ui';
import { PageHeader } from './PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useUiLanguage } from '../features/bible/useBible';
import { billingService, formatRupees } from '../features/billing/billingService';
import { formatDate } from '../utils/format';
import styles from './pages.module.css';

type Counts = Record<string, number>;

function CountList({ counts }: { counts: Counts }) {
  const { t } = useTranslation();
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <p className={styles.muted}>{t('admin.none')}</p>;
  return (
    <dl className={styles.profileList}>
      {entries.map(([k, n]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{n}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Read-only numbers for the owner. The database function behind it refuses anyone
 * without the admin role, so hiding the link is a convenience, not the protection.
 */
export function AdminPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const o = useAsync(() => billingService.adminOverview(), []);

  if (o.loading) return <LoadingState />;
  if (o.error || !o.data) {
    return (
      <>
        <PageHeader title={t('admin.title')} />
        <ErrorState message={t('admin.denied')} />
      </>
    );
  }
  const d = o.data;
  const num = (k: string) => Number(d[k] ?? 0);
  const audit = Array.isArray(d.recent_audit) ? (d.recent_audit as { action: string; target_type: string; created_at: string }[]) : [];

  return (
    <>
      <PageHeader title={t('admin.title')} lead={t('admin.intro')} />
      <div className={styles.grid}>
        <Card title={t('admin.users')} accent>
          <dl className={styles.profileList}>
            <dt>{t('admin.total')}</dt>
            <dd>{num('users')}</dd>
            <dt>{t('admin.last7')}</dt>
            <dd>{num('users_last_7_days')}</dd>
            <dt>{t('admin.premiumUsers')}</dt>
            <dd>{num('premium_users')}</dd>
          </dl>
        </Card>
        <Card title={t('admin.payments')} accent>
          <p>{d.paywall_live === true ? t('admin.paywallOn') : t('admin.paywallOff')}</p>
          <p>
            {t('admin.revenue')}: {formatRupees(num('revenue_paise'), lang)}
          </p>
          <CountList counts={(d.subscriptions ?? {}) as Counts} />
        </Card>
        <Card title={t('admin.content')} accent>
          <CountList counts={(d.content ?? {}) as Counts} />
        </Card>
        <Card title={t('admin.devotionals')} accent>
          <CountList counts={(d.devotionals ?? {}) as Counts} />
          <p className={styles.meta}>
            {t('admin.audio')}: {num('audio_tracks')}
          </p>
        </Card>
        <Card title={t('admin.usage')} accent>
          <p>
            {t('admin.askLast7')}: {num('ask_questions_last_7_days')}
          </p>
        </Card>
      </div>
      <h2 className={styles.sectionTitle}>{t('admin.audit')}</h2>
      <ul className={styles.list}>
        {audit.map((a, i) => (
          <li key={i} className={styles.listItem}>
            <span>
              {a.action} · {a.target_type}
            </span>
            <span className={styles.meta}>{formatDate(new Date(a.created_at), lang)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
