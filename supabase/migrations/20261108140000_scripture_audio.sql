-- Phase 3 addition — audio for the daily verse and devotional Scripture/prayers.
-- Audio files live in the public Storage bucket "scripture-audio"; this table is
-- the catalogue the app reads. Each row records a SHA-256 of the exact text that
-- was spoken, so a later change to the text can be detected and re-recorded.

create table if not exists public.audio_tracks (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('daily_verse', 'devotional_scripture', 'devotional_prayer')),
  content_key    text not null check (char_length(content_key) between 1 and 120),
  language_code  text not null references public.languages (code),
  version_code   text references public.bible_versions (code),
  storage_path   text not null unique check (storage_path ~ '^[a-z0-9_/.-]+\.mp3$'),
  duration_secs  numeric(7, 2) not null check (duration_secs > 0),
  text_sha256    text not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  voice_label    text not null,
  published      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Scripture audio must name its Bible version; prayers are original text and have none.
  check ((kind = 'devotional_prayer') = (version_code is null))
);
create unique index if not exists audio_tracks_content_idx
  on public.audio_tracks (kind, content_key, language_code, coalesce(version_code, ''));

alter table public.audio_tracks enable row level security;

drop policy if exists "Published audio is public" on public.audio_tracks;
create policy "Published audio is public" on public.audio_tracks
  for select to anon, authenticated using (published);

drop policy if exists "Importers read all audio" on public.audio_tracks;
create policy "Importers read all audio" on public.audio_tracks
  for select to authenticated using ((select public.has_role('content_importer')));

drop policy if exists "Importers add audio" on public.audio_tracks;
create policy "Importers add audio" on public.audio_tracks
  for insert to authenticated with check ((select public.has_role('content_importer')));

drop policy if exists "Importers update audio" on public.audio_tracks;
create policy "Importers update audio" on public.audio_tracks
  for update to authenticated
  using ((select public.has_role('content_importer')))
  with check ((select public.has_role('content_importer')));

revoke all on public.audio_tracks from anon, authenticated;
grant select on public.audio_tracks to anon, authenticated;
grant insert, update on public.audio_tracks to authenticated;

-- Storage bucket: public reads by URL, MP3 only, 5 MB cap per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scripture-audio', 'scripture-audio', true, 5242880, array['audio/mpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Only content importers may write; nobody may delete through the API.
drop policy if exists "Importers read scripture audio objects" on storage.objects;
create policy "Importers read scripture audio objects" on storage.objects
  for select to authenticated
  using (bucket_id = 'scripture-audio' and (select public.has_role('content_importer')));

drop policy if exists "Importers upload scripture audio" on storage.objects;
create policy "Importers upload scripture audio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scripture-audio' and (select public.has_role('content_importer')));

drop policy if exists "Importers replace scripture audio" on storage.objects;
create policy "Importers replace scripture audio" on storage.objects
  for update to authenticated
  using (bucket_id = 'scripture-audio' and (select public.has_role('content_importer')))
  with check (bucket_id = 'scripture-audio' and (select public.has_role('content_importer')));
