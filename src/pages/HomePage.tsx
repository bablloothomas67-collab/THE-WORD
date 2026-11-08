import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, ButtonLink, Card, EmptyState } from '../components/ui';
import { formatDate } from '../utils/format';
import { isEnabledLanguage } from '../config/languages';
import { PageHeader } from './PageHeader';
import { getReadingPosition, readerPath } from '../features/bible/readingState';
import styles from './pages.module.css';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = isEnabledLanguage(i18n.language) ? i18n.language : 'en';
  const [today] = useState(() => new Date());
  const [position] = useState(getReadingPosition);

  return (
    <>
      <PageHeader eyebrow={formatDate(today, lang)} title={t('home.greeting')} lead={t('home.intro')} />

      <div className={`${styles.grid} ${styles.gridThree}`}>
        {/* No Bible text is shown until a licensed provider is connected. */}
        <Card
          className={`${styles.verseCard} ${styles.span2}`}
          title={t('home.dailyVerse.title')}
          aside={<Badge>{t('states.notConnected')}</Badge>}
        >
          <p>{t('home.dailyVerse.placeholder')}</p>
        </Card>

        <Card title={t('home.ask.title')} accent>
          <p className={styles.muted}>{t('home.ask.body')}</p>
          <p />
          <ButtonLink to="/ask">{t('home.ask.action')}</ButtonLink>
        </Card>

        <Card title={t('home.devotional.title')} aside={<Badge>{t('states.comingSoon')}</Badge>}>
          <EmptyState body={t('home.devotional.placeholder')} />
        </Card>

        <Card title={t('home.continue.title')}>
          {position ? (
            <ButtonLink to={readerPath(position.versionCode, position.bookCode, position.chapter)}>
              {t('home.continue.resume', {
                reference: t('bible.reference', { book: position.bookName, chapter: position.chapter }),
              })}
            </ButtonLink>
          ) : (
            <EmptyState
              body={t('home.continue.empty')}
              action={
                <ButtonLink to="/bible" variant="secondary">
                  {t('home.continue.action')}
                </ButtonLink>
              }
            />
          )}
        </Card>

        <Card title={t('home.plan.title')} aside={<Badge>{t('states.comingSoon')}</Badge>}>
          <EmptyState body={t('home.plan.empty')} />
        </Card>
      </div>

      <h2 className={styles.sectionTitle}>{t('home.learn.title')}</h2>
      <EmptyState body={t('home.learn.empty')} />
    </>
  );
}
