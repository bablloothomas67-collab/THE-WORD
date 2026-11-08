import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, EmptyState, ErrorState, LoadingState, Notice, TextField } from '../components/ui';
import { PageHeader } from './PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../features/auth/useAuth';
import { useUiLanguage } from '../features/bible/useBible';
import { formatDate } from '../utils/format';
import {
  exportPrayers,
  MAX_BODY,
  MAX_TITLE,
  PRAYER_CATEGORIES,
  prayerService,
  validatePrayer,
  type PrayerCategory,
  type PrayerEntry,
  type PrayerInput,
} from '../features/prayer/prayerService';
import styles from './pages.module.css';

type Filter = 'all' | 'open' | 'answered';

/** Protected route. Private journal — owner-only RLS, no admin or analytics access. */
export function PrayerPage() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const { user } = useAuth();
  const entries = useAsync(() => prayerService.list(), [user?.id]);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<PrayerEntry | 'new' | null>(null);
  const [actionError, setActionError] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setActionError(false);
    try {
      await action();
      entries.reload();
    } catch {
      // Deliberately not logging the error object: it could contain prayer text.
      console.error('Prayer journal action failed');
      setActionError(true);
    }
  }

  function download() {
    const blob = new Blob([exportPrayers(entries.data ?? [])], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `the-word-prayers-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const list = (entries.data ?? []).filter((e) => filter === 'all' || e.status === filter);

  return (
    <>
      <PageHeader title={t('prayer.title')} lead={t('prayer.intro')} />
      <Notice>{t('prayer.privacy')}</Notice>

      <div className={styles.actionsRow}>
        {!editing && <Button onClick={() => setEditing('new')}>{t('prayer.new')}</Button>}
        <div role="group" aria-label={t('prayer.filterAll')} className={styles.actionsRow} style={{ margin: 0 }}>
          {(['all', 'open', 'answered'] as const).map((f) => (
            <Button key={f} variant={filter === f ? 'primary' : 'secondary'} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {t(f === 'all' ? 'prayer.filterAll' : f === 'open' ? 'prayer.filterOpen' : 'prayer.filterAnswered')}
            </Button>
          ))}
        </div>
      </div>

      {editing && (
        <PrayerForm
          entry={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === 'new') await prayerService.create(input);
            else await prayerService.update(editing.id, input);
            setEditing(null);
            entries.reload();
          }}
        />
      )}
      {actionError && <ErrorState message={t('prayer.saveError')} />}

      {entries.loading ? (
        <LoadingState />
      ) : entries.error ? (
        <ErrorState message={t('prayer.error')} onRetry={entries.reload} />
      ) : list.length === 0 ? (
        <EmptyState body={t('prayer.empty')} />
      ) : (
        <ul className={styles.list}>
          {list.map((e) => (
            <li key={e.id} className={`${styles.prayerItem} ${e.status === 'answered' ? styles.answered : ''}`}>
              <Badge>{t(`prayer.categories.${e.category}`)}</Badge>
              <h3>{e.title}</h3>
              {e.body && <p className={styles.prayerBody}>{e.body}</p>}
              <p className={styles.meta}>
                {formatDate(new Date(e.createdAt), lang)}
                {e.answeredAt && ` · ${t('prayer.answeredOn', { date: formatDate(new Date(e.answeredAt), lang) })}`}
              </p>
              <div className={styles.actionsRow} style={{ marginBottom: 0 }}>
                <Button variant="secondary" onClick={() => void run(() => prayerService.setAnswered(e.id, e.status === 'open'))}>
                  {e.status === 'open' ? t('prayer.markAnswered') : t('prayer.markOpen')}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(e)}>
                  {t('prayer.edit')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(t('prayer.deleteConfirm'))) void run(() => prayerService.remove(e.id));
                  }}
                >
                  {t('prayer.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(entries.data?.length ?? 0) > 0 && (
        <div className={styles.actionsRow} style={{ marginTop: 'var(--space-6)' }}>
          <Button variant="secondary" onClick={download}>
            {t('prayer.export')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (user && window.confirm(t('prayer.deleteAllConfirm'))) void run(() => prayerService.removeAll(user.id));
            }}
          >
            {t('prayer.deleteAll')}
          </Button>
        </div>
      )}
    </>
  );
}

function PrayerForm(props: { entry: PrayerEntry | null; onSave: (input: PrayerInput) => Promise<void>; onCancel: () => void }) {
  const { t } = useTranslation();
  const [input, setInput] = useState<PrayerInput>({
    title: props.entry?.title ?? '',
    body: props.entry?.body ?? '',
    category: props.entry?.category ?? 'petition',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validatePrayer(input);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await props.onSave(input);
    } catch {
      console.error('Prayer save failed');
      setError('prayer.saveError');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={`${styles.prayerItem} ${styles.formStack}`} onSubmit={submit} noValidate>
      <h2 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{props.entry ? t('prayer.edit') : t('prayer.new')}</h2>
      <TextField
        label={t('prayer.titleLabel')}
        value={input.title}
        maxLength={MAX_TITLE}
        onChange={(e) => setInput((v) => ({ ...v, title: e.target.value }))}
        error={error === 'prayer.errors.titleRequired' || error === 'prayer.errors.titleLong' ? t(error) : undefined}
      />
      <label>
        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{t('prayer.categoryLabel')}</span>
        <select
          className={styles.select}
          value={input.category}
          onChange={(e) => setInput((v) => ({ ...v, category: e.target.value as PrayerCategory }))}
        >
          {PRAYER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`prayer.categories.${c}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{t('prayer.bodyLabel')}</span>
        <textarea
          className={styles.textarea2}
          value={input.body}
          maxLength={MAX_BODY}
          onChange={(e) => setInput((v) => ({ ...v, body: e.target.value }))}
        />
      </label>
      {error && error !== 'prayer.errors.titleRequired' && error !== 'prayer.errors.titleLong' && (
        <ErrorState message={t(error)} />
      )}
      <div className={styles.actionsRow} style={{ margin: 0 }}>
        <Button type="submit" disabled={saving}>
          {t('prayer.save')}
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>
          {t('prayer.cancel')}
        </Button>
      </div>
    </form>
  );
}
