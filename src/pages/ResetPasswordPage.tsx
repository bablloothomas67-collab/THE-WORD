import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonLink, Card, EmptyState, ErrorState, LoadingState, TextField } from '../components/ui';
import { useAuth } from '../features/auth/useAuth';
import { validateNewPassword, type FieldErrors, type NewPasswordValues } from '../utils/validation';
import { PageHeader } from './PageHeader';
import styles from './pages.module.css';

/**
 * Opened from the password-reset email. Supabase reads the token from the
 * URL and creates a recovery session; without one the link is invalid.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { service, user, loading } = useAuth();
  const [values, setValues] = useState<NewPasswordValues>({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors<keyof NewPasswordValues>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const found = validateNewPassword(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const result = await service.updatePassword(values.password);
      if (result.ok) setDone(true);
      else setSubmitError(t(result.messageKey));
    } catch (err) {
      console.error('Password update failed', err);
      setSubmitError(t('auth.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  const err = (k: keyof NewPasswordValues) => (errors[k] ? t(errors[k]) : undefined);

  let body;
  if (loading) body = <LoadingState />;
  else if (done)
    body = (
      <EmptyState
        body={t('auth.resetDone')}
        action={<ButtonLink to="/journey">{t('nav.journey')}</ButtonLink>}
      />
    );
  else if (!user)
    body = (
      <EmptyState
        body={t('auth.resetInvalid')}
        action={<ButtonLink to="/forgot-password">{t('auth.requestNewLink')}</ButtonLink>}
      />
    );
  else
    body = (
      <form noValidate onSubmit={onSubmit} className={styles.stack}>
        <div>
          <TextField
            label={t('auth.newPassword')}
            type="password"
            autoComplete="new-password"
            hint={t('auth.passwordHint')}
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            error={err('password')}
          />
          <TextField
            label={t('auth.confirmPassword')}
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(e) => setValues((v) => ({ ...v, confirmPassword: e.target.value }))}
            error={err('confirmPassword')}
          />
        </div>
        {submitError && <ErrorState message={submitError} />}
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? t('auth.submitting') : t('auth.submitReset')}
        </Button>
      </form>
    );

  return (
    <div className={styles.authWrap}>
      <PageHeader title={t('auth.resetTitle')} lead={t('auth.resetIntro')} />
      <Card>{body}</Card>
    </div>
  );
}
