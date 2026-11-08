# Architecture

## Overview

```
Browser (React + TypeScript, responsive)
   │ HTTPS
   ├── Supabase Auth ............ identity and sessions        [Task 002]
   ├── Supabase Postgres + RLS .. private user data            [Task 002+]
   └── Supabase Edge Functions .. trusted backend              [Phase 2/4]
          ├── Bible provider API (licensed scripture)
          ├── OpenAI API (Ask the Word)
          └── Razorpay (subscriptions, Phase 6)
```

Security boundary: the browser only holds the public Supabase URL and anon key.
Every privileged call (AI, Bible provider credentials, payments) goes through an
Edge Function holding secrets server-side.

## Frontend structure

| Path | Responsibility |
|---|---|
| `src/main.tsx` | Loads fonts and styles, initialises i18n, mounts the app |
| `src/app/App.tsx` | Router + AuthProvider |
| `src/app/AppRoutes.tsx` | Route table, all inside `AppLayout` |
| `src/app/i18n.ts` | i18next setup, language persistence, `<html lang>` sync |
| `src/config/languages.ts` | Interface language registry (enabled flags, locales, direction) |
| `src/layouts/AppLayout.tsx` | Skip link, top bar, `<main>`, bottom nav |
| `src/components/navigation/` | TopBar (desktop links + controls), BottomNav (mobile), LanguageSelector, ThemeToggle |
| `src/components/ui/` | Design-system components |
| `src/features/auth/` | `authService` (provider wrapper), `AuthProvider`/`useAuth`, `ProtectedRoute` |
| `src/services/supabase/client.ts` | Supabase client, `null` when not configured |
| `src/pages/` | Route screens |
| `src/utils/` | Validation, localised formatting |
| `src/styles/` | Tokens and global styles |

### Design decisions
- **CSS Modules + CSS custom properties** instead of a UI framework: no extra
  dependency, tokens are shared with future native apps as plain values.
- **Self-hosted fonts** (`@fontsource`) — no third-party font CDN, works offline,
  no tracking. Browsers only download the subsets a page needs (unicode-range).
- **Auth behind a service interface** so pages never call Supabase directly and
  tests can run without a backend. With no credentials, the service returns
  `not_configured` and the UI says so — it never fakes success.
- **Placeholders are explicit.** Bible, Ask the Word, devotionals and plans show
  "Not connected yet" / "Coming soon" badges. No scripture text exists in the code.

## Localisation
- Interface strings: `src/locales/<lang>/common.json`, accessed via `t('key')`.
- Only languages with `enabled: true` are registered with i18next and offered in
  the selector; Hindi and Tamil files exist but are empty and disabled.
- Bible translation metadata (versions, licences, attribution) will live in the
  database (`bible_versions`, `bible_providers`), separate from interface text.
- Choice persists in `localStorage` (`theword.language`); Task 002 also stores it
  in `profiles.preferred_language` for signed-in users.

## Authentication (Task 002)
- `authService` wraps Supabase Auth and maps errors to translation keys.
- `profileService` reads/updates the signed-in user's `profiles` row and validates responses.
- `AuthProvider` tracks the session, loads the profile on sign-in, applies its language,
  and exposes `setLanguage` (switches UI and saves to profile) and `updateProfile`.
- `ProtectedRoute` guards `/journey`; RLS is the real guarantee.
- Password reset: email link → `/reset-password` recovery session → `updateUser({ password })`.

## Bible (Phase 2)
- `src/services/bible-provider/types.ts` — provider contract (`listVersions`, `listBooks`,
  `getChapter`, `search`) and typed errors (`not_configured`, `unavailable`, `not_found`,
  `invalid_query`). Screens depend only on this, so a commercial API can replace it later.
- `supabaseProvider.ts` — reads public, RLS-protected tables; validates every row; caches
  versions/books; never substitutes another version on failure.
- Routes: `/bible` (library, `?v=`), `/bible/:version/:book/:chapter` (reader), `/bible/search?v=&q=`.
- `features/study/studyService.ts` — bookmarks, highlights, notes; `StudyLists` on My Journey.
- Reading position, preferred version per language and text size live in localStorage.

## Planned next layers
- Phase 2: Bible provider adapter interface (`src/services/bible-provider/`) with a
  server-side implementation; UI depends only on the interface.
