-- Phase 3 — daily verse, reading plans, prayer journal, devotionals.
-- Additive only. Editorial content is hidden until reviewed/published.

-- ---------------------------------------------------------------------------
-- Daily verse: curated references (text always comes from bible_verses)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_verse_refs (
  position       integer primary key check (position > 0),
  book_code      text not null references public.bible_books (code),
  chapter        smallint not null check (chapter > 0),
  verse_start    smallint not null check (verse_start > 0),
  verse_end      smallint not null,
  review_status  text not null default 'pending' check (review_status in ('pending', 'approved')),
  reviewed_by    text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  check (verse_end >= verse_start and verse_end - verse_start <= 5)
);
create index if not exists daily_verse_refs_book_idx on public.daily_verse_refs (book_code);
alter table public.daily_verse_refs enable row level security;
drop policy if exists "Approved daily verses are public" on public.daily_verse_refs;
create policy "Approved daily verses are public" on public.daily_verse_refs
  for select to anon, authenticated using (review_status = 'approved');
revoke insert, update, delete on public.daily_verse_refs from anon, authenticated;
grant select on public.daily_verse_refs to anon, authenticated;

-- References were chosen by the project and verified to exist in all four enabled
-- versions. Approved under the owner's Phase 3 instruction (8 Nov 2026).
insert into public.daily_verse_refs (position, book_code, chapter, verse_start, verse_end, review_status, reviewed_by, reviewed_at) 
select v.*, 'approved', 'project owner', now() from (values
  (1, 'GEN', 1, 1, 1),
  (2, 'GEN', 28, 15, 15),
  (3, 'NUM', 6, 24, 26),
  (4, 'DEU', 31, 6, 6),
  (5, 'JOS', 1, 9, 9),
  (6, '1SA', 16, 7, 7),
  (7, '2CH', 7, 14, 14),
  (8, 'NEH', 8, 10, 10),
  (9, 'JOB', 19, 25, 25),
  (10, 'PSA', 1, 1, 2),
  (11, 'PSA', 16, 11, 11),
  (12, 'PSA', 19, 14, 14),
  (13, 'PSA', 23, 1, 3),
  (14, 'PSA', 27, 1, 1),
  (15, 'PSA', 34, 8, 8),
  (16, 'PSA', 37, 5, 5),
  (17, 'PSA', 46, 1, 1),
  (18, 'PSA', 46, 10, 10),
  (19, 'PSA', 51, 10, 10),
  (20, 'PSA', 55, 22, 22),
  (21, 'PSA', 90, 12, 12),
  (22, 'PSA', 91, 1, 2),
  (23, 'PSA', 103, 2, 3),
  (24, 'PSA', 118, 24, 24),
  (25, 'PSA', 119, 105, 105),
  (26, 'PSA', 121, 1, 2),
  (27, 'PSA', 139, 14, 14),
  (28, 'PRO', 3, 5, 6),
  (29, 'PRO', 16, 3, 3),
  (30, 'ECC', 3, 1, 1),
  (31, 'ISA', 9, 6, 6),
  (32, 'ISA', 26, 3, 3),
  (33, 'ISA', 40, 31, 31),
  (34, 'ISA', 41, 10, 10),
  (35, 'ISA', 43, 2, 2),
  (36, 'ISA', 53, 5, 5),
  (37, 'JER', 29, 11, 11),
  (38, 'LAM', 3, 22, 23),
  (39, 'MIC', 6, 8, 8),
  (40, 'ZEP', 3, 17, 17),
  (41, 'MAT', 5, 9, 9),
  (42, 'MAT', 5, 14, 16),
  (43, 'MAT', 6, 33, 33),
  (44, 'MAT', 7, 7, 7),
  (45, 'MAT', 11, 28, 30),
  (46, 'MAT', 22, 37, 39),
  (47, 'MAT', 28, 20, 20),
  (48, 'MRK', 10, 27, 27),
  (49, 'LUK', 1, 37, 37),
  (50, 'LUK', 6, 31, 31),
  (51, 'JHN', 1, 14, 14),
  (52, 'JHN', 3, 16, 16),
  (53, 'JHN', 8, 12, 12),
  (54, 'JHN', 10, 11, 11),
  (55, 'JHN', 11, 25, 25),
  (56, 'JHN', 14, 6, 6),
  (57, 'JHN', 14, 27, 27),
  (58, 'JHN', 15, 5, 5),
  (59, 'JHN', 15, 12, 12),
  (60, 'ACT', 1, 8, 8),
  (61, 'ROM', 5, 8, 8),
  (62, 'ROM', 8, 28, 28),
  (63, 'ROM', 8, 38, 39),
  (64, 'ROM', 12, 2, 2),
  (65, 'ROM', 12, 12, 12),
  (66, '1CO', 13, 4, 7),
  (67, '1CO', 16, 14, 14),
  (68, '2CO', 5, 17, 17),
  (69, '2CO', 12, 9, 9),
  (70, 'GAL', 2, 20, 20),
  (71, 'GAL', 5, 22, 23),
  (72, 'EPH', 2, 8, 9),
  (73, 'EPH', 4, 32, 32),
  (74, 'PHP', 4, 6, 7),
  (75, 'PHP', 4, 13, 13),
  (76, 'COL', 3, 23, 23),
  (77, '1TH', 5, 16, 18),
  (78, '2TI', 1, 7, 7),
  (79, 'HEB', 11, 1, 1),
  (80, 'HEB', 13, 8, 8),
  (81, 'JAS', 1, 5, 5),
  (82, '1PE', 5, 7, 7),
  (83, '1JN', 1, 9, 9),
  (84, '1JN', 4, 8, 8),
  (85, '1JN', 4, 19, 19),
  (86, 'REV', 3, 20, 20),
  (87, 'REV', 21, 4, 4)
) as v(position, book_code, chapter, verse_start, verse_end)
on conflict (position) do nothing;

-- ---------------------------------------------------------------------------
-- Reading plans
-- ---------------------------------------------------------------------------
create table if not exists public.reading_plans (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9-]+$'),
  duration_days  smallint not null check (duration_days between 1 and 400),
  status         text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  sort_order     smallint not null default 100,
  created_at     timestamptz not null default now()
);

create table if not exists public.reading_plan_localisations (
  plan_id        uuid not null references public.reading_plans (id) on delete cascade,
  language_code  text not null references public.languages (code),
  title          text not null check (char_length(title) <= 120),
  description    text not null check (char_length(description) <= 600),
  primary key (plan_id, language_code)
);
create index if not exists reading_plan_localisations_lang_idx on public.reading_plan_localisations (language_code);

create table if not exists public.reading_plan_days (
  plan_id        uuid not null references public.reading_plans (id) on delete cascade,
  day_number     smallint not null check (day_number > 0),
  book_code      text not null references public.bible_books (code),
  chapter_start  smallint not null check (chapter_start > 0),
  chapter_end    smallint not null,
  primary key (plan_id, day_number),
  check (chapter_end >= chapter_start)
);
create index if not exists reading_plan_days_book_idx on public.reading_plan_days (book_code);

create table if not exists public.user_reading_plans (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  plan_id     uuid not null references public.reading_plans (id) on delete cascade,
  started_at  timestamptz not null default now(),
  primary key (user_id, plan_id)
);
create index if not exists user_reading_plans_plan_idx on public.user_reading_plans (plan_id);

create table if not exists public.user_reading_progress (
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  plan_id       uuid not null references public.reading_plans (id) on delete cascade,
  day_number    smallint not null,
  completed_at  timestamptz not null default now(),
  primary key (user_id, plan_id, day_number),
  foreign key (plan_id, day_number) references public.reading_plan_days (plan_id, day_number) on delete cascade
);
create index if not exists user_reading_progress_plan_day_idx on public.user_reading_progress (plan_id, day_number);

alter table public.reading_plans enable row level security;
alter table public.reading_plan_localisations enable row level security;
alter table public.reading_plan_days enable row level security;
alter table public.user_reading_plans enable row level security;
alter table public.user_reading_progress enable row level security;

drop policy if exists "Published plans are public" on public.reading_plans;
create policy "Published plans are public" on public.reading_plans
  for select to anon, authenticated using (status = 'published');
drop policy if exists "Published plan text is public" on public.reading_plan_localisations;
create policy "Published plan text is public" on public.reading_plan_localisations
  for select to anon, authenticated
  using (plan_id in (select p.id from public.reading_plans p where p.status = 'published'));
drop policy if exists "Published plan days are public" on public.reading_plan_days;
create policy "Published plan days are public" on public.reading_plan_days
  for select to anon, authenticated
  using (plan_id in (select p.id from public.reading_plans p where p.status = 'published'));
revoke insert, update, delete on public.reading_plans, public.reading_plan_localisations, public.reading_plan_days
  from anon, authenticated;
grant select on public.reading_plans, public.reading_plan_localisations, public.reading_plan_days to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['user_reading_plans', 'user_reading_progress'] loop
    execute format('drop policy if exists "Owner can read" on public.%I', t);
    execute format('create policy "Owner can read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "Owner can insert" on public.%I', t);
    execute format('create policy "Owner can insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and plan_id in (select p.id from public.reading_plans p where p.status = ''published''))', t);
    execute format('drop policy if exists "Owner can delete" on public.%I', t);
    execute format('create policy "Owner can delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke update on public.%I from authenticated', t);
    execute format('grant select, insert, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Seed the three plans chosen by the owner.
insert into public.reading_plans (slug, duration_days, status, sort_order) values
  ('john-21', 21, 'published', 10),
  ('psalms-30', 30, 'published', 20),
  ('new-testament-260', 260, 'published', 30)
on conflict (slug) do nothing;

insert into public.reading_plan_localisations (plan_id, language_code, title, description)
select p.id, l.lang, l.title, l.description from public.reading_plans p
join (values
  ('john-21', 'en', 'The Gospel of John in 21 days', 'One chapter a day through the Gospel of John — the life, signs and words of Jesus.'),
  ('john-21', 'ml', 'യോഹന്നാൻ സുവിശേഷം 21 ദിവസത്തിൽ', 'ദിവസം ഒരു അധ്യായം വീതം യോഹന്നാൻ സുവിശേഷം — യേശുവിന്റെ ജീവിതവും അടയാളങ്ങളും വചനങ്ങളും.'),
  ('psalms-30', 'en', 'Psalms in 30 days', 'Five psalms a day: prayers of praise, lament and trust for every season of life.'),
  ('psalms-30', 'ml', 'സങ്കീർത്തനങ്ങൾ 30 ദിവസത്തിൽ', 'ദിവസം അഞ്ചു സങ്കീർത്തനങ്ങൾ: ജീവിതത്തിന്റെ എല്ലാ കാലങ്ങൾക്കുമുള്ള സ്തുതിയുടെയും വിലാപത്തിന്റെയും ആശ്രയത്തിന്റെയും പ്രാർത്ഥനകൾ.'),
  ('new-testament-260', 'en', 'The New Testament in 260 days', 'One chapter a day, Monday to Friday, through the whole New Testament in about a year.'),
  ('new-testament-260', 'ml', 'പുതിയ നിയമം 260 ദിവസത്തിൽ', 'തിങ്കൾ മുതൽ വെള്ളി വരെ ദിവസം ഒരു അധ്യായം വീതം, ഏകദേശം ഒരു വർഷം കൊണ്ട് പുതിയ നിയമം മുഴുവൻ.')
) as l(slug, lang, title, description) on l.slug = p.slug
on conflict (plan_id, language_code) do nothing;

-- John: chapter n on day n.
insert into public.reading_plan_days (plan_id, day_number, book_code, chapter_start, chapter_end)
select p.id, d, 'JHN', d, d from public.reading_plans p, generate_series(1, 21) d where p.slug = 'john-21'
on conflict do nothing;

-- Psalms: 5 a day.
insert into public.reading_plan_days (plan_id, day_number, book_code, chapter_start, chapter_end)
select p.id, d, 'PSA', (d - 1) * 5 + 1, d * 5 from public.reading_plans p, generate_series(1, 30) d where p.slug = 'psalms-30'
on conflict do nothing;

-- New Testament: every chapter in canonical order (260 chapters), using KJV chapter counts.
insert into public.reading_plan_days (plan_id, day_number, book_code, chapter_start, chapter_end)
select p.id, row_number() over (order by b.canonical_order, c)::smallint, b.code, c, c
from public.reading_plans p
cross join public.bible_books b
join public.bible_book_names n on n.book_code = b.code
join public.bible_versions v on v.id = n.version_id and v.code = 'kjv'
cross join lateral generate_series(1, n.chapter_count) c
where p.slug = 'new-testament-260' and b.testament = 'NT'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Prayer journal — private by default, owner only, no admin access
-- ---------------------------------------------------------------------------
create table if not exists public.prayer_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  body          text not null default '' check (char_length(body) <= 10000),
  category      text not null default 'other'
                  check (category in ('thanksgiving', 'petition', 'intercession', 'confession', 'praise', 'other')),
  status        text not null default 'open' check (status in ('open', 'answered')),
  answered_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists prayer_entries_user_idx on public.prayer_entries (user_id, created_at desc);

drop trigger if exists prayer_entries_touch on public.prayer_entries;
create trigger prayer_entries_touch before update on public.prayer_entries
  for each row execute function public.touch_updated_at();

alter table public.prayer_entries enable row level security;
drop policy if exists "Owner can read" on public.prayer_entries;
create policy "Owner can read" on public.prayer_entries for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Owner can insert" on public.prayer_entries;
create policy "Owner can insert" on public.prayer_entries for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Owner can update" on public.prayer_entries;
create policy "Owner can update" on public.prayer_entries for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Owner can delete" on public.prayer_entries;
create policy "Owner can delete" on public.prayer_entries for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.prayer_entries from anon;
grant select, insert, delete on public.prayer_entries to authenticated;
grant update (title, body, category, status, answered_at) on public.prayer_entries to authenticated;

-- ---------------------------------------------------------------------------
-- Devotionals — original writing; visible only when published and approved
-- ---------------------------------------------------------------------------
create table if not exists public.devotionals (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9-]+$'),
  publication_date  date not null,
  theme             text,
  status            text not null default 'draft'
                      check (status in ('draft', 'in_review', 'approved', 'published', 'withdrawn')),
  author_label      text not null default 'THE WORD editorial team',
  reviewer_label    text,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists devotionals_publication_idx on public.devotionals (publication_date desc);

create table if not exists public.devotional_localisations (
  id                    uuid primary key default gen_random_uuid(),
  devotional_id         uuid not null references public.devotionals (id) on delete cascade,
  language_code         text not null references public.languages (code),
  title                 text not null check (char_length(title) <= 160),
  scripture_refs        jsonb not null check (jsonb_typeof(scripture_refs) = 'array'),
  reflection            text not null,
  application_text      text not null,
  reflection_questions  jsonb not null default '[]'::jsonb check (jsonb_typeof(reflection_questions) = 'array'),
  prayer_text           text not null,
  review_status         text not null default 'draft' check (review_status in ('draft', 'approved')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (devotional_id, language_code)
);
create index if not exists devotional_localisations_lang_idx on public.devotional_localisations (language_code);

drop trigger if exists devotionals_touch on public.devotionals;
create trigger devotionals_touch before update on public.devotionals
  for each row execute function public.touch_updated_at();
drop trigger if exists devotional_localisations_touch on public.devotional_localisations;
create trigger devotional_localisations_touch before update on public.devotional_localisations
  for each row execute function public.touch_updated_at();

create or replace function public.audit_devotional_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
    values ((select auth.uid()), 'devotional_status', 'devotional', new.id::text,
            jsonb_build_object('slug', new.slug, 'from', case when tg_op = 'UPDATE' then old.status end,
                               'to', new.status, 'reviewer', new.reviewer_label));
  end if;
  return new;
end;
$$;
revoke execute on function public.audit_devotional_status() from public, anon, authenticated;
drop trigger if exists devotionals_audit on public.devotionals;
create trigger devotionals_audit after insert or update on public.devotionals
  for each row execute function public.audit_devotional_status();

alter table public.devotionals enable row level security;
alter table public.devotional_localisations enable row level security;
drop policy if exists "Published devotionals are public" on public.devotionals;
create policy "Published devotionals are public" on public.devotionals
  for select to anon, authenticated using (status = 'published' and publication_date <= current_date);
drop policy if exists "Approved localisations of published devotionals are public" on public.devotional_localisations;
create policy "Approved localisations of published devotionals are public" on public.devotional_localisations
  for select to anon, authenticated
  using (review_status = 'approved' and devotional_id in (
    select d.id from public.devotionals d where d.status = 'published' and d.publication_date <= current_date));
revoke insert, update, delete on public.devotionals, public.devotional_localisations from anon, authenticated;
grant select on public.devotionals, public.devotional_localisations to anon, authenticated;

create index if not exists admin_roles_granted_by_idx on public.admin_roles (granted_by);
