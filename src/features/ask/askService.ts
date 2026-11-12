import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import type { LanguageCode } from '../../config/languages';
import type { AnswerRef } from './answerParts';

/**
 * Ask the Word client. All AI work happens in the "ask-the-word" Edge Function;
 * the browser never holds an AI key and cannot write answers or usage rows itself.
 * Question and answer text is never logged.
 */
export const MAX_QUESTION = 1000;
export const MIN_QUESTION = 3;

export interface AskMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  refs: AnswerRef[];
  removedRefCount: number;
  uncertain: boolean;
  uncheckedCitation: boolean;
  createdAt: string;
}

export interface AskConversation {
  id: string;
  title: string;
  updatedAt: string;
}

export interface AskQuota {
  limit: number;
  remaining: number;
}

export type AskErrorCode = 'limit' | 'auth' | 'declined' | 'invalid' | 'not_configured' | 'unavailable';

export class AskError extends Error {
  readonly code: AskErrorCode;
  constructor(code: AskErrorCode) {
    super(code);
    this.name = 'AskError';
    this.code = code;
  }
}

type Row = Record<string, unknown>;

function parseRef(r: unknown): AnswerRef | null {
  if (!r || typeof r !== 'object') return null;
  const o = r as Row;
  const nums = [o.chapter, o.verse_start, o.verse_end];
  if (typeof o.book !== 'string' || !/^[A-Z0-9]{3}$/.test(o.book)) return null;
  if (!nums.every((n) => typeof n === 'number' && Number.isInteger(n) && n > 0)) return null;
  return { book: o.book, chapter: o.chapter as number, verseStart: o.verse_start as number, verseEnd: o.verse_end as number };
}

export function parseMessage(r: Row): AskMessage {
  if (typeof r.id !== 'string' || typeof r.content !== 'string' || (r.role !== 'user' && r.role !== 'assistant')) {
    throw new Error('Malformed assistant message');
  }
  const flags = (r.flags && typeof r.flags === 'object' ? r.flags : {}) as Row;
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    refs: Array.isArray(r.refs) ? r.refs.map(parseRef).filter((x): x is AnswerRef => x !== null) : [],
    removedRefCount: typeof r.removed_ref_count === 'number' ? r.removed_ref_count : 0,
    uncertain: flags.uncertain === true,
    uncheckedCitation: flags.unchecked_citation === true,
    createdAt: String(r.created_at),
  };
}

function parseQuota(r: Row): AskQuota {
  if (typeof r.limit !== 'number' || typeof r.remaining !== 'number') throw new Error('Malformed quota');
  return { limit: r.limit, remaining: r.remaining };
}

const STATUS_CODES: Record<number, AskErrorCode> = { 400: 'invalid', 401: 'auth', 422: 'declined', 429: 'limit', 503: 'not_configured' };

export function validateQuestion(question: string): string | null {
  const q = question.trim();
  if (q.length < MIN_QUESTION) return 'ask.errors.tooShort';
  if (q.length > MAX_QUESTION) return 'ask.errors.tooLong';
  return null;
}

export function createAskService(client: SupabaseClient | null = defaultClient) {
  async function invoke(body: Row): Promise<Row> {
    if (!client) throw new AskError('not_configured');
    const { data, error } = await client.functions.invoke('ask-the-word', { body });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      throw new AskError((status && STATUS_CODES[status]) || 'unavailable');
    }
    if (!data || typeof data !== 'object') throw new AskError('unavailable');
    return data as Row;
  }

  return {
    async quota(): Promise<AskQuota> {
      return parseQuota(await invoke({ action: 'status' }));
    },

    async ask(question: string, lang: LanguageCode, conversationId: string | null) {
      const data = await invoke({ question: question.trim(), language: lang, ...(conversationId ? { conversationId } : {}) });
      if (typeof data.conversationId !== 'string' || !Array.isArray(data.messages)) throw new AskError('unavailable');
      return {
        conversationId: data.conversationId,
        messages: (data.messages as Row[]).map(parseMessage),
        quota: parseQuota(data),
      };
    },

    async listConversations(): Promise<AskConversation[]> {
      if (!client) return [];
      const { data, error } = await client
        .from('ai_conversations')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(30);
      if (error) throw new Error(`List conversations: ${error.message}`);
      return ((data ?? []) as Row[]).map((r) => ({ id: String(r.id), title: String(r.title), updatedAt: String(r.updated_at) }));
    },

    async getMessages(conversationId: string): Promise<AskMessage[]> {
      if (!client) return [];
      const { data, error } = await client
        .from('ai_messages')
        .select('id, role, content, refs, removed_ref_count, flags, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at');
      if (error) throw new Error(`Load conversation: ${error.message}`);
      return ((data ?? []) as Row[]).map(parseMessage);
    },

    async deleteConversation(conversationId: string): Promise<void> {
      if (!client) throw new AskError('not_configured');
      const { error } = await client.from('ai_conversations').delete().eq('id', conversationId);
      if (error) throw new Error(`Delete conversation: ${error.message}`);
    },
  };
}

export const askService = createAskService();
