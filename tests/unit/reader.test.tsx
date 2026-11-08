import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../renderApp';

/**
 * Reader screens with a stubbed provider (synthetic text, not scripture).
 * Real text and RLS are covered by tests/integration.
 */
const version = {
  id: 'v1',
  code: 'test',
  languageCode: 'en',
  name: 'Test Version',
  shortName: 'TST',
  copyrightNotice: 'Test copyright notice.',
  licence: 'CC BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceUrl: 'https://example.org/',
  attributionRequired: true,
  hasDeuterocanon: true,
};
const books = [
  { code: 'GEN', order: 2, testament: 'OT', name: 'Book One', longName: null, abbreviation: null, chapterCount: 2 },
  { code: 'TOB', order: 41, testament: 'DC', name: 'Book Two', longName: null, abbreviation: null, chapterCount: 1 },
  { code: 'MAT', order: 70, testament: 'NT', name: 'Book Three', longName: null, abbreviation: null, chapterCount: 1 },
];

vi.mock('../../src/services/bible-provider/supabaseProvider', () => ({
  bibleProvider: {
    listVersions: async () => [version],
    listBooks: async () => books,
    getChapter: async (_v: string, book: string, chapter: number) => {
      if (book !== 'GEN' || chapter > 2) {
        const { BibleProviderError } = await import('../../src/services/bible-provider/types');
        throw new BibleProviderError('not_found');
      }
      return {
        version,
        book: books[0],
        chapter,
        title: null,
        verses: [
          { verse: 1, label: '1', text: 'Synthetic verse one.' },
          { verse: 2, label: '2', text: 'Synthetic verse two.' },
        ],
      };
    },
    search: async () => ({ hits: [], truncated: false }),
  },
}));

describe('Bible library', () => {
  it('groups books by testament with a labelled Deuterocanon section', async () => {
    await renderApp('/bible');
    expect(await screen.findByRole('heading', { name: 'Old Testament' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New Testament' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Deuterocanonical books' })).toBeInTheDocument();
    expect(screen.getByText(/Read in Catholic and Orthodox Bibles/)).toBeInTheDocument();
  });

  it('opens a chapter grid for a book', async () => {
    const user = userEvent.setup();
    await renderApp('/bible');
    await user.click(await screen.findByRole('button', { name: 'Book One' }));
    expect(screen.getByRole('link', { name: 'Book One chapter 2' })).toHaveAttribute('href', '/bible/test/GEN/2');
  });
});

describe('Bible reader', () => {
  it('shows verses with the required attribution', async () => {
    await renderApp('/bible/test/GEN/1');
    expect(await screen.findByText('Synthetic verse one.')).toBeInTheDocument();
    expect(screen.getByText('Test copyright notice.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Licence: CC BY-SA 4.0' })).toBeInTheDocument();
  });

  it('links to the next chapter and across books', async () => {
    await renderApp('/bible/test/GEN/2');
    expect(await screen.findByRole('link', { name: /Book Two 1/ })).toHaveAttribute('href', '/bible/test/TOB/1');
  });

  it('asks signed-out readers to sign in before saving', async () => {
    const user = userEvent.setup();
    await renderApp('/bible/test/GEN/1');
    await user.click(await screen.findByRole('button', { name: /Synthetic verse two/ }));
    const sheet = screen.getByRole('dialog', { name: 'Book One 1:2 selected' });
    expect(within(sheet).getByText('Sign in to save bookmarks, highlights and notes.')).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Bookmark' })).not.toBeInTheDocument();
  });

  it('shows a not-found message instead of substituting another passage', async () => {
    await renderApp('/bible/test/GEN/9');
    expect(await screen.findByText("This passage isn't available in this version.")).toBeInTheDocument();
    expect(screen.queryByText('Synthetic verse one.')).not.toBeInTheDocument();
  });

  it('remembers the position for Continue reading', async () => {
    await renderApp('/bible/test/GEN/2');
    await screen.findByText('Synthetic verse one.');
    expect(JSON.parse(window.localStorage.getItem('theword.reading.position') ?? '{}')).toMatchObject({
      versionCode: 'test',
      bookCode: 'GEN',
      chapter: 2,
    });
  });
});
