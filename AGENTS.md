# AGENTS.md — rules for anyone (human or AI) changing THE WORD

Read this before making any change. The full specification lives in the claude.ai
project "Bible and Christian Religious App" (THE WORD — Master AI Development
Instructions and Implementation Package v1.0). This file is the in-repo summary.

## Product
THE WORD (വചനം) — "Read. Understand. Reflect. Believe."
A broadly ecumenical (Catholic, Orthodox, Protestant), multilingual Bible and
Christian learning platform. Freemium SaaS. Website first, then Android, then iPhone.
Launch languages: English, Malayalam. Prepared, not enabled: Hindi, Tamil.

## Stack (do not migrate without owner approval)
React + TypeScript + Vite · Supabase (Postgres, Auth, Edge Functions, RLS) ·
OpenAI via server-side functions only · licensed Bible provider via an adapter ·
Razorpay (later) · GitHub.

## Non-negotiable rules
1. Never fabricate Bible quotations or references. Scripture comes only from the licensed versions in the
   database (imported from source and checksum-verified); none is hardcoded in the app.
2. Never display a Bible translation without a confirmed licence for that use.
3. Never put secrets in frontend code or `VITE_*` variables (only the Supabase URL and anon key are public).
4. Never claim an integration works until it has been tested.
5. Never hardcode UI text — use translation keys in `src/locales/<lang>/common.json`.
6. Prayer entries and notes are private by default; never send them to analytics or AI.
7. No destructive database changes without approval; all schema changes are migrations in `supabase/migrations/`.
8. Build only the approved task/phase. Don't replace working features without approval.
9. Machine-translated theological text needs human editorial approval.

## Workflow for every task
Before: inspect the repo, read this file, identify files, explain the plan.
After: `npm run check` (typecheck + lint + tests + build), verify in a browser,
update docs and CHANGELOG, then report: implemented, files created/modified,
database changes, integrations, tests and results, limitations, security notes,
recommended next task. Wait for owner approval before the next phase.

## Commands
- `npm run dev` — local dev server
- `npm run check` — everything that must pass before a commit
- `npm test` — unit/integration tests (Vitest + Testing Library)

## Where things live
- `src/app` — app bootstrap, routes, i18n setup
- `src/components/ui` — reusable design-system components
- `src/components/navigation` — top bar, bottom nav, language selector, theme toggle
- `src/features/<feature>` — feature logic (auth now; bible, prayer, etc. later)
- `src/services` — external providers (Supabase, bible-provider adapter; ai, payments later)
- `scripts/bible` — USFM parser, importer and search normaliser (keep in sync with SQL + TS)
- `src/locales/<lang>` — interface translations
- `src/styles/tokens.css` — design tokens (colours, type, spacing)
- `supabase/` — migrations, edge functions, seed data
- `docs/` — architecture, security, localisation, testing, deployment
