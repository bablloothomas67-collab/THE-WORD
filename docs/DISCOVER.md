# Discover (Phase 5)

Bible stories, Christian history, theology, apologetics and quizzes, in English and Malayalam.

## How it works

- `/discover` — one card per section with the number of items available in the reader's language.
- `/discover/<section>` — list (`stories`, `history`, `theology`, `apologetics`, `quizzes`).
- `/discover/<section>/<slug>` — article or quiz.
- Signed-in readers can save an item ("Saved content" in My Journey) and their quiz results are kept.
  Visitors can read everything and take quizzes; nothing is stored for them.

## Content rules

1. **Original writing only.** Articles are written for THE WORD; they are not copied from books or sites.
2. **Scripture is never typed into an article.** Each item carries a list of references; a marker such as
   `[[2]]` in the text becomes a link to the reader, and the passage is displayed from the licensed Bible
   versions (`PassageView`). A marker with no reference behind it is dropped at render time.
3. **Every reference must exist in every enabled Bible version.** `scripts/content/validate_discover.py`
   checks this against the database (it caught Acts 8:37, which the WEB omits).
4. **Ecumenical fairness.** Where Catholic, Orthodox (Eastern and Oriental) and Protestant churches differ,
   the article says so and states each view as its own members would. No tradition is described only by
   its critics.
5. **Sources.** History, theology and apologetics items list their sources. Sources are shown as plain
   text; only `https://` addresses are ever rendered as links.
6. **Human approval.** Nothing is visible until the item is `published` and the language version is
   `approved`. Malayalam is translated by the AI author and approved by the owner; it has not yet been
   checked by a theological editor.
7. **Premium flag.** `content_items.is_premium` is reserved for Phase 6. Text of premium items is hidden
   from everyone by RLS until entitlements exist, so a premium item cannot leak early.

## Files

- `content/discover/{stories,history,theology,apologetics,quizzes}.json` — the reviewed source text.
  Articles: `scripture_refs` and `sources` are shared by both languages. Quizzes: the answer key
  (`answers[].correct`, `answers[].ref`) is shared, so English and Malayalam cannot disagree.
- `scripts/content/validate_discover.py` — structure + reference check (`--show` prints verse openings).
- `scripts/content/build_discover_review.py` — builds the owner's review file.
- `scripts/content/import_discover.py` — loads drafts as the content-importer account and verifies the
  stored text equals the file.
- `src/features/discover/contentService.ts`, `src/pages/DiscoverPage.tsx`,
  `src/features/bible/Citations.tsx`, `src/features/bible/useRefLinks.tsx` (shared with Ask the Word).

## Publishing a batch

1. Draft JSON → `validate_discover.py` → `build_discover_review.py` → owner reviews.
2. On approval: grant `content_importer` + temporary password (SQL, owner taps Allow).
3. `import_discover.py` (rows arrive as `in_review` / `draft`).
4. SQL (owner taps Allow): set `content_items.status = 'published'`, `reviewer_label`, `reviewed_at`;
   set `content_localisations.review_status = 'approved'`; revoke the role; rotate the password.

## Known limits

- Quiz scores are computed in the browser and stored as reported. They are a private study aid, not a
  certificate; do not build rewards or leaderboards on them without server-side marking.
- Quiz answer keys are delivered with the questions (needed for instant feedback).
- No search inside Discover yet; no audio or video (Phase 8).
