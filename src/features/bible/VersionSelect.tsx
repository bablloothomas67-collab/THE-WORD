import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { BibleVersion } from '../../services/bible-provider/types';
import { getLanguage } from '../../config/languages';
import styles from './bible.module.css';

interface Props {
  versions: BibleVersion[];
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

/** Version picker grouped by language; option text in the version's own script. */
export function VersionSelect({ versions, value, onChange, label }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const languages = [...new Set(versions.map((v) => v.languageCode))];
  return (
    <div className={styles.versionSelect}>
      <label htmlFor={id} className={styles.smallLabel}>
        {label ?? t('bible.version')}
      </label>
      <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {languages.map((lang) => (
          <optgroup key={lang} label={getLanguage(lang).nativeName}>
            {versions
              .filter((v) => v.languageCode === lang)
              .map((v) => (
                <option key={v.code} value={v.code} lang={v.languageCode}>
                  {v.shortName} — {v.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
