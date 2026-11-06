# THE WORD · വചനം

**Read. Understand. Reflect. Believe.**

A multilingual, broadly ecumenical Bible and Christian learning platform — responsive
website first, Android and iPhone later. Launch languages: English and Malayalam.

> Status: **Phase 1 — Foundation (Task 001 complete).** App shell, design system,
> navigation, English/Malayalam localisation and the authentication structure are in
> place. Accounts, Bible text, the AI assistant and payments are **not connected yet**,
> and the app says so on screen rather than faking them.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # optional until Supabase is set up
npm run dev                  # http://localhost:5173
```

Without Supabase variables the app still runs; sign-in forms show a
"not connected yet" notice.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | Oxlint |
| `npm test` | Vitest unit and component tests |
| `npm run check` | Typecheck + lint + tests + build (run before every commit) |

## What's in Task 001

- Design system: navy / ivory / antique-gold tokens, light and dark reading modes,
  Noto Serif + Noto Sans + Noto Sans Malayalam (self-hosted), buttons, cards, badges,
  text fields, loading / empty / error / notice states.
- Responsive shell: top navigation on desktop, bottom navigation on mobile, skip link,
  visible focus, screen-reader labels.
- Screens: Home, Bible (placeholder), Ask the Word (placeholder), Discover, My Journey,
  Login, Register, Not found.
- Localisation: English and Malayalam with translation keys, persisted choice,
  `<html lang>` sync, Malayalam line-height, localised dates/numbers, completeness tests.
  Hindi and Tamil folders prepared but disabled.
- Auth architecture: Supabase client (public keys only), auth service, auth context,
  protected-route component — ready for Task 002.

## Documentation

- [AGENTS.md](AGENTS.md) — rules for every change
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/LOCALISATION_GUIDELINES.md](docs/LOCALISATION_GUIDELINES.md)
- [docs/SECURITY_POLICY.md](docs/SECURITY_POLICY.md)
- [docs/TEST_PLAN.md](docs/TEST_PLAN.md) — includes the Task 001 test report
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — environment variables and hosting
- [CHANGELOG.md](CHANGELOG.md)

PRD, database schema, API specifications and editorial guidelines are defined in the
Implementation Package v1.0 (project files) and will be copied into `docs/` as each
phase begins.
