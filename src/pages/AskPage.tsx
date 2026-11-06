import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Notice } from '../components/ui';
import { PageHeader } from './PageHeader';
import styles from './pages.module.css';

/**
 * Placeholder only. The study assistant (Phase 4) will call a server-side
 * Supabase Edge Function — never an AI provider directly from the browser.
 * The form is shown disabled so the layout can be reviewed.
 */
export function AskPage() {
  const { t } = useTranslation();
  const inputId = useId();
  return (
    <>
      <PageHeader title={t('ask.title')} lead={t('ask.intro')} />
      <Notice>
        <strong>{t('ask.placeholderTitle')}</strong>
        <br />
        {t('ask.placeholderBody')}
      </Notice>
      <form className={styles.askForm} onSubmit={(e) => e.preventDefault()} aria-disabled="true">
        <label htmlFor={inputId} className="visually-hidden">
          {t('ask.inputLabel')}
        </label>
        <textarea id={inputId} className={styles.textarea} placeholder={t('ask.inputPlaceholder')} disabled />
        <p />
        <Button type="submit" disabled>
          {t('ask.submit')}
        </Button>
        <p className={styles.disclaimer}>{t('ask.disclaimer')}</p>
      </form>
    </>
  );
}
