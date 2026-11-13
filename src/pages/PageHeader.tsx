import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './pages.module.css';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: string;
  lead?: ReactNode;
}

/** Page title block; also keeps the browser tab title in sync. */
export function PageHeader({ eyebrow, title, lead }: PageHeaderProps) {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = `${title} · ${t('app.name')}`;
  }, [title, t]);

  return (
    <header className={styles.pageHeader}>
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h1>{title}</h1>
      {lead && <p className={styles.lead}>{lead}</p>}
    </header>
  );
}
