import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonLink, ErrorState } from '../../components/ui';
import { HIGHLIGHT_COLOURS, MAX_NOTE_LENGTH, type HighlightColour } from '../study/studyService';
import styles from './bible.module.css';

interface Props {
  reference: string;
  signedIn: boolean;
  bookmarked: boolean;
  colour: HighlightColour | undefined;
  note: string | undefined;
  /** Text copied to the clipboard, including reference and attribution. */
  copyText: string;
  onBookmark: (on: boolean) => Promise<void>;
  onHighlight: (colour: HighlightColour | null) => Promise<void>;
  onSaveNote: (text: string) => Promise<void>;
  onClose: () => void;
}

/** Bottom sheet shown when a verse is selected. */
export function VerseActions(props: Props) {
  const { t } = useTranslation();
  const { reference, signedIn, bookmarked, colour, note } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(false);
    try {
      await action();
    } catch (err) {
      console.error('Study action failed', err);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(props.copyText);
      setCopied(true);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }

  return (
    <div className={styles.sheet} role="dialog" aria-label={t('reader.selected', { reference })}>
      <div className={styles.sheetInner}>
        <div className={styles.sheetHeader}>
          <span>{reference}</span>
          <Button variant="ghost" onClick={props.onClose}>
            {t('reader.close')}
          </Button>
        </div>

        {!signedIn ? (
          <div className={styles.sheetActions}>
            <p className={styles.hint} style={{ margin: 0 }}>
              {t('reader.signInToSave')}
            </p>
            <ButtonLink to="/login" state={{ from: window.location.pathname }}>
              {t('nav.signIn')}
            </ButtonLink>
            <Button variant="secondary" onClick={() => void copy()}>
              {copied ? t('reader.copied') : t('reader.copy')}
            </Button>
          </div>
        ) : editing ? (
          <div>
            <label className="visually-hidden" htmlFor="note-editor">
              {t('reader.note')}
            </label>
            <textarea
              id="note-editor"
              className={styles.noteArea}
              value={draft}
              maxLength={MAX_NOTE_LENGTH}
              placeholder={t('reader.notePlaceholder')}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <p className={styles.hint}>{t('reader.notePrivate')}</p>
            <div className={styles.sheetActions}>
              <Button
                disabled={busy || !draft.trim()}
                onClick={() => void run(async () => {
                  await props.onSaveNote(draft);
                  setEditing(false);
                })}
              >
                {t('reader.saveNote')}
              </Button>
              {note && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void run(async () => {
                    await props.onSaveNote('');
                    setDraft('');
                    setEditing(false);
                  })}
                >
                  {t('reader.deleteNote')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setEditing(false)}>
                {t('reader.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.sheetActions}>
            <Button
              variant={bookmarked ? 'primary' : 'secondary'}
              aria-pressed={bookmarked}
              disabled={busy}
              onClick={() => void run(() => props.onBookmark(!bookmarked))}
            >
              {bookmarked ? t('reader.bookmarked') : t('reader.bookmark')}
            </Button>
            <span className={styles.smallLabel}>{t('reader.highlight')}</span>
            {HIGHLIGHT_COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.swatch} ${styles[`swatch-${c}`]}`}
                aria-pressed={colour === c}
                aria-label={t(`reader.colours.${c}`)}
                title={t(`reader.colours.${c}`)}
                disabled={busy}
                onClick={() => void run(() => props.onHighlight(colour === c ? null : c))}
              />
            ))}
            {colour && (
              <Button variant="ghost" disabled={busy} onClick={() => void run(() => props.onHighlight(null))}>
                {t('reader.removeHighlight')}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(note ?? '');
                setEditing(true);
              }}
            >
              {note ? t('reader.editNote') : t('reader.note')}
            </Button>
            <Button variant="ghost" onClick={() => void copy()}>
              {copied ? t('reader.copied') : t('reader.copy')}
            </Button>
          </div>
        )}
        {error && <ErrorState message={t('reader.saveError')} />}
      </div>
    </div>
  );
}
