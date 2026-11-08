/**
 * Search normalisation — must behave exactly like
 * scripts/bible/search_normalise.py and the SQL function public.normalise_search
 * (verified by tests/unit/searchNormalise.fixtures.json).
 *
 * Malayalam: atomic chillu letters are folded to consonant + virama and
 * ZWJ/ZWNJ removed, so the 1910 and IRV spellings of a word match.
 */
const CHILLU_TO_BASE: Record<string, string> = {
  'ൺ': 'ണ്',
  'ൻ': 'ന്',
  'ർ': 'ര്',
  'ൽ': 'ല്',
  'ൾ': 'ള്',
  'ൿ': 'ക്',
  'ൔ': 'മ്',
  'ൕ': 'യ്',
  'ൖ': 'ഴ്',
};
const ZW = /[‌‍]/g;
const CHILLU = /[ൺ-ൿൔ-ൖ]/g;
const PUNCT = /[^0-9a-z_À-ɏഀ-ൿ]+/g;

export function normaliseSearch(text: string): string {
  return text
    .normalize('NFC')
    .replace(ZW, '')
    .replace(CHILLU, (c) => CHILLU_TO_BASE[c] ?? c)
    .toLowerCase()
    .replace(PUNCT, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}
