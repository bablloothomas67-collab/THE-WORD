import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { localDayNumber, pickDailyRef } from '../../src/features/daily/dailyVerse';
import { nextDay } from '../../src/features/plans/plansService';
import {
  createPrayerService,
  exportPrayers,
  validatePrayer,
  type PrayerEntry,
} from '../../src/features/prayer/prayerService';
import { parseRefs } from '../../src/features/devotionals/devotionalService';

const refs = [1, 2, 3].map((position) => ({ position, bookCode: 'PSA', chapter: position, verseStart: 1, verseEnd: 1 }));

describe('daily verse rotation', () => {
  it('uses the local calendar date, not UTC', () => {
    expect(localDayNumber(new Date(2026, 0, 1, 0, 5))).toBe(0);
    expect(localDayNumber(new Date(2026, 0, 1, 23, 55))).toBe(0);
    expect(localDayNumber(new Date(2026, 0, 2, 0, 1))).toBe(1);
  });

  it('gives everyone the same verse on the same day and cycles through the list', () => {
    expect(pickDailyRef(refs, new Date(2026, 0, 1))?.position).toBe(1);
    expect(pickDailyRef(refs, new Date(2026, 0, 2))?.position).toBe(2);
    expect(pickDailyRef(refs, new Date(2026, 0, 4))?.position).toBe(1);
    // order of the input does not matter
    expect(pickDailyRef([...refs].reverse(), new Date(2026, 0, 2))?.position).toBe(2);
  });

  it('handles dates before the epoch and an empty list', () => {
    expect(pickDailyRef(refs, new Date(2025, 11, 31))?.position).toBe(3);
    expect(pickDailyRef([], new Date())).toBeUndefined();
  });
});

describe('reading plan progress', () => {
  it('finds the first unread day', () => {
    expect(nextDay(3, new Set())).toBe(1);
    expect(nextDay(3, new Set([1, 3]))).toBe(2);
    expect(nextDay(3, new Set([1, 2, 3]))).toBeNull();
  });
});

describe('prayer journal', () => {
  it('validates title, length and category', () => {
    expect(validatePrayer({ title: ' ', body: '', category: 'petition' })).toBe('prayer.errors.titleRequired');
    expect(validatePrayer({ title: 'x'.repeat(121), body: '', category: 'petition' })).toBe('prayer.errors.titleLong');
    expect(validatePrayer({ title: 'ok', body: 'x'.repeat(10_001), category: 'petition' })).toBe('prayer.errors.bodyLong');
    expect(validatePrayer({ title: 'ok', body: '', category: 'nope' as never })).toBe('prayer.errors.category');
    expect(validatePrayer({ title: 'ok', body: '', category: 'praise' })).toBeNull();
  });

  it('exports entries as JSON generated in the browser', () => {
    const entry: PrayerEntry = {
      id: '1',
      title: 'For my family',
      body: 'Health and peace',
      category: 'intercession',
      status: 'open',
      answeredAt: null,
      createdAt: '2026-11-08T00:00:00Z',
      updatedAt: '2026-11-08T00:00:00Z',
    };
    const json = JSON.parse(exportPrayers([entry], new Date('2026-11-08T10:00:00Z')));
    expect(json.kind).toBe('prayer-journal-export');
    expect(json.entries[0]).toMatchObject({ title: 'For my family', body: 'Health and peace' });
  });

  it('never puts prayer text into error messages', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'value "SECRET PRAYER" too long', code: '23514' } }),
    };
    const client = { from: () => chain } as unknown as SupabaseClient;
    const err = await createPrayerService(client)
      .create({ title: 'SECRET PRAYER', body: 'SECRET BODY', category: 'petition' })
      .catch((e: Error) => e);
    expect(String(err)).not.toMatch(/SECRET/);
    expect(String(err)).toMatch(/23514/);
  });
});

describe('devotional scripture references', () => {
  it('keeps only well-formed references', () => {
    expect(
      parseRefs([
        { book: 'JHN', chapter: 3, verse_start: 16, verse_end: 17 },
        { book: 'PSA', chapter: 23, verse_start: 1 },
        { book: 'bad', chapter: 1, verse_start: 1 },
        { book: 'ROM', chapter: 0, verse_start: 1 },
        { book: 'ROM', chapter: 8, verse_start: 5, verse_end: 2 },
      ]),
    ).toEqual([
      { book: 'JHN', chapter: 3, verseStart: 16, verseEnd: 17 },
      { book: 'PSA', chapter: 23, verseStart: 1, verseEnd: 1 },
    ]);
    expect(parseRefs('not an array')).toEqual([]);
  });
});
