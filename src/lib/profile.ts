import type { PersonItem } from "./types";
import { getWorld, setRemote, snapshotRemote } from "./world";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./supabase/config";
import { toDomain, toPerson, type DomainRow, type ProfileRow } from "./remote-map";

/** Public URL slug for a member: their X handle when linked, otherwise their id. */
export const handleOf = (p: Pick<PersonItem, "id" | "xHandle">) => (p.xHandle || p.id).toLowerCase();

export const profilePath = (p: Pick<PersonItem, "id" | "xHandle">) => `/u/${handleOf(p)}`;

/**
 * Public pages: sample members come from the seed; real members are read from Supabase (anon key, public rows
 * only), cached for a minute. Ranks are computed across everyone, as on the map.
 */
export async function findProfile(handle: string) {
  const h = handle.toLowerCase();
  const seedWorld = getWorld({}, []);
  const fromSeed = seedWorld.people.find((x) => !x.member && handleOf(x) === h);
  if (fromSeed || !supabaseConfigured) return fromSeed ? { p: fromSeed, w: seedWorld } : null;

  const rest = async <T,>(path: string): Promise<T[]> => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      next: { revalidate: 60 },
    }).catch(() => null);
    return r?.ok ? r.json() : [];
  };
  const [profiles, domains] = await Promise.all([
    rest<ProfileRow>("profiles?select=*&onboarded=is.true"),
    rest<DomainRow>("domains?select=*&sale_type=neq.unlisted"),
  ]);
  // Swap the member data in just for this synchronous build so concurrent requests can't interleave.
  const prev = snapshotRemote();
  setRemote({ people: profiles.map(toPerson), domains: domains.map(toDomain), auctions: {} });
  const w = getWorld({}, []);
  setRemote(prev);
  const p = w.people.find((x) => x.member && handleOf(x) === h);
  return p ? { p, w } : null;
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** X compose intent — opens the user's own composer; nothing is posted on their behalf. */
export const xIntent = (text: string, url: string) =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
