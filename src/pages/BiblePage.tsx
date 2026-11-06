import { useTranslation } from 'react-i18next';
import { Badge, Card, Notice } from '../components/ui';
import { PageHeader } from './PageHeader';
import styles from './pages.module.css';

/**
 * Placeholder only. Phase 2 adds the provider adapter, book/chapter
 * navigation and the reader. No scripture text is bundled or fabricated.
 */
export function BiblePage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('bible.title')} lead={t('bible.intro')} />
      <Notice>
        <strong>{t('bible.placeholderTitle')}</strong>
        <br />
        {t('bible.placeholderBody')}
      </Notice>
      <div className={styles.testaments}>
        <Card title={t('bible.oldTestament')} aside={<Badge>{t('states.notConnected')}</Badge>} />
        <Card title={t('bible.newTestament')} aside={<Badge>{t('states.notConnected')}</Badge>} />
      </div>
    </>
  );
}
