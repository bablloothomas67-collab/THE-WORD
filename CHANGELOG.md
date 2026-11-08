# Changelog

## 0.4.1 — 2026-11-08 — Listen: Scripture and prayer audio

### Added
- "Listen" player (play/pause, seek, time, AI-voice caption; loads only on press) on the verse
  of the day and on devotional Scripture and prayers, in English and Malayalam.
- Designed ElevenLabs voice "THE WORD – Ammachi"; all 87 daily verses recorded in KJV and
  Malayalam 1910 from the stored text.
- Migration `20261108140000_scripture_audio.sql`: `audio_tracks` catalogue + public
  `scripture-audio` bucket, importer-only writes.
- `scripts/audio/generate_audio.py` and `upload_audio.py`; docs/AUDIO.md.
- Tests: audio service, player and formatter; RLS for the audio catalogue and bucket.

## 0.4.0 — 2026-11-08 — Phase 3: Spiritual features

### Added
- Verse of the day on Home: one of 87 approved references, same for everyone each local day,
  text from the reader's chosen version.
- Reading plans: John in 21 days, Psalms in 30 days, New Testament in 260 days — start, tick
  days, progress, next reading on Home, leave plan.
- Private prayer journal (`/prayer`, sign-in required): categories, answered/praying filter,
  edit, delete, JSON download, delete all. Never sent to analytics or AI.
- Devotionals (list + detail) with editorial workflow; 7 Week 1 devotionals in English and
  Malayalam awaiting owner approval (`content/devotionals/week-01.json`).
- `getPassage` on the Bible provider (refuses partial passages).
- Deploy config: `vercel.json` (SPA rewrite, security headers, asset caching) and `public/_redirects`.
- Tests: spiritual features unit tests; RLS for plans, prayer and devotionals; plans service
  against the real API.

### Fixed
- Plan detail embed ambiguity (`reading_plan_days!reading_plan_days_plan_id_fkey`).
- `npm run test:rls` loads `.env.test.local` automatically.

## 0.3.0 — 2026-11-08 — Phase 2: Bible

### Added
- Four licensed versions from eBible.org, verified against source: Malayalam 1910 (Free Bible
  Foundation, CC BY-SA 4.0), IRV Malayalam (Bridge Communication Systems, CC BY-SA 4.0), KJV and
  WEB with Deuterocanon (public domain). See docs/BIBLE_CONTENT.md.
- Tables: bible providers/versions/books/book names/verses, admin_roles, audit_events,
  bookmarks, highlights, study_notes — RLS throughout.
- Bible provider adapter; library (OT/NT/Deuterocanon), reader (text size, version switch,
  prev/next across books, Psalm titles, attribution), search (Malayalam-aware), verse actions
  (bookmark, 4 highlight colours, private note, copy with attribution).
- Continue reading on Home and Library; bookmarks/highlights/notes on My Journey.
- USFM parser, importer and search normaliser scripts; SQL `normalise_search`.
- Tests: provider, normaliser parity, navigation, reader screens; RLS for Bible text and study tools.

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
