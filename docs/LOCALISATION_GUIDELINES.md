# Localisation guidelines

## Rules
1. No hardcoded interface text in components — every string is a key in
   `src/locales/<lang>/common.json`.
2. English (`en`) is the reference. Every enabled language must have exactly the
   same keys and no empty values — enforced by `tests/unit/locales.test.ts`.
3. A language is enabled in `src/config/languages.ts` only after its file is complete
   and reviewed by a native editor.
4. Interface translations are separate from Bible translations. Never put scripture
   text in locale files.
5. Theological vocabulary produced by machine translation must be approved by a
   native Malayalam (or Hindi/Tamil) Christian editor before release.

## Malayalam
- Fonts: Noto Sans Malayalam (body/UI). Headings fall back to it for Malayalam glyphs.
- Line height is increased for `html[lang='ml']` (body 1.85, headings 1.45) because
  Malayalam conjuncts and vowel signs need more vertical room.
- Use natural contemporary Malayalam, not transliterated English, except for widely
  used product terms (സൈൻ ഇൻ, ഇമെയിൽ, പാസ്‌വേഡ്, ബുക്ക്മാർക്ക്).
- Brand name "THE WORD" stays in Latin script; the native name is വചനം.
- Test mixed Malayalam/English text and references on real Android and iOS devices.

## Glossary (initial — for editorial review)
| English | Malayalam |
|---|---|
| Bible | ബൈബിൾ |
| Old Testament / New Testament | പഴയ നിയമം / പുതിയ നിയമം |
| Verse of the day | ഇന്നത്തെ വചനം |
| Devotional | ധ്യാനം / ധ്യാനചിന്ത |
| Passage | വേദഭാഗം |
| Scripture reference | വേദഭാഗ സൂചന |
| Reading plan | വായനാ പദ്ധതി |
| Prayer journal | പ്രാർത്ഥനാ ഡയറി |
| Theology | ദൈവശാസ്ത്രം |
| Apologetics | വിശ്വാസ സമർത്ഥനം |
| Christian history | ക്രൈസ്തവ ചരിത്രം |
| Ask the Word | വചനത്തോട് ചോദിക്കൂ |
| My Journey | എന്റെ യാത്ര |

## Dates and numbers
Use `formatDate` / `formatNumber` from `src/utils/format.ts` (locales `en-IN`, `ml-IN`).
