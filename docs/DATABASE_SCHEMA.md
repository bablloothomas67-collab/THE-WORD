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

Remaining tables from the Implementation Package (bookmarks, notes, prayer entries, etc.)
are added in their own phases.
