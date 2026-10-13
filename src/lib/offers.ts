import { money } from "./format";
import type { DomainItem, Offer } from "./types";
import { DB, ME, remoteAuctions } from "./world";

/**
 * Offers + proxy bids. Each bidder's highest max counts; the leader pays one increment
 * above the runner-up's max (capped at their own max), or their opening amount if unopposed.
 */
export type OfferBook = Record<string, Offer[]>;

/**
 * Member listings keep their offers on the server; the browser only gets public totals (plus "do I lead"
 * and my own max). Those totals are fed in here so price labels, counts and statuses work unchanged.
 */
export interface ServerStat {
  bidders: number;
  offers: number;
  price: number;
  i_lead: boolean;
  my_max: number | null;
}
let SERVER: Record<string, ServerStat> = {};
export const setServerStats = (s: Record<string, ServerStat>) => (SERVER = s);
export const serverStat = (id: string): ServerStat | undefined => SERVER[id];

export function offersOf(id: string, local: OfferBook): Offer[] {
  const s = SERVER[id];
  if (s) return Array.from({ length: s.offers }, () => ({ bidderId: "", amount: s.price, max: s.price, at: "" }));
  return [...(DB.offers[id] || []), ...(local[id] || [])].sort(
    (a, b) => a.at.localeCompare(b.at) || a.amount - b.amount,
  );
}

export const auctionOf = (id: string): import("./types").Auction | null => DB.auctions[id] || remoteAuctions()[id] || null;

export const increment = (v: number) => (v >= 500000 ? 10000 : v >= 100000 ? 5000 : v >= 20000 ? 1000 : 500);

export interface Leading extends Offer {
  price: number;
  count: number;
  bidders: Offer[];
}

export function leading(id: string, local: OfferBook): Leading | null {
  const s = SERVER[id];
  if (s) {
    // Bidder identities stay private; only "me vs. someone else" is known.
    const lead: Offer = { bidderId: s.i_lead ? ME : "other", amount: s.price, max: s.i_lead ? (s.my_max ?? s.price) : s.price, at: "" };
    const mine: Offer[] = !s.i_lead && s.my_max != null ? [{ bidderId: ME, amount: s.my_max, max: s.my_max, at: "" }] : [];
    return { ...lead, price: s.price, count: s.bidders, bidders: [lead, ...mine] };
  }
  const o = offersOf(id, local);
  if (!o.length) return null;
  const byB: Record<string, Offer> = {};
  o.forEach((x) => {
    const c = byB[x.bidderId];
    if (!c || x.max > c.max) byB[x.bidderId] = { ...x };
  });
  const arr = Object.values(byB).sort((a, b) => b.max - a.max || a.at.localeCompare(b.at));
  const [top, second] = arr;
  const price = second ? Math.min(top.max, Math.max(second.max + increment(top.max), top.amount)) : top.amount;
  return { ...top, price, count: arr.length, bidders: arr };
}

export function priceLabel(d: DomainItem, local: OfferBook) {
  const l = leading(d.id, local);
  if (d.status === "sold") return "Sold";
  if (l) return money(l.price) + " bid";
  return d.status === "make-offer" ? "Make offer" : money(d.askingUSD);
}

export function endsIn(id: string, now = Date.now()) {
  const a = auctionOf(id);
  if (!a) return "";
  const ms = new Date(a.endsAt).getTime() - now;
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 36e5);
  return h >= 48 ? `Ends in ${Math.floor(h / 24)}d` : h >= 1 ? `Ends in ${h}h` : `Ends in ${Math.max(1, Math.floor(ms / 6e4))}m`;
}

export function myStatus(id: string, local: OfferBook): "leading" | "outbid" | null {
  const l = leading(id, local);
  if (!l) return null;
  if (!l.bidders.some((b) => b.bidderId === ME)) return null;
  return l.bidderId === ME ? "leading" : "outbid";
}

export const minOffer = (d: DomainItem, local: OfferBook) => {
  const l = leading(d.id, local);
  if (l) return l.price + increment(l.price);
  return Math.round((d.askingUSD * (d.status === "make-offer" ? 0.5 : 0.6)) / 500) * 500;
};
