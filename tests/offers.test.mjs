// Server-side bidding rules (supabase/migrations/0002_offers.sql), run in PGlite like db.test.mjs.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";

const db = new PGlite({ extensions: { citext } });
const [OWNER, BOB, CARA] = ["a", "b", "c"].map((c) => `00000000-0000-0000-0000-00000000000${c}`);
let domainId, auctionId;

async function as(who, sql, params) {
  await db.exec("reset role");
  await db.exec(who === "anon" ? "set request.jwt.claim.sub = ''; set role anon" : `set request.jwt.claim.sub = '${who}'; set role authenticated`);
  try { return await db.query(sql, params); } finally { await db.exec("reset role"); }
}
const bid = (who, amount, max) => as(who, "select public.place_offer($1, $2, $3) r", [domainId, amount, max ?? null]).then((x) => x.rows[0].r);
const stats = (who) => as(who, "select bidders, offers, price, i_lead, my_max from public.offer_stats() where domain_id = $1", [domainId]).then((x) => x.rows[0]);
const notes = (who) => as(who, "select kind from public.notifications order by created_at, kind").then((x) => x.rows.map((r) => r.kind));

before(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;`);
  for (const f of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.query("insert into auth.users values ($1, '{\"user_name\":\"owner\"}'), ($2, '{\"user_name\":\"bob\"}'), ($3, '{\"user_name\":\"cara\"}')", [OWNER, BOB, CARA]);
  await as(OWNER, "insert into public.domains (owner_id, name, sale_type, min_offer_usd) values ($1, 'verdant.com', 'offer', 5000)", [OWNER]);
  await as(OWNER, "insert into public.domains (owner_id, name, sale_type, auction_ends_at, reserve_usd) values ($1, 'quick.ai', 'auction', now() + interval '2 minutes', 1000)", [OWNER]);
  domainId = (await db.query("select id from public.domains where name = 'verdant.com'")).rows[0].id;
  auctionId = (await db.query("select id from public.domains where name = 'quick.ai'")).rows[0].id;
});

test("signed-out visitors and owners can't bid; the minimum offer applies", async () => {
  await assert.rejects(as("anon", "select public.place_offer($1, 6000)", [domainId]), /sign_in_required|permission denied/);
  await assert.rejects(as(OWNER, "select public.place_offer($1, 6000)", [domainId]), /own_domain/);
  await assert.rejects(bid(BOB, 4000), /below_minimum:5000/);
});

test("proxy bidding: the leader pays one increment over the runner-up, maxes stay private", async () => {
  assert.deepEqual(await bid(BOB, 6000, 9000), { price: 6000, bidders: 1, i_lead: true });
  await assert.rejects(bid(CARA, 6000), /below_minimum:6500/);
  // Cara bids 7000 (max 7000) — Bob's proxy max of 9000 keeps him ahead at 7000 + 500.
  assert.deepEqual(await bid(CARA, 7000), { price: 7500, bidders: 2, i_lead: false });
  assert.deepEqual(await stats(BOB), { bidders: 2, offers: 2, price: 7500, i_lead: true, my_max: 9000 });
  assert.deepEqual(await stats(CARA), { bidders: 2, offers: 2, price: 7500, i_lead: false, my_max: 7000 });
  assert.deepEqual(await stats("anon"), { bidders: 2, offers: 2, price: 7500, i_lead: false, my_max: null });
  // Nobody reads other people's offers directly; the owner can.
  assert.equal((await as(CARA, "select count(*)::int c from public.offers")).rows[0].c, 1);
  assert.equal((await as(OWNER, "select count(*)::int c from public.offers")).rows[0].c, 2);
  await assert.rejects(as(BOB, "insert into public.offers (domain_id, bidder_id, amount_usd, max_usd) values ($1, $2, 99999, 99999)", [domainId, BOB]), /permission denied/);
});

test("outbidding notifies the previous leader; the owner hears about every offer", async () => {
  assert.deepEqual(await bid(CARA, 9500, 12000), { price: 9500, bidders: 2, i_lead: true });
  assert.deepEqual(await notes(BOB), ["outbid"]);
  assert.deepEqual(await notes(OWNER), ["offer_received", "offer_received", "offer_received"]);
});

test("only the owner can accept; accepting marks the domain sold and stops bidding", async () => {
  await assert.rejects(as(BOB, "select public.accept_offer($1)", [domainId]), /not_owner/);
  const r = (await as(OWNER, "select public.accept_offer($1) r", [domainId])).rows[0].r;
  assert.deepEqual(r, { price: 9500, buyer_id: CARA });
  assert.equal((await db.query("select status from public.domains where id = $1", [domainId])).rows[0].status, "sold");
  await assert.rejects(bid(BOB, 20000), /already_sold/);
});

test("a late auction bid extends the auction (soft close)", async () => {
  const before = (await db.query("select auction_ends_at from public.domains where id = $1", [auctionId])).rows[0].auction_ends_at;
  await as(BOB, "select public.place_offer($1, 1000)", [auctionId]);
  const after = (await db.query("select auction_ends_at from public.domains where id = $1", [auctionId])).rows[0].auction_ends_at;
  assert.ok(after > before, "auction end moved later");
});
