import { money } from "./format";
import { domainsFor } from "./matching";
import { leading, offersOf, type OfferBook } from "./offers";
import type { Item } from "./types";
import type { World } from "./world";

/**
 * Watchlist snapshots. Each watched item stores the facts we alert on; after any market change
 * the store re-snapshots and turns differences into notifications.
 */
export interface WatchSnap {
  /** Domain: current high bid (or asking). Domainer: points. Company: best-fit score. */
  value: number | null;
  /** Domain: offer count. Domainer: live listings. Company: best-fit domain id. */
  count: number | string;
  status: string;
  rank?: number;
}

export function snapshot(i: Item, w: World, offers: OfferBook): WatchSnap {
  if (i.kind === "domain") {
    const l = leading(i.id, offers);
    return { value: l ? l.price : i.askingUSD || null, count: offersOf(i.id, offers).length, status: i.status };
  }
  if (i.kind === "investor" || i.kind === "broker") {
    const live = w.domains.filter((d) => d.ownerId === i.id && d.status !== "sold").length;
    return { value: i.points, count: live, status: i.tier ?? "none", rank: i.rank };
  }
  if (i.kind === "company") {
    const f = domainsFor(i, w.domains)[0];
    return { value: f ? f.score : null, count: f ? f.d.id : "", status: "" };
  }
  return { value: null, count: 0, status: "" };
}

/** Human-readable change between two snapshots, or null when nothing worth an alert changed. */
export function describeChange(i: Item, a: WatchSnap, b: WatchSnap, w: World, offers: OfferBook): string | null {
  if (i.kind === "domain") {
    if (a.status !== "sold" && b.status === "sold") return `${i.label} sold`;
    if (b.count > a.count) {
      const l = leading(i.id, offers);
      return `New offer on ${i.label}${l ? ` — high bid now ${money(l.price)}` : ""}`;
    }
    if (a.value !== b.value && b.value != null) return `${i.label} price moved ${a.value != null ? money(a.value) + " → " : ""}${money(b.value)}`;
    return null;
  }
  if (i.kind === "investor" || i.kind === "broker") {
    if (b.count > a.count) return `${i.label} listed a new domain`;
    if (b.count < a.count) return `${i.label} sold a domain`;
    if (a.rank && b.rank && a.rank !== b.rank) return `${i.label} moved #${a.rank} → #${b.rank}`;
    return null;
  }
  if (i.kind === "company" && a.count !== b.count && b.count) {
    const d = w.byId[String(b.count)];
    return `New best-fit name for ${i.label}: ${d?.label} (${b.value})`;
  }
  return null;
}
