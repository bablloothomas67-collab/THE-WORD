-- Task 002 — languages + profiles with Row Level Security.
-- Safe to run on a fresh project. Uses IF NOT EXISTS / OR REPLACE where possible
-- and never drops or rewrites existing data.

-- ---------------------------------------------------------------------------
-- Languages (interface languages; Bible versions are modelled separately later)
-- ---------------------------------------------------------------------------
create table if not exists public.languages (
  code            text primary key check (code ~ '^[a-z]{2,3}$'),
  name            text not null,
  native_name     text not null,
  is_enabled      boolean not null default false,
  text_direction  text not null default 'ltr' check (text_direction in ('ltr', 'rtl')),
  created_at      timestamptz not null default now()
);

insert into public.languages (code, name, native_name, is_enabled) values
  ('en', 'English',   'English', true),
  ('ml', 'Malayalam', 'മലയാളം',  true),
  ('hi', 'Hindi',     'हिन्दी',    false),
  ('ta', 'Tamil',     'தமிழ்',    false)
on conflict (code) do nothing;

alter table public.languages enable row level security;

drop policy if exists "Languages are readable by everyone" on public.languages;
create policy "Languages are readable by everyone"
  on public.languages for select
  to anon, authenticated
  using (true);
-- No insert/update/delete policies: only the service role / migrations change languages.

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text not null default '' check (char_length(display_name) <= 80),
  preferred_language  text not null default 'en' references public.languages (code),
  timezone            text not null default 'Asia/Kolkata' check (char_length(timezone) <= 64),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists profiles_preferred_language_idx on public.profiles (preferred_language);

-- Keep updated_at current and only allow enabled languages.
create or replace function public.profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.languages l
    where l.code = new.preferred_language and l.is_enabled
  ) then
    raise exception 'Language % is not enabled', new.preferred_language
      using errcode = 'check_violation';
  end if;
  new.display_name := btrim(new.display_name);
  if tg_op = 'UPDATE' then
    new.id := old.id;                 -- id can never change
    new.created_at := old.created_at; -- created_at can never change
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_before_write on public.profiles;
create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

-- Create a profile automatically when a user signs up.
-- SECURITY DEFINER so it can insert even though users have no INSERT policy.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_lang text := new.raw_user_meta_data ->> 'preferred_language';
  requested_name text := left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80);
begin
  if requested_lang is null or not exists (
    select 1 from public.languages l where l.code = requested_lang and l.is_enabled
  ) then
    requested_lang := 'en';
  end if;

  insert into public.profiles (id, display_name, preferred_language)
  values (new.id, requested_name, requested_lang)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users created before this migration.
insert into public.profiles (id)
select u.id from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-only read and update. No insert/delete by clients.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Column-level privileges: clients may only change these three columns.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, preferred_language, timezone) on public.profiles to authenticated;

revoke insert, update, delete on public.languages from anon, authenticated;
grant select on public.languages to anon, authenticated;

-- Trigger functions must not be callable directly through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.profiles_before_write() from public, anon, authenticated;
