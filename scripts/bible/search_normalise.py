"""
Search normalisation shared with src/features/bible/searchNormalise.ts.
Both must behave identically (tests/unit/searchNormalise.fixtures.json).

Malayalam has two encodings for the same written letters:
  atomic chillu (U+0D7A..U+0D7F, e.g. "ൽ") and consonant + virama
  (+ optional ZWJ), e.g. "ല്‍". The 1910 and IRV texts use
  different styles, so we fold every chillu to consonant + virama and drop
  ZWJ/ZWNJ. Then Unicode NFC, lower-case, punctuation to spaces.
"""
import re
import unicodedata

CHILLU_TO_BASE = {
    "ൺ": "ണ്",  # chillu NN -> NNA + virama
    "ൻ": "ന്",  # chillu N  -> NA + virama
    "ർ": "ര്",  # chillu RR -> RA + virama
    "ൽ": "ല്",  # chillu L  -> LA + virama
    "ൾ": "ള്",  # chillu LL -> LLA + virama
    "ൿ": "ക്",  # chillu K  -> KA + virama
    "ൔ": "മ്",  # chillu M  -> MA + virama
    "ൕ": "യ്",  # chillu Y  -> YA + virama
    "ൖ": "ഴ്",  # chillu LLL -> LLLA + virama
}
ZW = re.compile("[‌‍]")
PUNCT = re.compile("[^0-9a-z_À-ɏഀ-ൿ]+")


def normalise(text: str) -> str:
    s = unicodedata.normalize("NFC", text)
    s = ZW.sub("", s)
    for chillu, base in CHILLU_TO_BASE.items():
        s = s.replace(chillu, base)
    s = s.lower()
    s = PUNCT.sub(" ", s)
    return " ".join(s.split())
