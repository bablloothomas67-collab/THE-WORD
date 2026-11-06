import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { MoonIcon, SunIcon } from '../icons/Icons';
import styles from './navigation.module.css';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const label = theme === 'light' ? t('theme.toDark') : t('theme.toLight');
  return (
    <button type="button" className={styles.iconButton} onClick={toggle} aria-label={label} title={label}>
      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
