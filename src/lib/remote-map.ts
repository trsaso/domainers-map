import type { Auction, Domain, Person } from "./types";

/** Rows as stored in Supabase (supabase/migrations). */
export interface ProfileRow {
  id: string;
  handle: string;
  x_id: string | null;
  name: string;
  avatar_url: string | null;
  kind: "investor" | "broker";
  org: string;
  bio: string;
  focus: string[];
  tlds: string[];
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  portfolio_size: number;
  onboarded: boolean;
  created_at: string;
}

export type SaleType = "buy_now" | "offer" | "auction" | "unlisted";

export interface DomainRow {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  keywords: string[];
  sale_type: SaleType;
  price_usd: number | null;
  min_offer_usd: number | null;
  auction_ends_at: string | null;
  reserve_usd: number | null;
  soft_close_min: number;
  status: "active" | "sold";
  verified_at: string | null;
  created_at: string;
}

export interface OfferStat {
  domain_id: string;
  bidders: number;
  offers: number;
  price: number;
  i_lead: boolean;
  my_max: number | null;
}

export type DomainInput = Pick<DomainRow, "name" | "category" | "keywords" | "sale_type" | "price_usd" | "min_offer_usd" | "auction_ends_at" | "reserve_usd">;
export type ProfileInput = Partial<Pick<ProfileRow, "name" | "kind" | "org" | "bio" | "focus" | "tlds" | "city" | "country" | "lat" | "lng" | "portfolio_size" | "onboarded">>;

/* ---- mapping into the app's shapes ---- */

export function toPerson(p: ProfileRow): Person {
  return {
    id: p.id,
    type: p.kind,
    name: p.name,
    org: p.org,
    city: p.city ?? "",
    country: p.country ?? "",
    lat: p.lat ?? NaN,
    lng: p.lng ?? NaN,
    tlds: p.tlds,
    portfolio: p.portfolio_size,
    focus: p.focus,
    deals12m: 0,
    verified: true,
    sponsored: false,
    tier: "x",
    xHandle: p.handle,
    avatar: p.avatar_url ?? undefined,
    joined: new Date(p.created_at).getFullYear(),
    member: true,
  };
}

const sld = (name: string) => name.split(".")[0];

export function toDomain(d: DomainRow): Domain {
  return {
    id: d.id,
    name: d.name,
    ownerId: d.owner_id,
    askingUSD: d.price_usd ?? d.min_offer_usd ?? d.reserve_usd ?? 0,
    category: d.category,
    status: d.status === "sold" ? "sold" : d.sale_type === "offer" ? "make-offer" : "listed",
    keywords: d.keywords.length ? d.keywords : sld(d.name).split(/[-_]/),
    member: true,
    verified: !!d.verified_at,
    saleType: d.sale_type,
    minOfferUSD: d.min_offer_usd,
  };
}

export function toAuction(d: DomainRow): Auction | null {
  if (d.sale_type !== "auction" || !d.auction_ends_at) return null;
  return { endsAt: d.auction_ends_at, reserve: d.reserve_usd ?? 0, softCloseMin: d.soft_close_min };
}
