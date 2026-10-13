-- Domainers Map: profiles (from Sign in with X), domain listings, offers, notifications.
-- Paste into Supabase → SQL Editor and run once. Safe to re-run: every object is created idempotently.
--
-- Permission model (enforced here, not in the browser):
--   * anyone (signed in or not) can read profiles and listed domains;
--   * a signed-in user can create, edit and delete only their own domains and profile;
--   * an auction that already has bids can't be deleted until it ends;
--   * a user can't mark their own domain as verified or sold — the server does that.

create extension if not exists citext;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  handle         citext not null unique,
  x_id           text unique,
  name           text not null check (char_length(name) between 1 and 80),
  avatar_url     text,
  kind           text not null default 'investor' check (kind in ('investor', 'broker')),
  org            text not null default '' check (char_length(org) <= 80),
  bio            text not null default '' check (char_length(bio) <= 280),
  focus          text[] not null default '{}' check (cardinality(focus) <= 6),
  tlds           text[] not null default '{}' check (cardinality(tlds) <= 10),
  city           text check (char_length(city) <= 80),
  country        text check (country ~ '^[A-Z]{2}$'),
  lat            double precision check (lat between -90 and 90),
  lng            double precision check (lng between -180 and 180),
  portfolio_size integer not null default 0 check (portfolio_size between 0 and 1000000),
  onboarded      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Create the profile from the X account on first sign-in (Supabase's Twitter/X provider metadata).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base text := lower(regexp_replace(coalesce(m->>'user_name', m->>'preferred_username', 'member'), '[^A-Za-z0-9_]', '', 'g'));
  h text := nullif(base, '');
  n int := 1;
begin
  h := coalesce(h, 'member');
  while exists (select 1 from public.profiles where handle = h) loop
    n := n + 1;
    h := base || n;
  end loop;
  insert into public.profiles (id, handle, x_id, name, avatar_url)
  values (
    new.id,
    h,
    coalesce(m->>'provider_id', m->>'sub'),
    left(coalesce(nullif(m->>'full_name', ''), nullif(m->>'name', ''), h), 80),
    -- X serves a 48px "_normal" image by default; ask for the 400px one.
    replace(coalesce(m->>'avatar_url', m->>'picture'), '_normal.', '_400x400.')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The X-linked identity (handle, X id) is not user-editable.
create or replace function public.protect_profile_identity() returns trigger
language plpgsql as $$
begin
  if current_setting('app.trusted', true) is distinct from 'on' then
    new.handle := old.handle;
    new.x_id := old.x_id;
    new.id := old.id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- ---------------------------------------------------------------- domains
create table if not exists public.domains (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  name            citext not null unique
                  check (name ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$' and char_length(name) <= 253),
  category        text not null default 'Other' check (char_length(category) between 1 and 40),
  keywords        text[] not null default '{}' check (cardinality(keywords) <= 12),
  -- buy_now: fixed price (offers welcome) · offer: make-offer, optional minimum · auction · unlisted: hidden from others
  sale_type       text not null default 'offer' check (sale_type in ('buy_now', 'offer', 'auction', 'unlisted')),
  price_usd       integer check (price_usd > 0),
  min_offer_usd   integer check (min_offer_usd >= 0),
  auction_ends_at timestamptz,
  reserve_usd     integer check (reserve_usd >= 0),
  soft_close_min  integer not null default 5 check (soft_close_min between 0 and 60),
  status          text not null default 'active' check (status in ('active', 'sold')),
  verified_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint buy_now_has_price check (sale_type <> 'buy_now' or price_usd is not null),
  constraint auction_has_end check (sale_type <> 'auction' or auction_ends_at is not null)
);
create index if not exists domains_owner_idx on public.domains (owner_id);

-- Owners can't self-verify, mark sold, or move a listing to someone else.
create or replace function public.protect_domain_fields() returns trigger
language plpgsql as $$
begin
  if current_setting('app.trusted', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      new.verified_at := null;
      new.status := 'active';
      new.created_at := now();
    else
      new.verified_at := old.verified_at;
      new.status := old.status;
      new.owner_id := old.owner_id;
      new.created_at := old.created_at;
    end if;
  end if;
  new.name := lower(new.name);
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists domains_protect on public.domains;
create trigger domains_protect before insert or update on public.domains
  for each row execute function public.protect_domain_fields();

-- ---------------------------------------------------------------- offers (bidding logic arrives in the next migration)
create table if not exists public.offers (
  id         uuid primary key default gen_random_uuid(),
  domain_id  uuid not null references public.domains (id) on delete cascade,
  bidder_id  uuid not null references public.profiles (id) on delete cascade,
  amount_usd integer not null check (amount_usd > 0),
  max_usd    integer not null,
  created_at timestamptz not null default now(),
  constraint max_covers_amount check (max_usd >= amount_usd)
);
create index if not exists offers_domain_idx on public.offers (domain_id);

-- ---------------------------------------------------------------- notifications
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('outbid', 'watch', 'listing_removed', 'offer_received')),
  message    text not null,
  domain     text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- Delete rule: an auction with bids must run to its end. Otherwise bidders are told the listing is gone.
create or replace function public.before_domain_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.sale_type = 'auction' and old.auction_ends_at > now()
     and exists (select 1 from public.offers where domain_id = old.id) then
    raise exception 'auction_has_bids: % has bids and can be removed after the auction ends', old.name
      using errcode = 'P0001';
  end if;
  insert into public.notifications (user_id, kind, message, domain)
  select distinct o.bidder_id, 'listing_removed', old.name || ' was removed by its owner; your offer was cancelled.', old.name
  from public.offers o
  where o.domain_id = old.id and o.bidder_id <> old.owner_id;
  return old;
end $$;

drop trigger if exists domains_before_delete on public.domains;
create trigger domains_before_delete before delete on public.domains
  for each row execute function public.before_domain_delete();

-- ---------------------------------------------------------------- row-level security
alter table public.profiles enable row level security;
alter table public.domains enable row level security;
alter table public.offers enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to anon, authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists domains_read on public.domains;
create policy domains_read on public.domains for select to anon, authenticated
  using (sale_type <> 'unlisted' or owner_id = auth.uid());
drop policy if exists domains_insert_own on public.domains;
create policy domains_insert_own on public.domains for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists domains_update_own on public.domains;
create policy domains_update_own on public.domains for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists domains_delete_own on public.domains;
create policy domains_delete_own on public.domains for delete to authenticated
  using (owner_id = auth.uid());

-- Bidders see their own offers; owners see offers on their domains. Public totals come from domain_offer_stats.
drop policy if exists offers_read on public.offers;
create policy offers_read on public.offers for select to authenticated
  using (bidder_id = auth.uid() or exists (select 1 from public.domains d where d.id = domain_id and d.owner_id = auth.uid()));

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.domains to anon, authenticated;
grant update (name, avatar_url, kind, org, bio, focus, tlds, city, country, lat, lng, portfolio_size, onboarded)
  on public.profiles to authenticated;
grant insert, update, delete on public.domains to authenticated;
grant select on public.offers to authenticated;
grant select, update (read) on public.notifications to authenticated;
