import { useTranslation } from 'react-i18next';
import { Badge, ButtonLink, Card, EmptyState, LoadingState } from '../components/ui';
import { useAuth } from '../features/auth/useAuth';
import { PageHeader } from './PageHeader';
import styles from './pages.module.css';

const SECTIONS = ['bookmarks', 'highlights', 'notes', 'history', 'plans', 'prayer', 'saved', 'preferences'] as const;

export function JourneyPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  return (
    <>
      <PageHeader title={t('journey.title')} lead={t('journey.intro')} />

      {loading ? (
        <LoadingState />
      ) : !user ? (
        <Card>
          <EmptyState
            title={t('journey.signedOutTitle')}
            body={t('journey.signedOutBody')}
            action={<ButtonLink to="/login">{t('nav.signIn')}</ButtonLink>}
          />
        </Card>
      ) : null}

      <ul className={styles.list} style={{ marginTop: 'var(--space-5)' }}>
        {SECTIONS.map((key) => (
          <li key={key} className={styles.listItem}>
            <span>{t(`journey.sections.${key}`)}</span>
            <Badge>{t('states.comingSoon')}</Badge>
          </li>
        ))}
      </ul>
    </>
  );
}
