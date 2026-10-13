export type PersonType = "investor" | "broker";
export type Tier = "x" | "dns" | "attested";
export type DomainStatus = "listed" | "make-offer" | "sold";
export type Region = "Americas" | "Europe" | "MEA" | "APAC";

export interface Person {
  id: string;
  type: PersonType;
  name: string;
  org: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  tlds: string[];
  portfolio: number;
  focus: string[];
  deals12m: number;
  verified: boolean;
  sponsored: boolean;
  tier?: Tier | null;
  xHandle?: string;
  avatar?: string;
  joined: number;
}

export interface Company {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  industry: string;
  stage: string;
  employees: number;
  currentDomain: string;
  wants: string[];
  fundingUSD: number;
  keywords: string[];
}

export interface Domain {
  id: string;
  name: string;
  ownerId: string;
  askingUSD: number;
  category: string;
  status: DomainStatus;
  keywords: string[];
}

/** Seed events carry their format in `kind`; the data layer renames it to `format`. */
export interface EventRecord {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  date: string;
  format: string;
}

export interface Offer {
  bidderId: string;
  amount: number;
  max: number;
  at: string;
}

export interface Auction {
  endsAt: string;
  reserve: number;
  softCloseMin: number;
}

export interface Deal {
  kind: "sale" | "offer";
  domain: string;
  price: number;
  sellerId?: string;
  buyer?: string;
  country?: string;
  at: string;
}

export interface Seed {
  _me: string;
  people: Person[];
  companies: Company[];
  domains: Domain[];
  events: (Omit<EventRecord, "format"> & { kind: string })[];
  offers: Record<string, Offer[]>;
  auctions: Record<string, Auction>;
  deals: Deal[];
}

interface ItemBase {
  id: string;
  label: string;
  loc: string;
  region: Region;
  city: string;
  country: string;
  lat: number;
  lng: number;
  tlds: string[];
  sponsored?: boolean;
}

export interface PersonItem extends Omit<Person, "sponsored">, ItemBase {
  sponsored: boolean;
  kind: PersonType;
  sub: string;
  points: number;
  rank: number;
}
export interface CompanyItem extends Company, ItemBase {
  kind: "company";
  sub: string;
}
export interface DomainItem extends Domain, ItemBase {
  kind: "domain";
  tld: string;
  owner: PersonItem;
}
export interface EventItem extends EventRecord, ItemBase {
  kind: "event";
  sub: string;
}

export type Item = PersonItem | CompanyItem | DomainItem | EventItem;
export type ItemKind = Item["kind"];

export const isPerson = (i: Item): i is PersonItem => i.kind === "investor" || i.kind === "broker";

export type Stage = "New" | "Contacted" | "Negotiating" | "Won" | "Lost";
export interface Lead {
  id: string;
  targetId: string;
  domainId: string | null;
  stage: Stage;
  note: string;
  added: string;
}

export interface Notif {
  msg: string;
  id: string;
  at: string;
  read: boolean;
  /** "outbid" (default, older entries have no kind) or a watchlist alert. */
  kind?: "outbid" | "watch";
}

export interface Camera {
  lat: number;
  lng: number;
  zoom: number;
}

export type Layout = "sidebar" | "floating" | "split";
export type DrawerStyle = "side" | "card" | "sheet";
export type Plan = "free" | "country" | "world";
