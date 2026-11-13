import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContentItem } from '../../src/features/discover/contentService';

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  list: vi.fn(),
  get: vi.fn(),
  isSaved: vi.fn(),
  save: vi.fn(),
  unsave: vi.fn(),
  recordAttempt: vi.fn(),
  bestAttempt: vi.fn(),
}));

vi.mock('../../src/features/auth/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false, isConfigured: true }),
}));
vi.mock('../../src/features/discover/contentService', async (original) => ({
  ...(await original<typeof import('../../src/features/discover/contentService')>()),
  contentService: {
    list: mocks.list,
    get: mocks.get,
    listSaved: vi.fn(),
    isSaved: mocks.isSaved,
    save: mocks.save,
    unsave: mocks.unsave,
    recordAttempt: mocks.recordAttempt,
    bestAttempt: mocks.bestAttempt,
  },
}));
vi.mock('../../src/features/bible/useBible', async (original) => ({
  ...(await original<typeof import('../../src/features/bible/useBible')>()),
  useVersions: () => ({ data: [{ id: 'v1', code: 'kjv', languageCode: 'en', shortName: 'KJV' }], loading: false, error: null, reload: () => {} }),
  useBooks: () => ({ data: [{ code: 'GEN', name: 'Genesis' }], loading: false, error: null, reload: () => {} }),
}));

const base = { authorLabel: 'THE WORD editorial team', reviewerLabel: null, sources: [], scriptureRefs: [], sections: [], questions: [] };
const article: ContentItem = {
  ...base,
  id: 'a1',
  slug: 'creation',
  kind: 'story',
  title: 'In the beginning',
  summary: 'How the Bible opens.',
  sections: [{ heading: 'The story', body: 'God spoke [[1]].\n\nIt was good [[9]].' }],
  scriptureRefs: [{ book: 'GEN', chapter: 1, verseStart: 1, verseEnd: 5 }],
  sources: [{ label: 'A printed book', url: null }],
};
const quiz: ContentItem = {
  ...base,
  id: 'q1',
  slug: 'quiz-genesis',
  kind: 'quiz',
  title: 'Quiz: Genesis',
  summary: 'Two questions.',
  questions: [
    { prompt: 'Who built the ark?', options: ['Abraham', 'Noah'], correct: 1, explanation: 'God told Noah.', ref: { book: 'GEN', chapter: 6, verseStart: 14, verseEnd: 14 } },
    { prompt: 'First book?', options: ['Genesis', 'Exodus'], correct: 0, explanation: 'Genesis opens the Bible.', ref: null },
  ],
};

async function renderAt(route: string) {
  const { renderApp } = await import('../renderApp');
  return renderApp(route);
}

describe('Discover pages', () => {
  beforeEach(() => {
    mocks.user = null;
    for (const m of [mocks.list, mocks.get, mocks.isSaved, mocks.save, mocks.unsave, mocks.recordAttempt, mocks.bestAttempt]) m.mockReset();
    mocks.isSaved.mockResolvedValue(false);
    mocks.bestAttempt.mockResolvedValue(null);
    mocks.recordAttempt.mockResolvedValue(undefined);
    mocks.save.mockResolvedValue(undefined);
  });

  it('shows each section with the number of items available', async () => {
    mocks.list.mockResolvedValue([
      { id: '1', slug: 'creation', kind: 'story', title: 'Creation', summary: '' },
      { id: '2', slug: 'noah', kind: 'story', title: 'Noah', summary: '' },
      { id: '3', slug: 'quiz-genesis', kind: 'quiz', title: 'Quiz', summary: '' },
    ]);
    await renderAt('/discover');
    const stories = (await screen.findByRole('link', { name: 'Bible stories' })).closest('article')!;
    expect(stories.querySelector('a')).toHaveAttribute('href', '/discover/stories');
    expect(await within(stories).findByText('2 items')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: 'Bible quizzes' }).closest('article')!).getByText('1 item')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: 'Theology' }).closest('article')!).getByText('0 items')).toBeInTheDocument();
  });

  it('lists a section, and says so when nothing is published or the section is unknown', async () => {
    mocks.list.mockResolvedValue([{ id: '1', slug: 'creation', kind: 'story', title: 'Creation', summary: 'Opening' }]);
    await renderAt('/discover/stories');
    expect(await screen.findByRole('link', { name: 'Creation' })).toHaveAttribute('href', '/discover/stories/creation');
    expect(mocks.list).toHaveBeenCalledWith('en', 'story');
  });

  it('shows an empty state for an empty section', async () => {
    mocks.list.mockResolvedValue([]);
    await renderAt('/discover/history');
    expect(await screen.findByText('Nothing has been published here yet.')).toBeInTheDocument();
  });

  it('rejects an unknown section without querying', async () => {
    await renderAt('/discover/videos');
    expect(await screen.findByText("This page isn't available in the selected language.")).toBeInTheDocument();
  });

  it('renders an article with reader links for listed references only, and its sources', async () => {
    mocks.get.mockResolvedValue(article);
    await renderAt('/discover/stories/creation');
    expect(await screen.findByRole('heading', { level: 1, name: 'In the beginning' })).toBeInTheDocument();
    const cite = screen.getByRole('link', { name: 'Genesis 1:1–5' });
    expect(cite).toHaveAttribute('href', '/bible/kjv/GEN/1');
    // [[9]] has no reference behind it, so it is dropped rather than shown
    expect(screen.getByText(/It was good/).textContent).not.toMatch(/\[\[|\(/);
    expect(screen.getByText('A printed book')).toBeInTheDocument();
    expect(screen.getByText('Original writing by THE WORD editorial team.')).toBeInTheDocument();
    // visitors are not offered a save button
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument();
  });

  it('does not show an item under the wrong section', async () => {
    mocks.get.mockResolvedValue(article);
    await renderAt('/discover/quizzes/creation');
    expect(await screen.findByText("This page isn't available in the selected language.")).toBeInTheDocument();
  });

  it('lets a signed-in reader save and un-save an item', async () => {
    mocks.user = { id: 'u1' };
    mocks.get.mockResolvedValue(article);
    await renderAt('/discover/stories/creation');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Save to My Journey' }));
    expect(mocks.save).toHaveBeenCalledWith('a1');
    const saved = await screen.findByRole('button', { name: 'Saved — tap to remove' });
    expect(saved).toHaveAttribute('aria-pressed', 'true');
    await user.click(saved);
    expect(mocks.unsave).toHaveBeenCalledWith('a1');
  });

  it('marks a quiz only when every question is answered; visitors get a score but nothing is stored', async () => {
    mocks.get.mockResolvedValue(quiz);
    await renderAt('/discover/quizzes/quiz-genesis');
    const user = userEvent.setup();
    const check = await screen.findByRole('button', { name: 'Check my answers' });
    expect(check).toBeDisabled();
    expect(screen.getByText('2 questions left to answer')).toBeInTheDocument();
    // answers are not revealed before checking
    expect(screen.queryByText('God told Noah.')).not.toBeInTheDocument();
    expect(screen.queryByText('Correct answer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Abraham' }));
    await user.click(screen.getByRole('radio', { name: 'Genesis' }));
    await user.click(check);

    expect(await screen.findByText('You scored 1 out of 2.')).toBeInTheDocument();
    expect(screen.getByText('God told Noah.', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Genesis 6:14' })).toHaveAttribute('href', '/bible/kjv/GEN/6');
    expect(screen.getByText('Sign in to keep your quiz results.')).toBeInTheDocument();
    expect(mocks.recordAttempt).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('button', { name: 'Check my answers' })).toBeDisabled();
  });

  it("stores a signed-in reader's result and still shows the answers if saving fails", async () => {
    mocks.user = { id: 'u1' };
    mocks.get.mockResolvedValue(quiz);
    mocks.bestAttempt.mockResolvedValue({ score: 1, total: 2 });
    mocks.recordAttempt.mockRejectedValue(new Error('offline'));
    await renderAt('/discover/quizzes/quiz-genesis');
    const user = userEvent.setup();
    expect(await screen.findByText('Your best so far: 1 out of 2.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Noah' }));
    await user.click(screen.getByRole('radio', { name: 'Genesis' }));
    await user.click(screen.getByRole('button', { name: 'Check my answers' }));
    expect(await screen.findByText('You scored 2 out of 2.')).toBeInTheDocument();
    expect(mocks.recordAttempt).toHaveBeenCalledWith('q1', 2, 2);
    expect(screen.getByText(/Your score couldn't be saved/)).toBeInTheDocument();
  });
});
