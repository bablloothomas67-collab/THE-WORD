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

Remaining tables from the Implementation Package (bookmarks, notes, prayer entries, etc.)
are added in their own phases.
