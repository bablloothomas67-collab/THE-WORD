import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from '../../pages/pages.module.css';

/** One quiet line where a premium feature is locked; never a pop-up. */
export function PremiumHint({ messageKey }: { messageKey: string }) {
  const { t } = useTranslation();
  return (
    <p className={styles.askNote}>
      {t(messageKey)} <Link to="/premium">{t('premium.seePlans')}</Link>
    </p>
  );
}
