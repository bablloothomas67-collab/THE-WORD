import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BUSINESS } from '../../config/business';
import styles from './navigation.module.css';

const LINKS = [
  { to: '/premium', key: 'footer.premium' },
  { to: '/terms', key: 'footer.terms' },
  { to: '/privacy', key: 'footer.privacy' },
  { to: '/refunds', key: 'footer.refunds' },
  { to: '/contact', key: 'footer.contact' },
] as const;

/** Site-wide footer: legal pages, contact and who runs the service. */
export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className={styles.siteFooter}>
      <nav aria-label={t('footer.label')}>
        <ul className={styles.footerList}>
          {LINKS.map(({ to, key }) => (
            <li key={to}>
              <Link to={to}>{t(key)}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className={styles.footerNote}>{t('footer.runBy', { name: BUSINESS.legalName })}</p>
    </footer>
  );
}
