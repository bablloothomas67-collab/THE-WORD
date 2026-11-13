import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, TextField } from '../components/ui';
import { useAuth } from '../features/auth/useAuth';
import { MAX_DISPLAY_NAME } from '../features/profile/profileService';
import { getLanguage } from '../config/languages';
import { PageHeader } from './PageHeader';
import { StudyLists } from '../features/study/StudyLists';
import { useAsync } from '../hooks/useAsync';
import { useUiLanguage } from '../features/bible/useBible';
import { contentService } from '../features/discover/contentService';
import { ContentList } from './DiscoverPage';
import { billingService } from '../features/billing/billingService';
import { usePremium } from '../features/billing/usePremium';
import { formatDate } from '../utils/format';
import styles from './pages.module.css';

const COMING_SOON = ['history', 'preferences'] as const;
const LINKS = [
  { to: '/prayer', key: 'journey.links.prayer' },
  { to: '/plans', key: 'journey.links.plans' },
  { to: '/devotionals', key: 'journey.links.devotionals' },
] as const;

/** Protected route: only rendered for signed-in users (see AppRoutes). */
export function JourneyPage() {
  const { t } = useTranslation();
  const { user, profile, profileError } = useAuth();

  return (
    <>
      <PageHeader title={t('journey.title')} lead={t('journey.intro')} />

      <Card title={t('journey.profile.title')} accent>
        {profileError ? (
          <ErrorState message={t('journey.profile.loadError')} />
        ) : (
          <>
            <dl className={styles.profileList}>
              <dt>{t('journey.profile.email')}</dt>
              <dd>{user?.email}</dd>
              <dt>{t('journey.profile.language')}</dt>
              <dd>{profile ? getLanguage(profile.preferredLanguage).nativeName : '—'}</dd>
            </dl>
            {profile && <ProfileNameForm key={profile.updatedAt} initialName={profile.displayName} />}
          </>
        )}
      </Card>

      <PremiumCard />

      <ul className={styles.list} style={{ marginTop: 'var(--space-5)' }}>
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className={styles.listItem}>
              {t(l.key)} <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className={styles.sectionTitle}>{t('journey.studyTitle')}</h2>
      <StudyLists />

      <h2 className={styles.sectionTitle}>{t('journey.savedTitle')}</h2>
      <SavedContent />

      <ul className={styles.list} style={{ marginTop: 'var(--space-6)' }}>
        {COMING_SOON.map((key) => (
          <li key={key} className={styles.listItem}>
            <span>{t(`journey.sections.${key}`)}</span>
            <Badge>{t('states.comingSoon')}</Badge>
          </li>
        ))}
      </ul>
    </>
  );
}

function PremiumCard() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const premium = usePremium();
  const admin = useAsync(() => billingService.isAdmin().catch(() => false), []);
  return (
    <div style={{ marginTop: 'var(--space-5)' }}>
      <Card title={t('premium.journey.title')}>
        <p>
          {premium.premium && premium.premiumUntil
            ? `${t('premium.active')} ${t('premium.until', { date: formatDate(new Date(premium.premiumUntil), lang) })}`
            : t('premium.journey.none')}
        </p>
        <Link to="/premium">{t('premium.journey.link')}</Link>
        {admin.data && (
          <>
            {' · '}
            <Link to="/admin">{t('admin.link')}</Link>
          </>
        )}
      </Card>
    </div>
  );
}

function SavedContent() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const saved = useAsync(() => contentService.listSaved(lang), [lang]);
  if (saved.loading) return <LoadingState />;
  if (saved.error) return <ErrorState message={t('journey.lists.loadError')} onRetry={saved.reload} />;
  if (!saved.data?.length) return <EmptyState body={t('journey.savedEmpty')} />;
  return <ContentList items={saved.data} />;
}

function ProfileNameForm({ initialName }: { initialName: string }) {
  const { t } = useTranslation();
  const { updateProfile } = useAuth();
  const [name, setName] = useState(initialName);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFieldError(t('auth.errors.nameRequired'));
      return;
    }
    setFieldError(undefined);
    setStatus('saving');
    try {
      await updateProfile({ displayName: name });
      setStatus('saved');
    } catch (err) {
      console.error('Profile update failed', err);
      setStatus('error');
    }
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      <TextField
        label={t('journey.profile.name')}
        autoComplete="name"
        maxLength={MAX_DISPLAY_NAME}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setStatus('idle');
        }}
        error={fieldError}
      />
      {status === 'error' && <ErrorState message={t('journey.profile.saveError')} />}
      <Button type="submit" variant="secondary" disabled={status === 'saving'}>
        {status === 'saving' ? t('journey.profile.saving') : t('journey.profile.save')}
      </Button>
      {status === 'saved' && (
        <span role="status" className={styles.savedNote}>
          {t('journey.profile.saved')}
        </span>
      )}
    </form>
  );
}
