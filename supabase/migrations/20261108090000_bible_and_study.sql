-- Phase 2 — Bible content (public, licensed) and private study tools.
-- Additive only: creates new tables, functions and policies.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Roles and audit (minimal, extended in the admin phase)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_roles (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null check (role in ('admin', 'editor', 'reviewer', 'publisher', 'content_importer')),
  granted_by  uuid references public.profiles (id) on delete set null,
  granted_at  timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.admin_roles enable row level security;

drop policy if exists "Users can see their own roles" on public.admin_roles;
create policy "Users can see their own roles"
  on public.admin_roles for select to authenticated
  using ((select auth.uid()) = user_id);
-- No client insert/update/delete: roles are granted by the service role only.

create table if not exists public.audit_events (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid,
  action       text not null,
  target_type  text not null,
  target_id    text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
alter table public.audit_events enable row level security;
-- No client policies at all: audit records are written by triggers and read by the service role.
create index if not exists audit_events_created_idx on public.audit_events (created_at desc);

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_roles r
    where r.user_id = (select auth.uid()) and r.role = required_role
  );
$$;
revoke execute on function public.has_role(text) from public, anon;
grant execute on function public.has_role(text) to authenticated;

create or replace function public.audit_admin_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
  values (
    (select auth.uid()),
    case when tg_op = 'INSERT' then 'role_granted' else 'role_revoked' end,
    'admin_role',
    coalesce(new.user_id, old.user_id)::text,
    jsonb_build_object('role', coalesce(new.role, old.role))
  );
  return coalesce(new, old);
end;
$$;
revoke execute on function public.audit_admin_roles() from public, anon, authenticated;

drop trigger if exists admin_roles_audit on public.admin_roles;
create trigger admin_roles_audit
  after insert or delete on public.admin_roles
  for each row execute function public.audit_admin_roles();

-- ---------------------------------------------------------------------------
-- Bible content
-- ---------------------------------------------------------------------------
create table if not exists public.bible_providers (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  website     text,
  terms_url   text,
  status      text not null default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now()
);

create table if not exists public.bible_versions (
  id                    uuid primary key default gen_random_uuid(),
  provider_id           uuid not null references public.bible_providers (id),
  code                  text not null unique,
  language_code         text not null references public.languages (code),
  name                  text not null,
  short_name            text not null,
  copyright_notice      text not null,
  licence               text not null,
  licence_url           text,
  source_url            text,
  attribution_required  boolean not null default true,
  share_alike           boolean not null default false,
  offline_allowed       boolean not null default false,
  ai_use_allowed        boolean not null default false,
  has_deuterocanon      boolean not null default false,
  sort_order            smallint not null default 100,
  enabled               boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists bible_versions_language_idx on public.bible_versions (language_code);
create index if not exists bible_versions_provider_idx on public.bible_versions (provider_id);

create table if not exists public.bible_books (
  code             text primary key check (code ~ '^[A-Z0-9]{3}$'),
  canonical_order  smallint not null unique,
  testament        text not null check (testament in ('OT', 'NT', 'DC'))
);

create table if not exists public.bible_book_names (
  version_id     uuid not null references public.bible_versions (id) on delete cascade,
  book_code      text not null references public.bible_books (code),
  name           text not null,
  long_name      text,
  abbreviation   text,
  chapter_count  smallint not null check (chapter_count > 0),
  primary key (version_id, book_code)
);
create index if not exists bible_book_names_book_idx on public.bible_book_names (book_code);

create table if not exists public.bible_verses (
  version_id   uuid not null references public.bible_versions (id) on delete cascade,
  book_code    text not null references public.bible_books (code),
  chapter      smallint not null check (chapter > 0),
  verse        smallint not null check (verse >= 0),   -- 0 = Psalm superscription
  label        text not null default '',               -- e.g. "30-31" for combined verses
  text         text not null,
  search_text  text not null,                          -- normalised for search (see docs)
  primary key (version_id, book_code, chapter, verse)
);
create index if not exists bible_verses_book_idx on public.bible_verses (book_code);
create index if not exists bible_verses_search_trgm_idx
  on public.bible_verses using gin (search_text extensions.gin_trgm_ops);

-- Public read for enabled versions only.
alter table public.bible_providers enable row level security;
alter table public.bible_versions enable row level security;
alter table public.bible_books enable row level security;
alter table public.bible_book_names enable row level security;
alter table public.bible_verses enable row level security;

drop policy if exists "Active providers are public" on public.bible_providers;
create policy "Active providers are public" on public.bible_providers
  for select to anon, authenticated using (status = 'active');

drop policy if exists "Enabled versions are public" on public.bible_versions;
create policy "Enabled versions are public" on public.bible_versions
  for select to anon, authenticated using (enabled);

drop policy if exists "Books are public" on public.bible_books;
create policy "Books are public" on public.bible_books
  for select to anon, authenticated using (true);

drop policy if exists "Book names of enabled versions are public" on public.bible_book_names;
create policy "Book names of enabled versions are public" on public.bible_book_names
  for select to anon, authenticated
  using (version_id in (select v.id from public.bible_versions v where v.enabled));

drop policy if exists "Verses of enabled versions are public" on public.bible_verses;
create policy "Verses of enabled versions are public" on public.bible_verses
  for select to anon, authenticated
  using (version_id in (select v.id from public.bible_versions v where v.enabled));

-- Content importers may add (not change or delete) book names and verses.
drop policy if exists "Importers can add book names" on public.bible_book_names;
create policy "Importers can add book names" on public.bible_book_names
  for insert to authenticated with check ((select public.has_role('content_importer')));

drop policy if exists "Importers can add verses" on public.bible_verses;
create policy "Importers can add verses" on public.bible_verses
  for insert to authenticated with check ((select public.has_role('content_importer')));

revoke insert, update, delete on public.bible_providers, public.bible_versions, public.bible_books
  from anon, authenticated;
revoke insert, update, delete on public.bible_book_names, public.bible_verses from anon;
revoke update, delete on public.bible_book_names, public.bible_verses from authenticated;
grant select on public.bible_providers, public.bible_versions, public.bible_books,
  public.bible_book_names, public.bible_verses to anon, authenticated;
grant insert on public.bible_book_names, public.bible_verses to authenticated;

-- ---------------------------------------------------------------------------
-- Private study tools: bookmarks, highlights, notes (owner-only)
-- ---------------------------------------------------------------------------
create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  version_id  uuid not null,
  book_code   text not null,
  chapter     smallint not null,
  verse       smallint not null,
  created_at  timestamptz not null default now(),
  unique (user_id, version_id, book_code, chapter, verse),
  foreign key (version_id, book_code, chapter, verse)
    references public.bible_verses (version_id, book_code, chapter, verse) on delete cascade
);
create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);
create index if not exists bookmarks_verse_idx on public.bookmarks (version_id, book_code, chapter, verse);

create table if not exists public.highlights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  version_id  uuid not null,
  book_code   text not null,
  chapter     smallint not null,
  verse       smallint not null,
  colour_key  text not null check (colour_key in ('gold', 'blue', 'green', 'rose')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, version_id, book_code, chapter, verse),
  foreign key (version_id, book_code, chapter, verse)
    references public.bible_verses (version_id, book_code, chapter, verse) on delete cascade
);
create index if not exists highlights_user_idx on public.highlights (user_id, created_at desc);
create index if not exists highlights_verse_idx on public.highlights (version_id, book_code, chapter, verse);

create table if not exists public.study_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  version_id     uuid not null,
  book_code      text not null,
  chapter        smallint not null,
  verse          smallint not null,
  note_text      text not null check (char_length(btrim(note_text)) between 1 and 5000),
  language_code  text not null default 'en' references public.languages (code),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, version_id, book_code, chapter, verse),
  foreign key (version_id, book_code, chapter, verse)
    references public.bible_verses (version_id, book_code, chapter, verse) on delete cascade
);
create index if not exists study_notes_user_idx on public.study_notes (user_id, updated_at desc);
create index if not exists study_notes_verse_idx on public.study_notes (version_id, book_code, chapter, verse);
create index if not exists study_notes_language_idx on public.study_notes (language_code);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

drop trigger if exists highlights_touch on public.highlights;
create trigger highlights_touch before update on public.highlights
  for each row execute function public.touch_updated_at();
drop trigger if exists study_notes_touch on public.study_notes;
create trigger study_notes_touch before update on public.study_notes
  for each row execute function public.touch_updated_at();

alter table public.bookmarks enable row level security;
alter table public.highlights enable row level security;
alter table public.study_notes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['bookmarks', 'highlights', 'study_notes'] loop
    execute format('drop policy if exists "Owner can read" on public.%I', t);
    execute format('create policy "Owner can read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "Owner can insert" on public.%I', t);
    execute format('create policy "Owner can insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "Owner can update" on public.%I', t);
    execute format('create policy "Owner can update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "Owner can delete" on public.%I', t);
    execute format('create policy "Owner can delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, delete on public.%I to authenticated', t);
  end loop;
end $$;
-- Only the meaningful columns are updatable.
grant update (colour_key) on public.highlights to authenticated;
grant update (note_text, language_code) on public.study_notes to authenticated;
