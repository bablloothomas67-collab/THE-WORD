import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from './navItems';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { LogoMark } from '../icons/Icons';
import { useAuth } from '../../features/auth/useAuth';
import styles from './navigation.module.css';

export function TopBar() {
  const { t } = useTranslation();
  const { user, service } = useAuth();

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarInner}>
        <Link to="/" className={styles.brand}>
          <LogoMark className={styles.brandMark} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{t('app.name')}</span>
            <span className={styles.brandNative} lang="ml">
              {t('app.nativeName')}
            </span>
          </span>
        </Link>

        {/* Desktop navigation; on small screens the bottom bar takes over. */}
        <nav aria-label={t('nav.primary')} className={styles.desktopNav}>
          <ul className={styles.desktopNavList}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => [styles.desktopLink, isActive ? styles.active : ''].join(' ')}
                >
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink
                to="/premium"
                className={({ isActive }) => [styles.desktopLink, isActive ? styles.active : ''].join(' ')}
              >
                {t('nav.premium')}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className={styles.controls}>
          <LanguageSelector />
          <ThemeToggle />
          {user ? (
            <button type="button" className={styles.signInLink} onClick={() => void service.signOut()}>
              {t('nav.signOut')}
            </button>
          ) : (
            <Link to="/login" className={styles.signInLink}>
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
