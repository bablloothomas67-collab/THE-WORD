import { describe, expect, it } from 'vitest';
import en from '../../src/locales/en/common.json';
import ml from '../../src/locales/ml/common.json';
import hi from '../../src/locales/hi/common.json';
import ta from '../../src/locales/ta/common.json';
import { LANGUAGES } from '../../src/config/languages';

type Dict = { [key: string]: string | Dict };

function flatten(obj: Dict, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') acc[key] = v;
    else Object.assign(acc, flatten(v, key));
    return acc;
  }, {});
}

const resources: Record<string, Dict> = { en, ml, hi, ta };
const enKeys = Object.keys(flatten(en)).sort();

describe('translation completeness', () => {
  for (const lang of LANGUAGES.filter((l) => l.enabled)) {
    it(`${lang.code} has every English key and no extras`, () => {
      const keys = Object.keys(flatten(resources[lang.code])).sort();
      expect(keys).toEqual(enKeys);
    });

    it(`${lang.code} has no empty strings`, () => {
      const empty = Object.entries(flatten(resources[lang.code])).filter(([, v]) => v.trim() === '');
      expect(empty).toEqual([]);
    });
  }

  it('Malayalam strings are actually in Malayalam script (except brand names)', () => {
    const allowedLatin = new Set(['app.name', 'nav.signIn', 'nav.signOut']);
    const flat = flatten(ml);
    const notMalayalam = Object.entries(flat).filter(
      ([k, v]) =>
        !allowedLatin.has(k) &&
        v.replace(/\{\{\w+\}\}/g, '').replace(/[\s:.,]/g, '') !== '' && // placeholder-only, e.g. "{{book}} {{chapter}}"
        !/[ഀ-ൿ]/.test(v),
    );
    expect(notMalayalam).toEqual([]);
  });
});
