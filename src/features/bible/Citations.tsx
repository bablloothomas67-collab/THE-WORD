import { useState, type ReactNode } from 'react';
import { PassageView } from './PassageView';
import { splitAnswer, type AnswerRef } from '../ask/answerParts';
import styles from '../../pages/pages.module.css';

/**
 * Prose whose [[n]] markers point into a list of checked Scripture references.
 * Each marker becomes a link to the reader; markers without a reference are dropped.
 */
export function CitedText({ text, refs, link }: { text: string; refs: AnswerRef[]; link: (ref: AnswerRef) => ReactNode }) {
  return (
    <>
      {text.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i}>
          {splitAnswer(paragraph, refs.length).map((part, j) =>
            part.kind === 'text' ? (
              part.text
            ) : (
              <span key={j} className={styles.askCite}>
                {' ('}
                {link(refs[part.index])}
                {')'}
              </span>
            ),
          )}
        </p>
      ))}
    </>
  );
}

/** Loads the passage text from the licensed Bible only when the reader opens it. */
export function PassageDetails({ title, passage, errorKey }: { title: string; passage: AnswerRef; errorKey: string }) {
  const [opened, setOpened] = useState(false);
  return (
    <details className={styles.askPassage} onToggle={(e) => e.currentTarget.open && setOpened(true)}>
      <summary>{title}</summary>
      {opened && (
        <PassageView
          bookCode={passage.book}
          chapter={passage.chapter}
          verseStart={passage.verseStart}
          verseEnd={passage.verseEnd}
          errorKey={errorKey}
        />
      )}
    </details>
  );
}
