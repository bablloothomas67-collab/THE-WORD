import { useTranslation } from 'react-i18next';
import { Badge, Card } from '../components/ui';
import { PageHeader } from './PageHeader';
import styles from './pages.module.css';

const CATEGORIES = ['stories', 'history', 'theology', 'apologetics', 'quizzes'] as const;

export function DiscoverPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('discover.title')} lead={t('discover.intro')} />
      <div className={`${styles.grid} ${styles.gridThree}`}>
        {CATEGORIES.map((key) => (
          <Card
            key={key}
            as="article"
            title={t(`discover.categories.${key}.title`)}
            aside={<Badge>{t('states.comingSoon')}</Badge>}
            accent
          >
            <p className={styles.muted}>{t(`discover.categories.${key}.body`)}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
