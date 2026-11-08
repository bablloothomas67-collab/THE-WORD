# Test plan

Automated tests: Vitest + Testing Library (`tests/`). Run `npm run check` before
every commit. Release gates follow section 13 of the Implementation Package.

## Phase 3 (Spiritual features) test report — 8 November 2026

| Check | Result |
|---|---|
| Typecheck / lint | Pass, 0 warnings |
| Unit + component tests | **90/90 pass** (9 files) |
| RLS integration (`npm run test:rls`, now reads `.env.test.local` itself) | **20/20 pass** (profiles 9, Bible/study 6, plans/prayer/devotionals 5) |
| Browser end-to-end (Chrome, real data, 390 px) | Pass, no console errors |

End-to-end steps: signed out, Home shows the verse of the day from the database (John 1:14, KJV)
→ Devotionals list is empty and a draft slug is not found (drafts hidden until approved)
→ `/prayer` redirects to sign-in and returns there afterwards → start *John in 21 days*, tick
day 1, reload: 1 of 21 kept → Home shows "Day 2 of 21: John 2" → prayer journal: create (with
Malayalam text), mark answered, download JSON (contains the entry), delete all → leave plan.
Test data removed.

Bug found and fixed: the plan detail page failed with "more than one relationship" because
`user_reading_progress` links plans and plan days; the embed now names
`reading_plan_days_plan_id_fkey`, and an integration test loads every plan through the app's
service against the real API.

## Phase 2 (Bible) test report — 8 November 2026

| Check | Result |
|---|---|
| Typecheck / lint | Pass, 0 warnings |
| Unit + component tests | **82/82 pass** (9 files) |
| RLS integration (`npm run test:rls`) | **15/15 pass** (profiles 9 + Bible/study 6) |
| Source verification | Verse counts = raw markers; MD5 of every version's full text matches source |
| Search normalisation | SQL, Python and TS identical (fixtures + MD5 of all 131k `search_text` values) |
| Browser end-to-end (Chrome, real data, 390 px Malayalam + 1280 px English) | Pass, no console errors |
| Supabase advisors | Leaked-password protection off (dashboard); `has_role` executable by signed-in users (intended, own roles only); `admin_roles.granted_by` unindexed (minor) |

End-to-end steps: sign in → library (Malayalam names, OT/NT/DC) → John 3 in 1910 → bookmark,
blue highlight and note on 3:16 → reload: all persisted → switch to IRV (attribution shown) →
search "തന്റെ ഏകജാതനായ" finds John 3:16 in both 1910 and IRV → My Journey lists the note →
Psalm 23 WEB shows its superscription. Test items deleted afterwards.

## Task 002 test report — 6 November 2026

| Check | Result |
|---|---|
| Typecheck / lint | Pass, 0 warnings |
| Unit + component tests | **52/52 pass** (6 files) |
| Build | Pass (JS 578 kB / 168 kB gzip — Supabase client now bundled) |
| RLS integration (`npm run test:rls`, 9 tests) | **9/9 pass** against dev project (8 Nov 2026) |
| Browser end-to-end (Chrome, real Supabase) | Pass — /journey redirects to sign-in, sign-in returns to /journey, profile language (ml) applied on sign-in, language switch saved and survives reload, no console errors |
| Supabase security advisor | 1 warning: leaked-password protection disabled (dashboard setting) |

New automated coverage: auth error mapping, sign-up metadata and redirect URLs, password-reset
redirect, profile row validation, update whitelisting, disabled-language rejection, protected
`/journey` redirect, invalid reset link handling.

RLS suite checks: own profile readable; select-all returns only own row; cannot read, update,
insert or delete another user's profile; cannot change `created_at`; only enabled languages
accepted; anonymous visitors see no profiles; language list public and read-only.

## Task 001 test report — 6 November 2026

| Check | Result |
|---|---|
| `npm run typecheck` (strict TypeScript) | Pass |
| `npm run lint` (oxlint) | Pass, 0 warnings |
| `npm test` | **33/33 pass** (5 files) |
| `npm run build` | Pass (JS 348 kB / 110 kB gzip) |
| Browser check (Chrome, production build) | No console errors |

### Automated coverage
- **Localisation:** English and Malayalam have identical keys, no empty strings,
  Malayalam values are in Malayalam script.
- **Language switching:** switching to Malayalam re-renders text, sets
  `<html lang="ml">`, persists to storage; disabled or unknown stored languages fall
  back to English; selector offers only enabled languages.
- **Shell:** both navigations list all five sections; skip link present; every
  route renders its heading; unknown routes show 404.
- **Honesty checks:** Bible page shows "not connected" and no scripture; Ask the Word
  input and button are disabled; sign-in without Supabase reports "not connected"
  instead of succeeding.
- **Validation:** email, password length, matching passwords, required name.
- **Formatting:** English and Malayalam dates, Indian number grouping.

### Manual / visual checks
- Desktop 1280 px English: top navigation, card grid, gold accents — OK.
- Mobile 390 px Malayalam: bottom navigation, Malayalam shaping and line height,
  labels wrap without clipping — OK.
- Dark reading mode with validation errors — readable, errors visible — OK.
- Language choice survives a page reload — OK.

### Not yet tested (out of scope for Task 001)
- Real sign-up / sign-in / password reset, RLS and two-account isolation (Task 002).
- Screen-reader walkthrough with NVDA/TalkBack/VoiceOver and real-device Malayalam
  rendering on Android and iOS — recommended before public launch.
- Automated contrast audit (axe) — recommended to add with Task 002.
