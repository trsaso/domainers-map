// Runs the Supabase migrations in an in-process Postgres (PGlite) and checks the permission rules.
// `node --test tests/` — no Supabase project or network needed.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";

const db = new PGlite({ extensions: { citext } });
const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";

// Minimal stand-in for what Supabase provides: roles, auth.users and auth.uid().
const SUPABASE_STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
`;

/** Run `fn` as a given user ("anon" or a uuid), like a PostgREST request would. */
async function as(who, sql, params) {
  await db.exec("reset role");
  if (who === "anon") {
    await db.exec("set request.jwt.claim.sub = ''; set role anon");
  } else {
    await db.exec(`set request.jwt.claim.sub = '${who}'; set role authenticated`);
  }
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

before(async () => {
  await db.exec(SUPABASE_STUB);
  for (const f of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  // Two people sign in with X.
  await db.query(`insert into auth.users values ($1, $2), ($3, $4)`, [
    ALICE, JSON.stringify({ user_name: "GrabCom", full_name: "Grab Com", avatar_url: "https://pbs.twimg.com/profile_images/1/a_normal.jpg", provider_id: "111" }),
    BOB, JSON.stringify({ user_name: "bob_names", name: "Bob", provider_id: "222" }),
  ]);
});

test("sign-in creates a profile from the X account", async () => {
  const { rows } = await db.query("select handle, name, avatar_url, x_id from public.profiles where id = $1", [ALICE]);
  assert.deepEqual(rows[0], { handle: "grabcom", name: "Grab Com", avatar_url: "https://pbs.twimg.com/profile_images/1/a_400x400.jpg", x_id: "111" });
});

test("users edit their own profile but not their X identity, and not someone else's", async () => {
  await as(ALICE, "update public.profiles set city = 'Skopje', country = 'MK', lat = 41.99, lng = 21.43, onboarded = true where id = $1", [ALICE]);
  await as(ALICE, "update public.profiles set handle = 'hijack' where id = $1", [ALICE]).catch(() => {});
  const me = (await db.query("select handle, city, onboarded from public.profiles where id = $1", [ALICE])).rows[0];
  assert.equal(me.city, "Skopje");
  assert.equal(me.onboarded, true);
  assert.equal(me.handle, "grabcom");
  const r = await as(ALICE, "update public.profiles set city = 'Nowhere' where id = $1", [BOB]);
  assert.equal(r.affectedRows, 0);
});

test("owners add, edit and delete their own domains", async () => {
  await as(ALICE, `insert into public.domains (owner_id, name, category, sale_type, price_usd) values ($1, 'GrabIfy.com', 'Brandable', 'buy_now', 24000)`, [ALICE]);
  await as(ALICE, `insert into public.domains (owner_id, name, sale_type, min_offer_usd) values ($1, 'grabbed.io', 'offer', 1000)`, [ALICE]);
  const upd = await as(ALICE, "update public.domains set price_usd = 25000 where name = 'grabify.com'");
  assert.equal(upd.affectedRows, 1);
  const del = await as(ALICE, "delete from public.domains where name = 'grabbed.io'");
  assert.equal(del.affectedRows, 1);
  const { rows } = await db.query("select name, price_usd from public.domains");
  assert.deepEqual(rows, [{ name: "grabify.com", price_usd: 25000 }]);
});

test("nobody can add a domain for someone else or touch another owner's domain", async () => {
  await assert.rejects(as(BOB, `insert into public.domains (owner_id, name) values ($1, 'stolen.com')`, [ALICE]), /row-level security/);
  assert.equal((await as(BOB, "update public.domains set price_usd = 1 where name = 'grabify.com'")).affectedRows, 0);
  assert.equal((await as(BOB, "delete from public.domains where name = 'grabify.com'")).affectedRows, 0);
  await assert.rejects(as("anon", `insert into public.domains (owner_id, name) values ($1, 'anon.com')`, [ALICE]), /permission denied|row-level security/);
});

test("owners can't self-verify, mark sold or hand a domain to someone else", async () => {
  await as(ALICE, "update public.domains set verified_at = now(), status = 'sold', owner_id = $1 where name = 'grabify.com'", [BOB]);
  const { rows } = await db.query("select verified_at, status, owner_id from public.domains where name = 'grabify.com'");
  assert.deepEqual(rows[0], { verified_at: null, status: "active", owner_id: ALICE });
});

test("listed domains are visible to everyone; unlisted only to the owner", async () => {
  await as(ALICE, `insert into public.domains (owner_id, name, sale_type) values ($1, 'private.ai', 'unlisted')`, [ALICE]);
  const anon = (await as("anon", "select name from public.domains order by name")).rows.map((r) => r.name);
  const bob = (await as(BOB, "select name from public.domains order by name")).rows.map((r) => r.name);
  const alice = (await as(ALICE, "select name from public.domains order by name")).rows.map((r) => r.name);
  assert.deepEqual(anon, ["grabify.com"]);
  assert.deepEqual(bob, ["grabify.com"]);
  assert.deepEqual(alice, ["grabify.com", "private.ai"]);
  assert.equal((await as("anon", "select count(*)::int c from public.profiles")).rows[0].c, 2);
});

test("a domain name can only be listed once and must be a valid domain", async () => {
  await assert.rejects(as(BOB, `insert into public.domains (owner_id, name) values ($1, 'GRABIFY.com')`, [BOB]), /duplicate key/);
  await assert.rejects(as(BOB, `insert into public.domains (owner_id, name) values ($1, 'not a domain')`, [BOB]), /check constraint/);
  await assert.rejects(as(BOB, `insert into public.domains (owner_id, name, sale_type) values ($1, 'noprice.com', 'buy_now')`, [BOB]), /buy_now_has_price/);
});

test("an auction with bids can't be deleted until it ends; bidders are notified otherwise", async () => {
  await as(ALICE, `insert into public.domains (owner_id, name, sale_type, auction_ends_at, reserve_usd) values ($1, 'grabber.ai', 'auction', now() + interval '2 days', 10000)`, [ALICE]);
  const id = (await db.query("select id from public.domains where name = 'grabber.ai'")).rows[0].id;
  await db.query("insert into public.offers (domain_id, bidder_id, amount_usd, max_usd) values ($1, $2, 5000, 6000)", [id, BOB]);
  await assert.rejects(as(ALICE, "delete from public.domains where name = 'grabber.ai'"), /auction_has_bids/);

  await as(ALICE, "update public.domains set sale_type = 'offer', auction_ends_at = null where name = 'grabber.ai'");
  assert.equal((await as(ALICE, "delete from public.domains where name = 'grabber.ai'")).affectedRows, 1);
  const n = (await as(BOB, "select kind, domain from public.notifications")).rows;
  assert.deepEqual(n, [{ kind: "listing_removed", domain: "grabber.ai" }]);
  assert.equal((await as(ALICE, "select count(*)::int c from public.notifications")).rows[0].c, 0);
});
