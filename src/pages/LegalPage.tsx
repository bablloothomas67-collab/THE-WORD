import { useTranslation } from 'react-i18next';
import { BUSINESS } from '../config/business';
import { PageHeader } from './PageHeader';
import styles from './pages.module.css';

/** Section keys per document, in display order. Text lives in the locale files. */
const SECTIONS = {
  terms: ['who', 'service', 'account', 'bible', 'content', 'ask', 'fairUse', 'premium', 'changes', 'liability', 'law'],
  privacy: [
    'account',
    'created',
    'payments',
    'logs',
    'use',
    'prayer',
    'askData',
    'processors',
    'choices',
    'children',
    'changes',
  ],
  refunds: ['cancel', 'sevenDays', 'errors', 'how', 'timing', 'delivery'],
} as const;

export type LegalDoc = keyof typeof SECTIONS;

const VALUES = { name: BUSINESS.legalName, address: BUSINESS.address, email: BUSINESS.email };

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation();
  return (
    <article>
      <PageHeader title={t(`legal.${doc}.title`)} lead={t(`legal.${doc}.lead`)} />
      {SECTIONS[doc].map((key) => (
        <section key={key} className={styles.devSection}>
          <h2>{t(`legal.${doc}.s.${key}.h`)}</h2>
          <p>{t(`legal.${doc}.s.${key}.p`, VALUES)}</p>
        </section>
      ))}
      <LegalFootnote />
    </article>
  );
}

export function ContactPage() {
  const { t } = useTranslation();
  return (
    <article>
      <PageHeader title={t('legal.contact.title')} lead={t('legal.contact.lead')} />
      <dl className={styles.contactList}>
        <dt>{t('legal.contact.name')}</dt>
        <dd>{BUSINESS.legalName}</dd>
        <dt>{t('legal.contact.address')}</dt>
        <dd>{BUSINESS.address}</dd>
        <dt>{t('legal.contact.email')}</dt>
        <dd>
          <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
        </dd>
        <dt>{t('legal.contact.phone')}</dt>
        <dd>
          <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>
        </dd>
      </dl>
      <p className={styles.meta}>{t('legal.contact.reply')}</p>
    </article>
  );
}

function LegalFootnote() {
  const { t } = useTranslation();
  return (
    <p className={styles.meta}>
      {t('legal.updated')} · {t('legal.languageNote')}
    </p>
  );
}
