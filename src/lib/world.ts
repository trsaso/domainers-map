import seedJson from "@/data/seed.json";
import { COUNTRY, REGION, ensureCountry } from "./geo";
import { GROW, TOP_N, isDone } from "./grow";
import type {
  CompanyItem, DomainItem, EventItem, EventRecord, Item, Person, PersonItem, Plan, Seed,
} from "./types";
import { isPerson } from "./types";
import type { Auction, Domain } from "./types";
import { supabaseConfigured } from "./supabase/config";

/**
 * Data access for the prototype. Everything business-shaped comes from data/seed.json —
 * swap this module for API calls when a backend exists; components only see the World shape.
 */
const seed = seedJson as unknown as Seed;

/**
 * The signed-in member's profile id. In demo mode (no Supabase configured) it's the seed's sample profile;
 * with a backend it's "" until someone signs in with X. Exported as a live binding — read it, don't copy it.
 */
export let ME = supabaseConfigured ? "" : seed._me || "p1";

/** Real members and their listings, loaded from the database (see lib/remote.ts). */
let REMOTE: { people: Person[]; domains: Domain[]; auctions: Record<string, Auction> } = { people: [], domains: [], auctions: {} };
let rev = 0;

export function setMe(id: string) {
  if (ME === id) return;
  ME = id;
  rev++;
}
export function setRemote(r: typeof REMOTE) {
  REMOTE = r;
  rev++;
}
export const remoteAuctions = () => REMOTE.auctions;
export const snapshotRemote = () => REMOTE;

export const DB = {
  people: seed.people,
  companies: seed.companies,
  domains: seed.domains,
  events: seed.events.map(({ kind, ...e }): EventRecord => ({ ...e, format: kind })),
  offers: seed.offers ?? {},
  auctions: seed.auctions ?? {},
  deals: seed.deals ?? [],
};

const suffix = (name: string) => "." + name.split(".").slice(1).join(".");

function calcPoints(p: Person, actions: Record<string, boolean>, allDomains: Domain[]) {
  const listed = allDomains.filter((d) => d.ownerId === p.id).length;
  const offersMade = Object.values(DB.offers).flat().filter((o) => o.bidderId === p.id).length;
  const bonus = p.id === ME ? GROW.filter((a) => isDone(a, actions)).reduce((s, a) => s + (a.pts || 0), 0) : 0;
  return Math.round(
    (p.tier ? { x: 10, dns: 25, attested: 40 }[p.tier] : 0) +
      (p.org ? 5 : 0) +
      (p.focus.length ? 5 : 0) +
      listed * 4 +
      p.deals12m * 1.5 +
      offersMade * 2 +
      Math.min(p.portfolio / 200, 10) +
      bonus,
  );
}

export interface World {
  people: PersonItem[];
  companies: CompanyItem[];
  domains: DomainItem[];
  events: EventItem[];
  items: Item[];
  byId: Record<string, Item>;
  /** The signed-in member, or null when signed out (or not yet placed on the map). */
  me: PersonItem | null;
}

let memo: { key: string; world: World } | null = null;

/** Builds the derived view of the seed: points and ranks (which depend on the user's completed Grow actions) and sold state. */
export function getWorld(actions: Record<string, boolean>, sold: string[]): World {
  const key = JSON.stringify([actions, sold, rev, ME]);
  if (memo && memo.key === key) return memo.world;

  // Real members appear once they have a location; their listings ride on their pin.
  const remotePeople = REMOTE.people.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const placed = new Set(remotePeople.map((p) => p.id));
  // With real accounts, the seed's stand-in for "you" goes away, and a real listing hides a sample one of the same name.
  const placeholder = supabaseConfigured ? seed._me : "";
  const memberDomains = REMOTE.domains.filter((d) => placed.has(d.ownerId) && d.saleType !== "unlisted");
  const taken = new Set(memberDomains.map((d) => d.name));
  const allPeople: Person[] = [...DB.people.filter((p) => p.id !== placeholder).map((p) => ({ ...p, sample: supabaseConfigured })), ...remotePeople];
  const allDomains: Domain[] = [
    ...DB.domains.filter((d) => d.ownerId !== placeholder && !taken.has(d.name)).map((d) => ({ ...d, sample: supabaseConfigured })),
    ...memberDomains,
  ];
  allPeople.forEach((p) => ensureCountry(p.country, p.lng, p.lat));

  const people: PersonItem[] = allPeople.map((p) => ({
    ...p,
    kind: p.type,
    label: p.name,
    sub: p.org,
    loc: `${p.city}, ${COUNTRY[p.country]}`,
    region: REGION[p.country],
    points: calcPoints(p, actions, allDomains),
    rank: 0,
  }));
  [...people].sort((a, b) => b.points - a.points).forEach((p, i) => (p.rank = i + 1));
  const personById = Object.fromEntries(people.map((p) => [p.id, p]));

  const companies: CompanyItem[] = DB.companies.map((c) => ({
    ...c,
    kind: "company",
    label: c.name,
    sub: c.industry,
    loc: `${c.city}, ${COUNTRY[c.country]}`,
    region: REGION[c.country],
    tlds: [suffix(c.currentDomain)],
  }));

  const soldSet = new Set(sold);
  const domains: DomainItem[] = allDomains.map((d) => {
    const o = personById[d.ownerId];
    return {
      ...d,
      status: soldSet.has(d.id) ? "sold" : d.status,
      kind: "domain",
      label: d.name,
      tld: suffix(d.name),
      tlds: [suffix(d.name)],
      lat: o.lat,
      lng: o.lng,
      city: o.city,
      country: o.country,
      loc: `${o.city}, ${COUNTRY[o.country]}`,
      region: REGION[o.country],
      owner: o,
    };
  });

  const events: EventItem[] = DB.events.map((e) => ({
    ...e,
    kind: "event",
    label: e.name,
    sub: e.format,
    loc: `${e.city}, ${COUNTRY[e.country]}`,
    region: REGION[e.country],
    tlds: [],
  }));

  const items: Item[] = [...people, ...companies, ...domains, ...events];
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const world = { people, companies, domains, events, items, byId, me: personById[ME] ?? null };
  memo = { key, world };
  return world;
}

/* ---- visibility & pin sizing (points drive presence, never match scores) ---- */

export function planOf(i: Item, myPlan: Plan): Plan {
  if (i.id === ME) return myPlan;
  return i.sponsored ? "world" : "free";
}

/** z is the map zoom on the 256px-tile scale. */
export function visibleAt(i: Item, z: number, myPlan: Plan) {
  if (!isPerson(i)) return z > 3;
  const plan = planOf(i, myPlan);
  if (z <= 3) return i.rank <= TOP_N || plan === "world";
  if (z <= 5) return i.points >= 40 || plan !== "free";
  return true;
}

export function tierOf(i: PersonItem, myPlan: Plan) {
  const plan = i.id === ME ? myPlan : "free";
  return i.rank <= TOP_N || plan === "world" ? "world" : i.points >= 40 || plan === "country" ? "country" : "city";
}

export const pinSize = (i: PersonItem) => (i.points >= 80 ? "p3" : i.points >= 40 ? "p2" : "");
export const pinPx = (i: PersonItem) => (i.points >= 80 ? 48 : i.points >= 40 ? 40 : 34);

export function countryCounts(items: Item[]) {
  const c: Record<string, number> = {};
  items.filter(isPerson).forEach((i) => (c[i.country] = (c[i.country] || 0) + 1));
  return c;
}

export function countryCenter(items: Item[], code: string): [number, number] {
  const m = items.filter((i) => i.country === code && i.kind !== "domain");
  return [m.reduce((a, i) => a + i.lat, 0) / m.length, m.reduce((a, i) => a + i.lng, 0) / m.length];
}

export function statLine(w: World) {
  const pp = w.people;
  const cs = new Set(pp.map((p) => p.country)).size;
  const v = pp.filter((p) => p.tier).length;
  return `${w.domains.filter((d) => d.status !== "sold").length} domains by ${pp.length} domainers in ${cs} countries · ${v} verified`;
}
