import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ENABLED_LANGUAGES, isEnabledLanguage } from '../../config/languages';
import { useAuth } from '../../features/auth/useAuth';
import styles from './navigation.module.css';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useAuth();
  const id = useId();

  return (
    <div className={styles.languageSelector}>
      <label htmlFor={id} className="visually-hidden">
        {t('language.label')}
      </label>
      <select
        id={id}
        className={styles.select}
        value={i18n.language}
        onChange={(e) => {
          const next = e.target.value;
          if (isEnabledLanguage(next)) {
            setLanguage(next).catch((err: unknown) => console.error('Language change failed', err));
          }
        }}
      >
        {ENABLED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} lang={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
