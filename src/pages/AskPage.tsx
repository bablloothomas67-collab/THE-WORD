import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonLink, ErrorState, LoadingState, Notice } from '../components/ui';
import { PageHeader } from './PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../features/auth/useAuth';
import { useUiLanguage } from '../features/bible/useBible';
import { CitedText, PassageDetails } from '../features/bible/Citations';
import { useRefLinks } from '../features/bible/useRefLinks';
import {
  AskError,
  askService,
  MAX_QUESTION,
  validateQuestion,
  type AskMessage,
  type AskQuota,
} from '../features/ask/askService';
import styles from './pages.module.css';

/**
 * Ask the Word. Answers come from the server-side "ask-the-word" function; every
 * citation shown here was checked against the Bible database, and the passage text
 * is loaded from the licensed Bible versions — never from the AI.
 */
export function AskPage() {
  const { t } = useTranslation();
  const { user, loading, isConfigured } = useAuth();

  return (
    <>
      <PageHeader title={t('ask.title')} lead={t('ask.intro')} />
      {!isConfigured ? (
        <Notice>{t('ask.errors.not_configured')}</Notice>
      ) : loading ? (
        <LoadingState />
      ) : !user ? (
        <Notice>
          <p>{t('ask.signInPrompt')}</p>
          <ButtonLink to="/login" state={{ from: '/ask' }}>
            {t('nav.signIn')}
          </ButtonLink>
        </Notice>
      ) : (
        <AskAssistant key={user.id} />
      )}
      <p className={styles.disclaimer}>{t('ask.disclaimer')}</p>
    </>
  );
}

function AskAssistant() {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const inputId = useId();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [quota, setQuota] = useState<AskQuota | null>(null);
  const history = useAsync(() => askService.listConversations(), []);
  const initialQuota = useAsync(() => askService.quota(), []);
  const threadEnd = useRef<HTMLDivElement>(null);

  const shownQuota = quota ?? initialQuota.data ?? null;
  const outOfQuestions = shownQuota !== null && shownQuota.remaining <= 0;

  useEffect(() => {
    if (messages.length > 0) threadEnd.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [messages.length, pending]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const invalid = validateQuestion(question);
    if (invalid) return setErrorKey(invalid);
    setErrorKey(null);
    setPending(true);
    try {
      const result = await askService.ask(question, lang, conversationId);
      setMessages((m) => [...m, ...result.messages]);
      setConversationId(result.conversationId);
      setQuota(result.quota);
      setQuestion('');
      history.reload();
    } catch (err) {
      const code = err instanceof AskError ? err.code : 'unavailable';
      // Code only: the error must never carry the question text into the console.
      console.error(`Ask the Word failed: ${code}`);
      if (code === 'limit' && shownQuota) setQuota({ ...shownQuota, remaining: 0 });
      setErrorKey(`ask.errors.${code}`);
    } finally {
      setPending(false);
    }
  }

  async function open(id: string) {
    setErrorKey(null);
    try {
      setMessages(await askService.getMessages(id));
      setConversationId(id);
    } catch {
      setErrorKey('ask.errors.unavailable');
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t('ask.deleteConfirm'))) return;
    try {
      await askService.deleteConversation(id);
      if (id === conversationId) startNew();
      history.reload();
    } catch {
      setErrorKey('ask.errors.unavailable');
    }
  }

  function startNew() {
    setConversationId(null);
    setMessages([]);
    setErrorKey(null);
  }

  return (
    <div className={styles.askWrap}>
      {messages.length > 0 && (
        <section aria-label={t('ask.conversation')} className={styles.askThread}>
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className={styles.askQuestion}>
                <span className="visually-hidden">{t('ask.youAsked')} </span>
                {m.content}
              </div>
            ) : (
              <Answer key={m.id} message={m} />
            ),
          )}
          <div ref={threadEnd} />
        </section>
      )}

      {pending && <LoadingState label={t('ask.thinking')} />}
      {errorKey && <ErrorState message={t(errorKey, { max: MAX_QUESTION })} />}

      <form className={styles.askForm} onSubmit={(e) => void submit(e)}>
        <label htmlFor={inputId} className="visually-hidden">
          {t('ask.inputLabel')}
        </label>
        <textarea
          id={inputId}
          className={styles.textarea}
          placeholder={messages.length > 0 ? t('ask.followUpPlaceholder') : t('ask.inputPlaceholder')}
          value={question}
          maxLength={MAX_QUESTION}
          disabled={pending || outOfQuestions}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className={styles.actionsRow}>
          <Button type="submit" disabled={pending || outOfQuestions || question.trim().length === 0}>
            {t('ask.submit')}
          </Button>
          {messages.length > 0 && (
            <Button type="button" variant="secondary" onClick={startNew} disabled={pending}>
              {t('ask.newConversation')}
            </Button>
          )}
          {shownQuota && (
            <span className={styles.meta} role="status">
              {outOfQuestions ? t('ask.quotaNone', { limit: shownQuota.limit }) : t('ask.quota', { ...shownQuota })}
            </span>
          )}
        </div>
      </form>

      {(history.data?.length ?? 0) > 0 && (
        <section className={styles.askHistory}>
          <h2>{t('ask.history')}</h2>
          <ul className={styles.list}>
            {history.data!.map((c) => (
              <li key={c.id} className={styles.askHistoryItem}>
                <button type="button" className={styles.linkButton} onClick={() => void open(c.id)} aria-current={c.id === conversationId}>
                  {c.title}
                </button>
                <Button variant="ghost" onClick={() => void remove(c.id)} aria-label={`${t('ask.delete')}: ${c.title}`}>
                  {t('ask.delete')}
                </Button>
              </li>
            ))}
          </ul>
          <p className={styles.meta}>{t('ask.privacy')}</p>
        </section>
      )}
    </div>
  );
}

function Answer({ message }: { message: AskMessage }) {
  const { t } = useTranslation();
  const { label, link } = useRefLinks();

  return (
    <article className={styles.askAnswer} aria-label={t('ask.answerLabel')}>
      <CitedText text={message.content} refs={message.refs} link={link} />

      {message.uncertain && <p className={styles.askNote}>{t('ask.uncertain')}</p>}
      {message.removedRefCount > 0 && <p className={styles.askNote}>{t('ask.removedRefs', { count: message.removedRefCount })}</p>}
      {message.uncheckedCitation && <p className={styles.askNote}>{t('ask.uncheckedCitation')}</p>}

      {message.refs.length > 0 && (
        <div className={styles.askPassages}>
          <h3>{t('ask.passages')}</h3>
          {message.refs.map((ref, i) => (
            <PassageDetails key={i} title={label(ref)} passage={ref} errorKey="ask.passageError" />
          ))}
        </div>
      )}
      <p className={styles.meta}>{t('ask.aiLabel')}</p>
    </article>
  );
}
