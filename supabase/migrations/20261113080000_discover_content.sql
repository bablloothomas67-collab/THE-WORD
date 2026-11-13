-- Phase 5 — Discover: Bible stories, Christian history, theology, apologetics, quizzes.
-- Additive only. Original educational writing, kept separate from Bible text:
-- Scripture is stored as references and always displayed from bible_verses.
-- Nothing is visible until an item is published AND its localisation is approved.

create table if not exists public.content_items (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  kind            text not null check (kind in ('story', 'history', 'theology', 'apologetics', 'quiz')),
  status          text not null default 'draft'
                    check (status in ('draft', 'in_review', 'approved', 'published', 'withdrawn')),
  -- Reserved for Phase 6. Premium text stays hidden from everyone until entitlements exist.
  is_premium      boolean not null default false,
  sort_order      smallint not null default 100,
  author_label    text not null default 'THE WORD editorial team',
  reviewer_label  text,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists content_items_kind_idx on public.content_items (kind, sort_order);

create table if not exists public.content_localisations (
  id              uuid primary key default gen_random_uuid(),
  content_id      uuid not null references public.content_items (id) on delete cascade,
  language_code   text not null references public.languages (code),
  title           text not null check (char_length(btrim(title)) between 1 and 160),
  summary         text not null check (char_length(summary) <= 400),
  -- Articles: [{ "heading": text, "body": text }]. Empty for quizzes.
  sections        jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  -- Quizzes: [{ "prompt", "options": [..], "correct": index, "explanation", "ref": {...}|null }]. Empty for articles.
  questions       jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  -- [{ "book", "chapter", "verse_start", "verse_end" }] — references only, never Bible text.
  scripture_refs  jsonb not null default '[]'::jsonb check (jsonb_typeof(scripture_refs) = 'array'),
  -- [{ "label": text, "url": text|null }] — where the historical/factual claims come from.
  sources         jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  review_status   text not null default 'draft' check (review_status in ('draft', 'approved')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (content_id, language_code)
);
create index if not exists content_localisations_lang_idx on public.content_localisations (language_code);

drop trigger if exists content_items_touch on public.content_items;
create trigger content_items_touch before update on public.content_items
  for each row execute function public.touch_updated_at();
drop trigger if exists content_localisations_touch on public.content_localisations;
create trigger content_localisations_touch before update on public.content_localisations
  for each row execute function public.touch_updated_at();

create or replace function public.audit_content_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
    values ((select auth.uid()), 'content_status', 'content_item', new.id::text,
            jsonb_build_object('slug', new.slug, 'kind', new.kind,
                               'from', case when tg_op = 'UPDATE' then old.status end,
                               'to', new.status, 'reviewer', new.reviewer_label));
  end if;
  return new;
end;
$$;
revoke execute on function public.audit_content_status() from public, anon, authenticated;
drop trigger if exists content_items_audit on public.content_items;
create trigger content_items_audit after insert or update on public.content_items
  for each row execute function public.audit_content_status();

alter table public.content_items enable row level security;
alter table public.content_localisations enable row level security;

drop policy if exists "Published content is public" on public.content_items;
create policy "Published content is public" on public.content_items
  for select to anon, authenticated using (status = 'published');

drop policy if exists "Approved text of published free content is public" on public.content_localisations;
create policy "Approved text of published free content is public" on public.content_localisations
  for select to anon, authenticated
  using (review_status = 'approved' and content_id in (
    select c.id from public.content_items c where c.status = 'published' and not c.is_premium));

-- Content-importer account (role granted only for the duration of an import): unpublished rows only.
drop policy if exists "Importers read content" on public.content_items;
create policy "Importers read content" on public.content_items
  for select to authenticated using ((select public.has_role('content_importer')));
drop policy if exists "Importers add content drafts" on public.content_items;
create policy "Importers add content drafts" on public.content_items
  for insert to authenticated
  with check ((select public.has_role('content_importer')) and status in ('draft', 'in_review'));
drop policy if exists "Importers read content texts" on public.content_localisations;
create policy "Importers read content texts" on public.content_localisations
  for select to authenticated using ((select public.has_role('content_importer')));
drop policy if exists "Importers add content draft texts" on public.content_localisations;
create policy "Importers add content draft texts" on public.content_localisations
  for insert to authenticated
  with check ((select public.has_role('content_importer')) and review_status = 'draft');

revoke all on public.content_items, public.content_localisations from anon, authenticated;
grant select on public.content_items, public.content_localisations to anon, authenticated;
grant insert on public.content_items, public.content_localisations to authenticated;

-- ---------------------------------------------------------------------------
-- Saved content and quiz results — private to their owner
-- ---------------------------------------------------------------------------
create table if not exists public.saved_content (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content_id  uuid not null references public.content_items (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, content_id)
);
create index if not exists saved_content_content_idx on public.saved_content (content_id);

create table if not exists public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content_id  uuid not null references public.content_items (id) on delete cascade,
  score       smallint not null,
  total       smallint not null check (total between 1 and 50),
  created_at  timestamptz not null default now(),
  check (score between 0 and total)
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);
create index if not exists quiz_attempts_content_idx on public.quiz_attempts (content_id);

alter table public.saved_content enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "Owner can read" on public.saved_content;
create policy "Owner can read" on public.saved_content
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Owner can insert" on public.saved_content;
create policy "Owner can insert" on public.saved_content
  for insert to authenticated
  with check ((select auth.uid()) = user_id
              and content_id in (select c.id from public.content_items c where c.status = 'published'));
drop policy if exists "Owner can delete" on public.saved_content;
create policy "Owner can delete" on public.saved_content
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Owner can read" on public.quiz_attempts;
create policy "Owner can read" on public.quiz_attempts
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Owner can insert" on public.quiz_attempts;
create policy "Owner can insert" on public.quiz_attempts
  for insert to authenticated
  with check ((select auth.uid()) = user_id
              and content_id in (select c.id from public.content_items c
                                 where c.status = 'published' and c.kind = 'quiz'));
drop policy if exists "Owner can delete" on public.quiz_attempts;
create policy "Owner can delete" on public.quiz_attempts
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.saved_content, public.quiz_attempts from anon, authenticated;
grant select, insert, delete on public.saved_content, public.quiz_attempts to authenticated;
