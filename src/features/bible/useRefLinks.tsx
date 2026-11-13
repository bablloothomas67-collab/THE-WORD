import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pickDefaultVersion, useBooks, useUiLanguage, useVersions } from './useBible';
import { readerPath } from './readingState';
import { verseLabel, type AnswerRef } from '../ask/answerParts';

/** Turns a reference into a localised label and a link into the Bible reader. */
export function useRefLinks() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const versions = useVersions();
  const version = versions.data ? pickDefaultVersion(versions.data, lang) : undefined;
  const books = useBooks(version?.id);

  function label(ref: AnswerRef): string {
    const name = books.data?.find((b) => b.code === ref.book)?.name ?? ref.book;
    return t('bible.verseReference', { book: name, chapter: ref.chapter, verse: verseLabel(ref) });
  }
  function link(ref: AnswerRef): ReactNode {
    return version ? <Link to={readerPath(version.code, ref.book, ref.chapter)}>{label(ref)}</Link> : label(ref);
  }
  return { label, link };
}

