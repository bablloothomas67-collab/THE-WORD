import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, ErrorState, Notice, TextField } from '../components/ui';
import { useAuth } from '../features/auth/useAuth';
import { validateLogin, type FieldErrors, type LoginValues } from '../utils/validation';
import { PageHeader } from './PageHeader';
import styles from './pages.module.css';

/** Only allow redirects to in-app paths (prevents open redirects). */
function safeRedirect(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/journey';
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { service, isConfigured } = useAuth();
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<keyof LoginValues>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const result = await service.signIn(values.email, values.password);
      if (result.ok) navigate(safeRedirect((location.state as { from?: unknown } | null)?.from), { replace: true });
      else setSubmitError(t(result.messageKey));
    } catch (err) {
      console.error('Sign-in failed', err);
      setSubmitError(t('auth.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  const err = (k: keyof LoginValues) => (errors[k] ? t(errors[k]) : undefined);

  return (
    <div className={styles.authWrap}>
      <PageHeader title={t('auth.loginTitle')} lead={t('auth.loginIntro')} />
      <Card>
        <form noValidate onSubmit={onSubmit} className={styles.stack}>
          {!isConfigured && <Notice>{t('auth.notConfigured')}</Notice>}
          <div>
            <TextField
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              error={err('email')}
            />
            <TextField
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              error={err('password')}
            />
            <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
          </div>
          {submitError && <ErrorState message={submitError} />}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? t('auth.submitting') : t('auth.submitLogin')}
          </Button>
        </form>
      </Card>
      <p className={styles.authFooter}>
        {t('auth.noAccount')} <Link to="/register">{t('auth.createOne')}</Link>
      </p>
      <p className={styles.authFooter}>{t('auth.privacy')}</p>
    </div>
  );
}
