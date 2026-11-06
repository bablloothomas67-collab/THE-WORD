import { useTranslation } from 'react-i18next';
import { ButtonLink, EmptyState } from '../components/ui';
import { PageHeader } from './PageHeader';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('notFound.title')} />
      <EmptyState body={t('notFound.body')} action={<ButtonLink to="/">{t('notFound.home')}</ButtonLink>} />
    </>
  );
}
