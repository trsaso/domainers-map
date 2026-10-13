-- Domainers Map: shared offers and proxy bids. Run after 0001. Safe to re-run.
--
-- All bidding goes through place_offer(), which runs on the server, so a browser can't fake a bid,
-- skip the minimum or see other bidders' maximums. Public totals come from offer_stats().
--
-- Proxy bidding: each bidder's highest max counts; the leader pays one increment above the
-- runner-up's max (capped at their own max), or their opening amount when unopposed.

create or replace function public.bid_increment(v integer) returns integer
language sql immutable as $$
  select case when v >= 500000 then 10000 when v >= 100000 then 5000 when v >= 20000 then 1000 else 500 end
$$;

-- Current state of every domain's offer book (internal; exposed through offer_stats / place_offer).
create or replace function public.offer_book() returns table (
  domain_id uuid, bidders integer, offers integer, price integer, leader_id uuid
)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (domain_id, bidder_id) domain_id, bidder_id, amount_usd, max_usd, created_at
    from offers
    order by domain_id, bidder_id, max_usd desc, created_at asc
  ), ranked as (
    select *, row_number() over (partition by domain_id order by max_usd desc, created_at asc) as rn,
           count(*) over (partition by domain_id) as n
    from best
  ), totals as (
    select domain_id, count(*)::int as offers from offers group by domain_id
  )
  select t.domain_id, t.n::int, tot.offers,
         case when s.max_usd is null then t.amount_usd
              else least(t.max_usd, greatest(s.max_usd + bid_increment(t.max_usd), t.amount_usd)) end,
         t.bidder_id
  from ranked t
  join totals tot using (domain_id)
  left join ranked s on s.domain_id = t.domain_id and s.rn = 2
  where t.rn = 1
$$;

-- What anyone may see: price and counts. Signed-in users also learn whether they lead and their own max.
create or replace function public.offer_stats() returns table (
  domain_id uuid, bidders integer, offers integer, price integer, i_lead boolean, my_max integer
)
language sql stable security definer set search_path = public as $$
  select b.domain_id, b.bidders, b.offers, b.price,
         coalesce(b.leader_id = auth.uid(), false),
         (select max(o.max_usd) from offers o where o.domain_id = b.domain_id and o.bidder_id = auth.uid())
  from offer_book() b
  join domains d on d.id = b.domain_id
  where d.sale_type <> 'unlisted' or d.owner_id = auth.uid()
$$;

create or replace function public.place_offer(p_domain uuid, p_amount integer, p_max integer default null)
returns json
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d domains%rowtype;
  before_book record;
  after_book record;
  floor_usd integer;
  v_max integer := greatest(coalesce(p_max, 0), p_amount);
begin
  if me is null then raise exception 'sign_in_required' using errcode = 'P0001'; end if;
  select * into d from domains where id = p_domain for update;
  if not found or d.sale_type = 'unlisted' then raise exception 'not_listed' using errcode = 'P0001'; end if;
  if d.status = 'sold' then raise exception 'already_sold' using errcode = 'P0001'; end if;
  if d.owner_id = me then raise exception 'own_domain' using errcode = 'P0001'; end if;
  if d.sale_type = 'auction' and d.auction_ends_at <= now() then raise exception 'auction_ended' using errcode = 'P0001'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then raise exception 'bad_amount' using errcode = 'P0001'; end if;

  select * into before_book from offer_book() where domain_id = p_domain;
  if before_book.leader_id is not null and before_book.leader_id <> me then
    floor_usd := before_book.price + bid_increment(before_book.price);
  elsif before_book.leader_id is null then
    floor_usd := coalesce(d.min_offer_usd, 1);
  else
    floor_usd := 1; -- the leader may raise their max at any amount
  end if;
  if p_amount < floor_usd then
    raise exception 'below_minimum:%', floor_usd using errcode = 'P0001';
  end if;

  insert into offers (domain_id, bidder_id, amount_usd, max_usd) values (p_domain, me, p_amount, v_max);
  select * into after_book from offer_book() where domain_id = p_domain;

  -- Soft close: a bid in the final minutes extends the auction.
  if d.sale_type = 'auction' and d.auction_ends_at - now() < make_interval(mins => d.soft_close_min) then
    perform set_config('app.trusted', 'on', true);
    update domains set auction_ends_at = now() + make_interval(mins => d.soft_close_min) where id = p_domain;
    perform set_config('app.trusted', 'off', true);
  end if;

  if before_book.leader_id is not null and before_book.leader_id <> after_book.leader_id then
    insert into notifications (user_id, kind, message, domain)
    values (before_book.leader_id, 'outbid',
            'Outbid on ' || d.name || ' — ' || '$' || before_book.price || ' → $' || after_book.price, d.name);
  end if;
  insert into notifications (user_id, kind, message, domain)
  values (d.owner_id, 'offer_received', 'New offer on ' || d.name || ' — high bid now $' || after_book.price, d.name);

  return json_build_object(
    'price', after_book.price, 'bidders', after_book.bidders, 'i_lead', after_book.leader_id = me
  );
end $$;

-- The owner accepts the current high offer: the domain is marked sold and the winner is notified.
create or replace function public.accept_offer(p_domain uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  d domains%rowtype;
  b record;
begin
  select * into d from domains where id = p_domain for update;
  if not found or d.owner_id is distinct from auth.uid() then raise exception 'not_owner' using errcode = 'P0001'; end if;
  if d.status = 'sold' then raise exception 'already_sold' using errcode = 'P0001'; end if;
  select * into b from offer_book() where domain_id = p_domain;
  if b.leader_id is null then raise exception 'no_offers' using errcode = 'P0001'; end if;
  perform set_config('app.trusted', 'on', true);
  update domains set status = 'sold' where id = p_domain;
  perform set_config('app.trusted', 'off', true);
  insert into notifications (user_id, kind, message, domain)
  values (b.leader_id, 'offer_received', 'Your offer of $' || b.price || ' on ' || d.name || ' was accepted', d.name);
  return json_build_object('price', b.price, 'buyer_id', b.leader_id);
end $$;

revoke all on function public.offer_book() from public, anon, authenticated;
grant execute on function public.offer_stats() to anon, authenticated;
grant execute on function public.place_offer(uuid, integer, integer) to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;
-- Offers are only written by place_offer (security definer); no direct insert grant.
