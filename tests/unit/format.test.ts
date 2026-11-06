import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber } from '../../src/utils/format';

describe('localised formatting', () => {
  const date = new Date(Date.UTC(2026, 10, 6, 12));

  it('formats English dates', () => {
    expect(formatDate(date, 'en')).toMatch(/November/);
  });

  it('formats Malayalam dates with Malayalam month names', () => {
    expect(formatDate(date, 'ml')).toMatch(/[ഀ-ൿ]/);
  });

  it('formats numbers using Indian grouping', () => {
    expect(formatNumber(1234567, 'en')).toBe('12,34,567');
  });
});
