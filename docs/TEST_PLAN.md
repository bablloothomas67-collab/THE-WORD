# Test plan

Automated tests: Vitest + Testing Library (`tests/`). Run `npm run check` before
every commit. Release gates follow section 13 of the Implementation Package.

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
