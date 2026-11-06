# Changelog

## 0.2.0 — 2026-11-06 — Task 002: Authentication

### Added
- Migration `20261106120000_profiles_and_languages.sql`: `languages` and `profiles` tables, automatic
  profile creation on sign-up, owner-only Row Level Security, column-level update privileges,
  enabled-language enforcement.
- Sign up, sign in, sign out, forgot password, reset password (recovery link) screens.
- `/journey` is now a protected route; sign-in returns the user to where they came from (in-app paths only).
- Profile card on My Journey: email, preferred language, editable display name.
- Language preference saved to the profile and restored on sign-in on any device.
- Supabase error codes mapped to English/Malayalam messages.
- Tests: auth service with mocked client, profile service and row parsing, protected routes,
  reset-link handling; two-account RLS integration suite (`npm run test:rls`).

### Changed
- Unit tests always mock the Supabase client, so they never touch a real backend.

## 0.1.0 — 2026-11-06 — Task 001: Foundation

### Added
- React 19 + TypeScript + Vite project with React Router, i18next and the Supabase JS client.
- Design tokens (navy, ivory, antique gold, neutrals) with light and dark reading modes.
- Reusable UI: Button, ButtonLink, Card, Badge, TextField, LoadingState, EmptyState, ErrorState, Notice.
- Responsive app shell: desktop top navigation, mobile bottom navigation, skip link.
- Screens: Home, Bible placeholder, Ask the Word placeholder, Discover, My Journey, Login, Register, 404.
- English and Malayalam interface translations; Hindi/Tamil prepared and disabled.
- Persisted language and theme preferences; `<html lang>` kept in sync.
- Auth architecture (service, context, protected route) — inactive until Supabase is configured.
- Tests: translation completeness, validation, auth service, formatting, app shell, language switching.
- Docs: AGENTS.md, architecture, localisation, security, test plan, deployment.
