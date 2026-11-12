# Database schema

Source of truth: `supabase/migrations/*.sql` (applied in filename order).

## Applied in Task 002 — `20261106120000_profiles_and_languages.sql`

### `languages`
| Column | Type | Notes |
|---|---|---|
| code | text PK | `en`, `ml`, `hi`, `ta` |
| name, native_name | text | |
| is_enabled | boolean | only `en`, `ml` enabled |
| text_direction | text | `ltr` / `rtl` |
| created_at | timestamptz | |

RLS: readable by everyone; no client writes.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = `auth.users.id`, cascade delete |
| display_name | text | trimmed, max 80 |
| preferred_language | text | FK `languages.code`, must be enabled (trigger) |
| timezone | text | default `Asia/Kolkata` |
| created_at, updated_at | timestamptz | `updated_at` set by trigger; `id`/`created_at` immutable |

- Row created automatically by `handle_new_user()` (trigger on `auth.users`, SECURITY DEFINER,
  fixed `search_path`), using sign-up metadata `display_name` and `preferred_language`.
- RLS: owner-only SELECT and UPDATE; no INSERT/DELETE policies.
- Column privileges: clients may update only `display_name`, `preferred_language`, `timezone`.
- `anon` has no access.

## Applied in Phase 2 — `20261108090000_bible_and_study.sql`, `…090100_bible_seed.sql`, `…100000_search_normalise.sql`

| Table | Purpose | RLS |
|---|---|---|
| `admin_roles` | user_id, role (admin/editor/reviewer/publisher/content_importer) | user reads own; no client writes |
| `audit_events` | role grants/revokes (trigger) | no client access |
| `bible_providers` | eBible.org | public read (active) |
| `bible_versions` | 4 versions + copyright, licence, flags, `enabled` | public read (enabled only) |
| `bible_books` | 81 USFM codes, canonical order, OT/NT/DC | public read |
| `bible_book_names` | per-version names, chapter counts | public read (enabled); insert = content_importer |
| `bible_verses` | PK (version, book, chapter, verse); label; text; search_text (trigram) | public read (enabled); insert = content_importer; no update/delete |
| `bookmarks` | user's bookmarked verses | owner-only CRUD |
| `highlights` | colour gold/blue/green/rose | owner-only; only `colour_key` updatable |
| `study_notes` | private note ≤ 5000 chars | owner-only; only `note_text`, `language_code` updatable |

Study tables reference `bible_verses` by composite foreign key, so a note can never point at a
verse that does not exist. `public.has_role()` is SECURITY DEFINER and reveals only the caller's
own roles (used by RLS). Storage: `bible_verses` ≈ 117 MB including the trigram index.

## Applied in Phase 3 — `20261108120000_spiritual_features.sql`

| Table | Purpose | RLS |
|---|---|---|
| `daily_verse_refs` | 87 approved references (book, chapter, verse range, position) — no Bible text | public read (approved); no client writes |
| `reading_plans`, `reading_plan_localisations`, `reading_plan_days` | john-21, psalms-30, new-testament-260 (EN + ML titles) | public read (published); no client writes |
| `user_reading_plans` | plans a user follows | owner only |
| `user_reading_progress` | completed days; FK to (plan, day) | owner only |
| `prayer_entries` | title, body, category, answered_at | owner only; column-level update grants; never read by admins |
| `devotionals`, `devotional_localisations` | original reflections; status draft → in_review → approved → published | public only when published, dated ≤ today and the localisation approved; status changes audited |

Week 1 devotionals are stored `in_review` with draft localisations — invisible to users until
the owner approves them. Devotionals store Scripture **references only**; the verse text is
fetched from the reader's chosen licensed version.

## Applied — `20261108140000_scripture_audio.sql`

| Table / bucket | Purpose | RLS |
|---|---|---|
| `audio_tracks` | catalogue of recordings: kind (daily_verse / devotional_scripture / devotional_prayer), content key, language, Bible version (null for prayers), storage path, duration, SHA-256 of spoken text, voice, published | public read when published; insert/update only for `content_importer`; no deletes |
| Storage `scripture-audio` | public MP3 files, 5 MB cap | public read by URL; writes only for `content_importer` |

See docs/AUDIO.md.

## Applied in Phase 4 — `20261112150000_ask_the_word.sql`

| Table / function | Purpose | RLS |
|---|---|---|
| `ai_conversations` | one row per Ask the Word conversation | owner reads and deletes; no client insert/update |
| `ai_messages` | questions and validated answers; `refs` holds checked references only (no Bible text) | owner reads; written only by the Edge Function |
| `usage_events` | one row per question (no content) for the daily limit | owner reads; written only by the Edge Function |
| `reserve_ask_question(user, limit)` | atomic limit check + usage row | service role only |

See docs/ASK_THE_WORD.md.

Remaining tables from the Implementation Package (content items,
subscriptions, etc.) are added in their own phases.
