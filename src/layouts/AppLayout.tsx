import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/navigation/TopBar';
import { BottomNav } from '../components/navigation/BottomNav';
import styles from './layout.module.css';

export function AppLayout() {
  const { t } = useTranslation();
  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">
        {t('app.skipToContent')}
      </a>
      <TopBar />
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
