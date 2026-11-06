import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import styles from './ui.module.css';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`${styles.state} ${styles.stateCentered}`} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label ?? t('states.loading')}</span>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  body: string;
  action?: ReactNode;
  centered?: boolean;
}

export function EmptyState({ title, body, action, centered }: EmptyStateProps) {
  return (
    <div className={[styles.state, centered ? styles.stateCentered : ''].join(' ')}>
      {title && <p className={styles.stateTitle}>{title}</p>}
      <p className={styles.stateBody}>{body}</p>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.errorBox} role="alert">
      <p className={styles.stateTitle}>{t('states.errorTitle')}</p>
      {message && <p className={styles.stateBody}>{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('states.retry')}
        </Button>
      )}
    </div>
  );
}

/** Honest "this isn't connected yet" message for features awaiting integration. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className={styles.notice} role="note">
      {children}
    </div>
  );
}
