-- Phase 4 — Ask the Word (AI study assistant).
-- Conversations and messages are private to their owner. Rows are written only by
-- the "ask-the-word" Edge Function (service role) after it has validated the AI's
-- Scripture references; clients can read and delete their own conversations.

create table if not exists public.ai_conversations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 120),
  language_code  text not null references public.languages (code),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);

create table if not exists public.ai_messages (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    uuid not null references public.ai_conversations (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  role               text not null check (role in ('user', 'assistant')),
  content            text not null check (char_length(content) between 1 and 12000),
  -- Validated references only: [{book, chapter, verse_start, verse_end}]. Never Bible text.
  refs               jsonb not null default '[]'::jsonb,
  removed_ref_count  smallint not null default 0 check (removed_ref_count >= 0),
  flags              jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);
create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);
create index if not exists ai_messages_user_idx on public.ai_messages (user_id);

-- Usage metering (no content): one row per question asked.
create table if not exists public.usage_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  event_type  text not null check (event_type in ('ask_question')),
  created_at  timestamptz not null default now()
);
create index if not exists usage_events_user_idx on public.usage_events (user_id, event_type, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "Owners read their conversations" on public.ai_conversations;
create policy "Owners read their conversations" on public.ai_conversations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Owners delete their conversations" on public.ai_conversations;
create policy "Owners delete their conversations" on public.ai_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Owners read their messages" on public.ai_messages;
create policy "Owners read their messages" on public.ai_messages
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Owners read their usage" on public.usage_events;
create policy "Owners read their usage" on public.usage_events
  for select to authenticated using ((select auth.uid()) = user_id);

-- No client insert/update anywhere: users cannot forge answers or reset their usage.
revoke all on public.ai_conversations, public.ai_messages, public.usage_events from anon, authenticated;
grant select, delete on public.ai_conversations to authenticated;
grant select on public.ai_messages, public.usage_events to authenticated;

drop trigger if exists ai_conversations_touch on public.ai_conversations;
create trigger ai_conversations_touch before update on public.ai_conversations
  for each row execute function public.touch_updated_at();

-- Atomically checks the rolling 24-hour limit and records one question.
-- Returns the new event id and questions remaining; event_id is null when over the limit.
create or replace function public.reserve_ask_question(p_user uuid, p_limit integer)
returns table (event_id uuid, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
  new_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text, 0));
  select count(*) into used from public.usage_events u
    where u.user_id = p_user and u.event_type = 'ask_question'
      and u.created_at > pg_catalog.now() - interval '24 hours';
  if used >= p_limit then
    return query select null::uuid, 0;
    return;
  end if;
  insert into public.usage_events (user_id, event_type) values (p_user, 'ask_question') returning id into new_id;
  return query select new_id, p_limit - used - 1;
end;
$$;
revoke execute on function public.reserve_ask_question(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_ask_question(uuid, integer) to service_role;
