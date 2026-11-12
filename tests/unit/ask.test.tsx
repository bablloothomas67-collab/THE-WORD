import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SupabaseClient } from '@supabase/supabase-js';
import { splitAnswer, verseLabel } from '../../src/features/ask/answerParts';
import { AskError, createAskService, parseMessage, validateQuestion } from '../../src/features/ask/askService';

describe('answer parts', () => {
  it('splits prose at markers and drops markers without a validated reference', () => {
    expect(splitAnswer('God loves [[1]]. Unknown [[5]] end', 2)).toEqual([
      { kind: 'text', text: 'God loves ' },
      { kind: 'ref', index: 0 },
      { kind: 'text', text: '. Unknown ' },
      { kind: 'text', text: ' end' },
    ]);
    expect(splitAnswer('No citations here', 0)).toEqual([{ kind: 'text', text: 'No citations here' }]);
  });

  it('labels single verses and ranges', () => {
    expect(verseLabel({ book: 'JHN', chapter: 3, verseStart: 16, verseEnd: 16 })).toBe('16');
    expect(verseLabel({ book: 'JHN', chapter: 3, verseStart: 1, verseEnd: 8 })).toBe('1–8');
  });
});

describe('ask service', () => {
  it('validates question length', () => {
    expect(validateQuestion('  ')).toBe('ask.errors.tooShort');
    expect(validateQuestion('x'.repeat(1001))).toBe('ask.errors.tooLong');
    expect(validateQuestion('Who was Nicodemus?')).toBeNull();
  });

  it('parses messages defensively and ignores malformed references', () => {
    const m = parseMessage({
      id: 'm1',
      role: 'assistant',
      content: 'Text [[1]]',
      refs: [{ book: 'JHN', chapter: 3, verse_start: 16, verse_end: 16 }, { book: 'john', chapter: 3 }, 'JHN 3:16'],
      removed_ref_count: 2,
      flags: { uncertain: true },
      created_at: '2026-11-12T00:00:00Z',
    });
    expect(m.refs).toEqual([{ book: 'JHN', chapter: 3, verseStart: 16, verseEnd: 16 }]);
    expect(m.removedRefCount).toBe(2);
    expect(m.uncertain).toBe(true);
    expect(m.uncheckedCitation).toBe(false);
    expect(() => parseMessage({ id: 'x', role: 'system', content: 'hi' })).toThrow();
  });

  function clientWith(invoke: ReturnType<typeof vi.fn>) {
    return { functions: { invoke } } as unknown as SupabaseClient;
  }

  it('sends only the question, language and conversation to the function', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { conversationId: 'c1', messages: [], limit: 5, remaining: 4 },
      error: null,
    });
    const result = await createAskService(clientWith(invoke)).ask('  Who was Ruth? ', 'ml', null);
    expect(invoke).toHaveBeenCalledWith('ask-the-word', { body: { question: 'Who was Ruth?', language: 'ml' } });
    expect(result.quota).toEqual({ limit: 5, remaining: 4 });
  });

  it('maps HTTP failures to error codes', async () => {
    for (const [status, code] of [[429, 'limit'], [401, 'auth'], [422, 'declined'], [502, 'unavailable']] as const) {
      const invoke = vi.fn().mockResolvedValue({ data: null, error: { context: { status } } });
      await expect(createAskService(clientWith(invoke)).quota()).rejects.toMatchObject({ code });
    }
    await expect(createAskService(null).quota()).rejects.toBeInstanceOf(AskError);
  });
});

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  ask: vi.fn(),
  quota: vi.fn(),
  listConversations: vi.fn(),
}));

vi.mock('../../src/features/auth/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false, isConfigured: true }),
}));
vi.mock('../../src/features/ask/askService', async (original) => ({
  ...(await original<typeof import('../../src/features/ask/askService')>()),
  askService: {
    ask: mocks.ask,
    quota: mocks.quota,
    listConversations: mocks.listConversations,
    getMessages: vi.fn(),
    deleteConversation: vi.fn(),
  },
}));
vi.mock('../../src/features/bible/useBible', async (original) => ({
  ...(await original<typeof import('../../src/features/bible/useBible')>()),
  useVersions: () => ({ data: [{ id: 'v1', code: 'kjv', languageCode: 'en', shortName: 'KJV' }], loading: false, error: null, reload: () => {} }),
  useBooks: () => ({ data: [{ code: 'JHN', name: 'John' }], loading: false, error: null, reload: () => {} }),
}));

describe('AskPage', () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.ask.mockReset();
    mocks.quota.mockReset().mockResolvedValue({ limit: 5, remaining: 5 });
    mocks.listConversations.mockReset().mockResolvedValue([]);
  });

  async function renderAsk() {
    const { renderApp } = await import('../renderApp');
    return renderApp('/ask');
  }

  it('asks signed-out visitors to sign in and never calls the assistant', async () => {
    await renderAsk();
    expect(await screen.findByText(/Sign in to ask questions/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mocks.quota).not.toHaveBeenCalled();
  });

  it('shows the answer with verified citations, notes and the remaining count', async () => {
    mocks.user = { id: 'u1' };
    mocks.ask.mockResolvedValue({
      conversationId: 'c1',
      quota: { limit: 5, remaining: 4 },
      messages: [
        { id: 'q', role: 'user', content: 'What is new birth?', refs: [], removedRefCount: 0, uncertain: false, uncheckedCitation: false, createdAt: '' },
        {
          id: 'a',
          role: 'assistant',
          content: 'It is life from God [[1]].\n\nTraditions differ on baptism.',
          refs: [{ book: 'JHN', chapter: 3, verseStart: 1, verseEnd: 8 }],
          removedRefCount: 1,
          uncertain: true,
          uncheckedCitation: false,
          createdAt: '',
        },
      ],
    });
    await renderAsk();
    expect(await screen.findByText('5 of 5 questions left today')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Your question' }), 'What is new birth?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(await screen.findByRole('link', { name: 'John 3:1–8' })).toHaveAttribute('href', '/bible/kjv/JHN/3');
    expect(mocks.ask).toHaveBeenCalledWith('What is new birth?', 'en', null);
    expect(screen.getByText(/1 reference could not be verified/)).toBeInTheDocument();
    expect(screen.getByText(/understand this in different ways/)).toBeInTheDocument();
    expect(screen.getByText('4 of 5 questions left today')).toBeInTheDocument();
    expect(screen.getByText(/references checked against the Bible text/)).toBeInTheDocument();
  });

  it('explains the daily limit and disables the form', async () => {
    mocks.user = { id: 'u1' };
    mocks.ask.mockRejectedValue(new AskError('limit'));
    await renderAsk();
    await userEvent.type(await screen.findByRole('textbox', { name: 'Your question' }), 'One more question');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText(/used all of today's questions/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Your question' })).toBeDisabled());
  });
});
