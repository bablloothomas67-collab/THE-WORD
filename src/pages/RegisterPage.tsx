import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, ErrorState, Notice, TextField } from '../components/ui';
import { useAuth } from '../features/auth/useAuth';
import { isEnabledLanguage } from '../config/languages';
import { validateRegister, type FieldErrors, type RegisterValues } from '../utils/validation';
import { PageHeader } from './PageHeader';
import styles from './pages.module.css';

const EMPTY: RegisterValues = { displayName: '', email: '', password: '', confirmPassword: '' };

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { service, isConfigured } = useAuth();
  const [values, setValues] = useState<RegisterValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<keyof RegisterValues>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof RegisterValues) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const err = (k: keyof RegisterValues) => (errors[k] ? t(errors[k]) : undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const result = await service.signUp({
        email: values.email,
        password: values.password,
        displayName: values.displayName,
        preferredLanguage: isEnabledLanguage(i18n.language) ? i18n.language : 'en',
      });
      if (!result.ok) {
        setSubmitError(result.code === 'not_configured' ? t('auth.notConfigured') : t('auth.errors.generic'));
      } else if (result.needsEmailConfirmation) {
        setConfirmationSent(true);
      } else {
        navigate('/journey');
      }
    } catch (error) {
      console.error('Registration failed', error);
      setSubmitError(t('auth.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.authWrap}>
      <PageHeader title={t('auth.registerTitle')} lead={t('auth.registerIntro')} />
      <Card>
        {confirmationSent ? (
          <p className={styles.success} role="status">
            {t('auth.registered')}
          </p>
        ) : (
          <form noValidate onSubmit={onSubmit} className={styles.stack}>
            {!isConfigured && <Notice>{t('auth.notConfigured')}</Notice>}
            <div>
              <TextField
                label={t('auth.displayName')}
                autoComplete="name"
                value={values.displayName}
                onChange={set('displayName')}
                error={err('displayName')}
              />
              <TextField
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={set('email')}
                error={err('email')}
              />
              <TextField
                label={t('auth.password')}
                type="password"
                autoComplete="new-password"
                hint={t('auth.passwordHint')}
                value={values.password}
                onChange={set('password')}
                error={err('password')}
              />
              <TextField
                label={t('auth.confirmPassword')}
                type="password"
                autoComplete="new-password"
                value={values.confirmPassword}
                onChange={set('confirmPassword')}
                error={err('confirmPassword')}
              />
            </div>
            {submitError && <ErrorState message={submitError} />}
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? t('auth.submitting') : t('auth.submitRegister')}
            </Button>
          </form>
        )}
      </Card>
      <p className={styles.authFooter}>
        {t('auth.haveAccount')} <Link to="/login">{t('auth.loginTitle')}</Link>
      </p>
      <p className={styles.authFooter}>{t('auth.privacy')}</p>
    </div>
  );
}
