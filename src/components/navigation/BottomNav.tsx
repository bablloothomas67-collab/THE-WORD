import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from './navItems';
import styles from './navigation.module.css';

/** Mobile bottom navigation. Hidden on wide screens via CSS. */
export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('nav.primary')} className={styles.bottomNav}>
      <ul className={styles.bottomNavList}>
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => [styles.bottomLink, isActive ? styles.active : ''].join(' ')}
            >
              <Icon className={styles.bottomIcon} />
              <span className={styles.bottomLabel}>{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
