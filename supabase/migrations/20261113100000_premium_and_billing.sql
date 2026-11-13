-- Phase 6 — subscriptions, premium access, admin overview.
-- Additive, except three read policies that are replaced by wider/narrower versions (noted below).
-- Nothing is locked until app_settings.paywall_live is switched to true by the owner.

-- ---------------------------------------------------------------------------
-- Settings (public, read-only): the paywall switch
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key         text primary key check (key ~ '^[a-z_]+$'),
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "Settings are public" on public.app_settings;
create policy "Settings are public" on public.app_settings for select to anon, authenticated using (true);
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
insert into public.app_settings (key, value) values ('paywall_live', 'false'::jsonb) on conflict (key) do nothing;

create or replace function public.paywall_live()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select value = 'true'::jsonb from public.app_settings where key = 'paywall_live'), false);
$$;
revoke execute on function public.paywall_live() from public;
grant execute on function public.paywall_live() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Purchases and the access they give
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  plan                 text not null check (plan in ('monthly', 'yearly')),
  status               text not null default 'pending' check (status in ('pending', 'active', 'refunded', 'failed')),
  amount_paise         integer not null check (amount_paise > 0),
  currency             text not null default 'INR' check (currency = 'INR'),
  provider             text not null default 'razorpay' check (provider = 'razorpay'),
  provider_order_id    text not null unique,
  provider_payment_id  text unique,
  starts_at            timestamptz,
  ends_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check ((status = 'active') = (starts_at is not null and ends_at is not null and provider_payment_id is not null)
         or status in ('refunded'))
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, created_at desc);
drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

create table if not exists public.entitlements (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  premium_until  timestamptz not null,
  updated_at     timestamptz not null default now()
);

-- Webhook deliveries already handled (Razorpay may send the same event more than once).
create table if not exists public.payment_events (
  provider_event_id  text primary key,
  event_type         text not null,
  provider_order_id  text,
  created_at         timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "Owner can read" on public.subscriptions;
create policy "Owner can read" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Owner can read" on public.entitlements;
create policy "Owner can read" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);
-- No client writes anywhere: rows are created only by the server-side payment functions.
revoke all on public.subscriptions, public.entitlements, public.payment_events from anon, authenticated;
grant select on public.subscriptions, public.entitlements to authenticated;

create or replace function public.is_premium()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.entitlements e
                 where e.user_id = (select auth.uid()) and e.premium_until > now());
$$;
revoke execute on function public.is_premium() from public;
grant execute on function public.is_premium() to anon, authenticated;

-- Called by the payment functions after Razorpay's signature has been verified. Safe to call twice.
create or replace function public.activate_subscription(p_order_id text, p_payment_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.subscriptions;
  base timestamptz;
  ends timestamptz;
begin
  select * into s from public.subscriptions where provider_order_id = p_order_id for update;
  if not found then raise exception 'unknown order'; end if;
  if s.status = 'active' then
    return jsonb_build_object('premium_until', s.ends_at, 'already_active', true);
  end if;
  if s.status <> 'pending' then raise exception 'order is not payable'; end if;
  perform pg_advisory_xact_lock(hashtext(s.user_id::text));
  -- A purchase made while premium is still running is added to the end of it.
  select greatest(now(), coalesce((select e.premium_until from public.entitlements e where e.user_id = s.user_id), now()))
    into base;
  ends := base + case s.plan when 'yearly' then interval '1 year' else interval '1 month' end;
  update public.subscriptions
     set status = 'active', provider_payment_id = p_payment_id, starts_at = base, ends_at = ends
   where id = s.id;
  insert into public.entitlements (user_id, premium_until) values (s.user_id, ends)
    on conflict (user_id) do update set premium_until = excluded.premium_until, updated_at = now();
  insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
  values (s.user_id, 'subscription_activated', 'subscription', s.id::text,
          jsonb_build_object('plan', s.plan, 'amount_paise', s.amount_paise, 'ends_at', ends));
  return jsonb_build_object('premium_until', ends, 'already_active', false);
end;
$$;

-- Called when Razorpay reports a refund: the purchase stops counting.
create or replace function public.refund_subscription(p_payment_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  s public.subscriptions;
  remaining timestamptz;
begin
  select * into s from public.subscriptions where provider_payment_id = p_payment_id for update;
  if not found or s.status <> 'active' then return false; end if;
  perform pg_advisory_xact_lock(hashtext(s.user_id::text));
  update public.subscriptions set status = 'refunded' where id = s.id;
  select max(x.ends_at) into remaining from public.subscriptions x
   where x.user_id = s.user_id and x.status = 'active';
  if remaining is null then
    delete from public.entitlements where user_id = s.user_id;
  else
    update public.entitlements set premium_until = remaining, updated_at = now() where user_id = s.user_id;
  end if;
  insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
  values (null, 'subscription_refunded', 'subscription', s.id::text, jsonb_build_object('plan', s.plan));
  return true;
end;
$$;
revoke execute on function public.activate_subscription(text, text) from public, anon, authenticated;
revoke execute on function public.refund_subscription(text) from public, anon, authenticated;
grant execute on function public.activate_subscription(text, text) to service_role;
grant execute on function public.refund_subscription(text) to service_role;

-- ---------------------------------------------------------------------------
-- Premium Discover content (REPLACES the Phase 5 read policy: premium text is now
-- readable by subscribers, and by everyone while the paywall is off)
-- ---------------------------------------------------------------------------
drop policy if exists "Approved text of published free content is public" on public.content_localisations;
drop policy if exists "Approved text of published content" on public.content_localisations;
create policy "Approved text of published content" on public.content_localisations
  for select to anon, authenticated
  using (review_status = 'approved' and content_id in (
    select c.id from public.content_items c
     where c.status = 'published'
       and (not c.is_premium or not (select public.paywall_live()) or (select public.is_premium()))));

-- ---------------------------------------------------------------------------
-- Premium reading plans (REPLACES the plan-days read policy)
-- ---------------------------------------------------------------------------
alter table public.reading_plans add column if not exists is_premium boolean not null default false;
drop policy if exists "Published plan days are public" on public.reading_plan_days;
create policy "Published plan days are public" on public.reading_plan_days
  for select to anon, authenticated
  using (plan_id in (select p.id from public.reading_plans p
                      where p.status = 'published'
                        and (not p.is_premium or not (select public.paywall_live()) or (select public.is_premium()))));

-- ---------------------------------------------------------------------------
-- Audio: devotional audio older than the current week is premium; plan chapters are premium
-- (REPLACES the audio catalogue read policy)
-- ---------------------------------------------------------------------------
alter table public.audio_tracks drop constraint if exists audio_tracks_kind_check;
alter table public.audio_tracks add constraint audio_tracks_kind_check
  check (kind in ('daily_verse', 'devotional_scripture', 'devotional_prayer', 'plan_chapter'));
alter table public.audio_tracks add column if not exists bucket text not null default 'scripture-audio'
  check (bucket in ('scripture-audio', 'premium-audio'));
-- Plan chapters always live in the private bucket.
alter table public.audio_tracks drop constraint if exists audio_tracks_plan_bucket_check;
alter table public.audio_tracks add constraint audio_tracks_plan_bucket_check
  check ((kind = 'plan_chapter') = (bucket = 'premium-audio'));

drop policy if exists "Published audio is public" on public.audio_tracks;
create policy "Published audio is public" on public.audio_tracks
  for select to anon, authenticated
  using (published and (
    kind in ('daily_verse', 'plan_chapter')          -- plan rows only say that audio exists; the file is private
    or not (select public.paywall_live())
    or (select public.is_premium())
    or exists (select 1 from public.devotionals d
                where d.slug = split_part(audio_tracks.content_key, ':', 1)
                  and d.publication_date >= current_date - 6)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('premium-audio', 'premium-audio', false, 20971520, array['audio/mpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Subscribers read premium audio" on storage.objects;
create policy "Subscribers read premium audio" on storage.objects
  for select to authenticated
  using (bucket_id = 'premium-audio'
         and ((select public.is_premium()) or not (select public.paywall_live())
              or (select public.has_role('content_importer'))));
drop policy if exists "Importers upload premium audio" on storage.objects;
create policy "Importers upload premium audio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'premium-audio' and (select public.has_role('content_importer')));

-- ---------------------------------------------------------------------------
-- Admin overview: numbers only, for users holding the 'admin' role
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.admin_roles r where r.user_id = (select auth.uid()) and r.role = 'admin') then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_last_7_days', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'premium_users', (select count(*) from public.entitlements where premium_until > now()),
    'paywall_live', public.paywall_live(),
    'subscriptions', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                        from (select status, count(*) n from public.subscriptions group by status) t),
    'revenue_paise', (select coalesce(sum(amount_paise), 0) from public.subscriptions where status = 'active'),
    'content', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                  from (select kind || ':' || status k, count(*) n from public.content_items group by 1) t),
    'devotionals', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                      from (select status, count(*) n from public.devotionals group by status) t),
    'ask_questions_last_7_days', (select count(*) from public.usage_events where created_at > now() - interval '7 days'),
    'audio_tracks', (select count(*) from public.audio_tracks where published),
    'recent_audit', (select coalesce(jsonb_agg(a), '[]'::jsonb)
                       from (select action, target_type, created_at from public.audit_events
                              order by created_at desc limit 20) a)
  );
end;
$$;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
