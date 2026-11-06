import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, ErrorState, Notice, TextField } from '../components/ui';
import { useAuth } from '../features/auth/useAuth';
import { validateEmailOnly } from '../utils/validation';
import { PageHeader } from './PageHeader';
import styles from './pages.module.css';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { service, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const found = validateEmailOnly(email);
    setFieldError(found.email);
    if (found.email) return;

    setSubmitting(true);
    try {
      const result = await service.requestPasswordReset(email);
      if (result.ok) setSent(true);
      else setSubmitError(t(result.messageKey));
    } catch (err) {
      console.error('Password reset request failed', err);
      setSubmitError(t('auth.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.authWrap}>
      <PageHeader title={t('auth.forgotTitle')} lead={t('auth.forgotIntro')} />
      <Card>
        {sent ? (
          <p className={styles.success} role="status">
            {t('auth.forgotSent')}
          </p>
        ) : (
          <form noValidate onSubmit={onSubmit} className={styles.stack}>
            {!isConfigured && <Notice>{t('auth.notConfigured')}</Notice>}
            <TextField
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldError ? t(fieldError) : undefined}
            />
            {submitError && <ErrorState message={submitError} />}
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? t('auth.submitting') : t('auth.submitForgot')}
            </Button>
          </form>
        )}
      </Card>
      <p className={styles.authFooter}>
        <Link to="/login">{t('auth.backToSignIn')}</Link>
      </p>
    </div>
  );
}
