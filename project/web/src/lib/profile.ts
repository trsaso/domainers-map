import type { PersonItem } from "./types";
import { getWorld } from "./world";

/** Public URL slug for a member: their X handle when linked, otherwise their id. */
export const handleOf = (p: Pick<PersonItem, "id" | "xHandle">) => (p.xHandle || p.id).toLowerCase();

export const profilePath = (p: Pick<PersonItem, "id" | "xHandle">) => `/u/${handleOf(p)}`;

/** Public pages render the seed as-is (no viewer-local Grow actions or offers). */
export function findProfile(handle: string) {
  const w = getWorld({}, []);
  const p = w.people.find((x) => handleOf(x) === handle.toLowerCase());
  return p ? { p, w } : null;
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** X compose intent — opens the user's own composer; nothing is posted on their behalf. */
export const xIntent = (text: string, url: string) =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
