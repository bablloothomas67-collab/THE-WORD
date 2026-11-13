/**
 * Ask the Word — the only place the app talks to OpenAI.
 *
 * Flow: authenticate the caller → reserve one question against the daily limit →
 * ask the model for a structured answer → check every Scripture reference against
 * the Bible database (unknown ones are removed) → store and return the answer.
 *
 * Privacy: question and answer text is never written to logs. No Bible text and no
 * prayer-journal content is ever sent to the model.
 */
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
  answerSchema,
  buildSystemPrompt,
  compactRefs,
  DEFAULT_DAILY_LIMIT,
  hasUncheckedCitation,
  MAX_QUESTION_CHARS,
  MAX_REFS,
  normaliseRef,
  PREMIUM_DAILY_LIMIT,
  REVIEWER_DAILY_LIMIT,
  rewriteMarkers,
  type ScriptureRef,
} from './logic.ts';

const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-6.1-terra';
const OPENAI_TIMEOUT_MS = 90_000;
const HISTORY_MESSAGES = 6;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

interface BookCatalogue {
  codes: string[];
  set: Set<string>;
  promptList: string;
}
let catalogue: BookCatalogue | null = null;

/** Book codes and English names, read once per function instance from the Bible tables. */
async function loadCatalogue(admin: SupabaseClient): Promise<BookCatalogue> {
  if (catalogue) return catalogue;
  const { data: version, error: vErr } = await admin.from('bible_versions').select('id').eq('code', 'web').single();
  if (vErr) throw new Error(`catalogue version: ${vErr.message}`);
  const { data, error } = await admin
    .from('bible_book_names')
    .select('book_code, name, bible_books!inner(canonical_order, testament)')
    .eq('version_id', version.id);
  if (error) throw new Error(`catalogue books: ${error.message}`);
  const rows = (data as unknown as { book_code: string; name: string; bible_books: { canonical_order: number; testament: string } }[])
    .slice()
    .sort((a, b) => a.bible_books.canonical_order - b.bible_books.canonical_order);
  if (rows.length < 66) throw new Error('catalogue incomplete');
  const codes = rows.map((r) => r.book_code);
  catalogue = {
    codes,
    set: new Set(codes),
    promptList: rows.map((r) => `${r.book_code} = ${r.name}${r.bible_books.testament === 'DC' ? ' (DC)' : ''}`).join('; '),
  };
  return catalogue;
}

/** A reference is real when one enabled Bible version has both its first and last verse. */
async function referenceExists(admin: SupabaseClient, ref: ScriptureRef): Promise<boolean> {
  const { data, error } = await admin
    .from('bible_verses')
    .select('version_id, verse, bible_versions!inner(enabled)')
    .eq('book_code', ref.book)
    .eq('chapter', ref.chapter)
    .in('verse', [ref.verse_start, ref.verse_end])
    .eq('bible_versions.enabled', true);
  if (error) throw new Error(`reference check: ${error.message}`);
  const byVersion = new Map<string, Set<number>>();
  for (const row of data as { version_id: string; verse: number }[]) {
    if (!byVersion.has(row.version_id)) byVersion.set(row.version_id, new Set());
    byVersion.get(row.version_id)!.add(row.verse);
  }
  for (const verses of byVersion.values()) {
    if (verses.has(ref.verse_start) && verses.has(ref.verse_end)) return true;
  }
  return false;
}

async function dailyLimit(admin: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await admin.from('admin_roles').select('role').eq('user_id', userId).in('role', ['admin', 'reviewer']);
  if (error) throw new Error(`roles: ${error.message}`);
  if (data.length > 0) return REVIEWER_DAILY_LIMIT;
  const { data: ent, error: entError } = await admin
    .from('entitlements')
    .select('premium_until')
    .eq('user_id', userId)
    .gt('premium_until', new Date().toISOString())
    .maybeSingle();
  if (entError) throw new Error(`entitlement: ${entError.message}`);
  return ent ? PREMIUM_DAILY_LIMIT : DEFAULT_DAILY_LIMIT;
}

async function usedToday(admin: SupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'ask_question')
    .gt('created_at', since);
  if (error) throw new Error(`usage: ${error.message}`);
  return count ?? 0;
}

async function askModel(messages: { role: string; content: string }[], bookCodes: string[]) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_completion_tokens: 6000,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'bible_study_answer', strict: true, schema: answerSchema(bookCodes) },
        },
      }),
    });
    if (!res.ok) {
      // Status and OpenAI's error code only — never the request body.
      const detail = await res.json().catch(() => null);
      throw new Error(`openai ${res.status} ${detail?.error?.code ?? detail?.error?.type ?? ''}`);
    }
    const body = await res.json();
    const choice = body?.choices?.[0];
    if (choice?.message?.refusal) return { refused: true as const };
    const parsed = JSON.parse(choice?.message?.content ?? 'null');
    if (!parsed || typeof parsed.answer !== 'string' || !Array.isArray(parsed.references)) {
      throw new Error('openai malformed answer');
    }
    return { refused: false as const, answer: parsed.answer as string, references: parsed.references as unknown[], uncertain: parsed.uncertain === true };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { code: 'method_not_allowed' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Who is asking? Verify the caller's own token; never trust a user id from the body.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json(401, { code: 'unauthenticated' });
  const userId = auth.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { code: 'invalid_request' });
  }

  try {
    const limit = await dailyLimit(admin, userId);
    if (body.action === 'status') {
      return json(200, { limit, remaining: Math.max(0, limit - (await usedToday(admin, userId))) });
    }

    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const language = body.language === 'ml' ? 'ml' : body.language === 'en' ? 'en' : null;
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null;
    if (!language || question.length < 3 || question.length > MAX_QUESTION_CHARS) {
      return json(400, { code: 'invalid_request' });
    }
    if (!Deno.env.get('OPENAI_API_KEY')) return json(503, { code: 'not_configured' });

    // Earlier turns of this conversation (must belong to the caller).
    let history: { role: string; content: string }[] = [];
    if (conversationId) {
      const { data: conv, error } = await admin.from('ai_conversations').select('id').eq('id', conversationId).eq('user_id', userId).maybeSingle();
      if (error) throw new Error(`conversation: ${error.message}`);
      if (!conv) return json(404, { code: 'conversation_not_found' });
      const { data: past, error: pastError } = await admin
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(HISTORY_MESSAGES);
      if (pastError) throw new Error(`history: ${pastError.message}`);
      history = (past ?? []).reverse();
    }

    const { data: reserved, error: reserveError } = await admin.rpc('reserve_ask_question', { p_user: userId, p_limit: limit });
    if (reserveError) throw new Error(`reserve: ${reserveError.message}`);
    const reservation = (reserved as { event_id: string | null; remaining: number }[])[0];
    if (!reservation?.event_id) return json(429, { code: 'limit_reached', limit, remaining: 0 });
    const refund = () => admin.from('usage_events').delete().eq('id', reservation.event_id!);

    const books = await loadCatalogue(admin);
    let result;
    try {
      result = await askModel(
        [{ role: 'system', content: buildSystemPrompt(language, books.promptList) }, ...history, { role: 'user', content: question }],
        books.codes,
      );
    } catch (e) {
      await refund();
      console.error('ask-the-word: model call failed:', e instanceof Error ? e.message : 'unknown');
      return json(502, { code: 'ai_unavailable' });
    }
    if (result.refused) {
      await refund();
      return json(422, { code: 'declined' });
    }

    // Validate every reference against the Bible database.
    const wellFormed = result.references.slice(0, MAX_REFS * 2).map((r) => normaliseRef(r, books.set));
    const checked = await Promise.all(wellFormed.map(async (r) => (r && (await referenceExists(admin, r)) ? r : null)));
    const { refs, renumber } = compactRefs(checked);
    // Invalid or unknown references (duplicates of a kept one are not counted as removed).
    const removed = checked.filter((r) => r === null).length + Math.max(0, result.references.length - checked.length);
    const content = rewriteMarkers(result.answer, renumber);
    if (!content) {
      await refund();
      return json(502, { code: 'ai_unavailable' });
    }
    const flags = { uncertain: result.uncertain, unchecked_citation: hasUncheckedCitation(content) };

    let convId = conversationId;
    if (!convId) {
      const { data: created, error } = await admin
        .from('ai_conversations')
        .insert({ user_id: userId, title: question.slice(0, 80), language_code: language })
        .select('id')
        .single();
      if (error) throw new Error(`create conversation: ${error.message}`);
      convId = created.id as string;
    } else {
      await admin.from('ai_conversations').update({ language_code: language }).eq('id', convId);
    }
    const now = Date.now();
    const { data: saved, error: saveError } = await admin
      .from('ai_messages')
      .insert([
        // Every row carries the same keys: a bulk insert sends null for any key a row lacks.
        {
          conversation_id: convId,
          user_id: userId,
          role: 'user',
          content: question,
          refs: [],
          removed_ref_count: 0,
          flags: {},
          created_at: new Date(now).toISOString(),
        },
        {
          conversation_id: convId,
          user_id: userId,
          role: 'assistant',
          content: content.slice(0, 12000),
          refs,
          removed_ref_count: Math.min(removed, 100),
          flags,
          created_at: new Date(now + 1).toISOString(),
        },
      ])
      .select('id, role, content, refs, removed_ref_count, flags, created_at');
    if (saveError) {
      // Nothing was delivered: give the question back and remove an empty new conversation.
      await refund();
      if (!conversationId) await admin.from('ai_conversations').delete().eq('id', convId);
      throw new Error(`save: ${saveError.message}`);
    }

    console.log(`ask-the-word: answered lang=${language} refs=${refs.length} removed=${removed} model=${MODEL}`);
    return json(200, { conversationId: convId, messages: saved, limit, remaining: reservation.remaining });
  } catch (e) {
    console.error('ask-the-word: failed:', e instanceof Error ? e.message : 'unknown');
    return json(500, { code: 'server_error' });
  }
});
