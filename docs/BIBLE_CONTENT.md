# Bible content

## Versions (imported 8 November 2026 from eBible.org USFM)

| Code | Language | Name | Licence | Rights holder | Verses | Notes |
|---|---|---|---|---|---|---|
| `mal1910` | ml | സത്യവേദപുസ്തകം 1910 (സമകാലിക ലിപി) | CC BY-SA 4.0 | © 2015 The Free Bible Foundation (based on the public-domain 1910 edition) | 31,098 | eBible id `mal2015` |
| `malirv` | ml | Indian Revised Version (IRV) Malayalam | CC BY-SA 4.0 | © 2017, 2019 Bridge Communication Systems | 31,102 | eBible id `mal` |
| `kjv` | en | King James Version | Public domain | — | 31,102 | eBible id `eng-kjv2006` (Strong's markup removed) |
| `web` | en | World English Bible with Deuterocanon | Public domain | "World English Bible" is a trademark of eBible.org | 38,029 | eBible id `eng-web`; 15 Deuterocanonical books |

Psalm superscriptions are stored as verse 0 (mal1910 117, IRV 117, KJV 116, WEB 118).

### Licence obligations (CC BY-SA 4.0 versions)
- Show the copyright notice and licence wherever the text is displayed — the reader and search
  results render `Attribution` under the text; copied verses include the version and licence.
- Changes: only markup was removed (footnotes, cross-references, introductions, headings) and
  whitespace normalised. Wording is unchanged. If the text is ever edited, mark it as changed.
- Share-alike: the Bible text itself must stay under CC BY-SA if redistributed. Our own
  devotionals, explainers and design remain ours.
- The Catholic POC Malayalam Bible is **not** included; it requires written permission.

## Import pipeline
1. Download `<id>_usfm.zip` from `https://ebible.org/Scriptures/`.
2. `python3 scripts/bible/parse_usfm.py <dir> <code> out.jsonl books.json` — strips markup, keeps
   combined-verse labels (e.g. `30-31`), skips empty verses the translators left blank.
3. Verify verse counts equal the raw `\v` markers (WEB: 29 intentionally blank verses omitted).
4. A temporary account receives the `content_importer` role (SQL, audited), and
   `scripts/bible/import_to_supabase.py` inserts book names and verses via the REST API.
5. The role is revoked; counts and an MD5 of the full text (canonical order) are compared with
   the source; only then is `bible_versions.enabled` set to true.

Verified checksums (book+chapter+":"+verse+text joined by "|", canonical order):
`mal1910 697472c8…`, `malirv 9e07912d…`, `kjv 2d5dea05…`, `web d0f42aba…` — all matched.

## Search
`search_text` = `normalise_search(text)`; identical implementations in SQL
(`public.normalise_search`), Python (`scripts/bible/search_normalise.py`) and TypeScript
(`src/features/bible/searchNormalise.ts`), checked by shared fixtures and by matching MD5s of
the whole column. Malayalam chillu letters are folded to consonant + virama and ZWJ/ZWNJ removed,
so 1910 and IRV spellings match. Each search word must appear (AND), trigram index, max 200 hits.
