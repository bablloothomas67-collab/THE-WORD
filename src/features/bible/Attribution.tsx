import { useTranslation } from 'react-i18next';
import type { BibleVersion } from '../../services/bible-provider/types';
import styles from './bible.module.css';

/** Copyright / licence notice required by each version's terms. Always shown under scripture. */
export function Attribution({ version }: { version: BibleVersion }) {
  const { t } = useTranslation();
  return (
    <footer className={styles.attribution} aria-label={t('bible.copyright')}>
      <p lang={version.languageCode === 'ml' ? 'ml' : 'en'}>
        <strong>{version.name}</strong>
      </p>
      <p lang="en">{version.copyrightNotice}</p>
      <p>
        {version.licenceUrl ? (
          <a href={version.licenceUrl} target="_blank" rel="noopener noreferrer">
            {t('bible.licence', { licence: version.licence })}
          </a>
        ) : (
          t('bible.licence', { licence: version.licence })
        )}
        {version.sourceUrl && (
          <>
            {' · '}
            <a href={version.sourceUrl} target="_blank" rel="noopener noreferrer">
              {t('bible.source')}
            </a>
          </>
        )}
      </p>
    </footer>
  );
}
