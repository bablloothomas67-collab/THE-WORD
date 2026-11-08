# Test plan

Automated tests: Vitest + Testing Library (`tests/`). Run `npm run check` before
every commit. Release gates follow section 13 of the Implementation Package.

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
