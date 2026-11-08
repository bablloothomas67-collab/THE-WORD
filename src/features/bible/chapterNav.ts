import type { BibleBook } from '../../services/bible-provider/types';

/** Previous/next chapter across book boundaries, in canonical order. */
export function neighbours(books: BibleBook[], book: BibleBook, chapter: number) {
  const i = books.findIndex((b) => b.code === book.code);
  const prev =
    chapter > 1
      ? { book, chapter: chapter - 1 }
      : i > 0
        ? { book: books[i - 1], chapter: books[i - 1].chapterCount }
        : null;
  const next =
    chapter < book.chapterCount
      ? { book, chapter: chapter + 1 }
      : i >= 0 && i < books.length - 1
        ? { book: books[i + 1], chapter: 1 }
        : null;
  return { prev, next };
}
