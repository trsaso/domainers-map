"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase/client";
import type { DomainInput, DomainRow, OfferStat, ProfileInput, ProfileRow } from "./remote-map";
export * from "./remote-map";

/* ---- reads ---- */

export interface RemoteData {
  profiles: ProfileRow[];
  domains: DomainRow[];
  stats: Record<string, OfferStat>;
}

export async function loadRemote(sb: SupabaseClient = getSupabase()!): Promise<RemoteData> {
  const [p, d, s] = await Promise.all([
    sb.from("profiles").select("*"),
    sb.from("domains").select("*").order("created_at", { ascending: false }),
    sb.rpc("offer_stats"),
  ]);
  if (p.error) throw p.error;
  if (d.error) throw d.error;
  const stats: Record<string, OfferStat> = {};
  (s.data as OfferStat[] | null)?.forEach((r) => (stats[r.domain_id] = r));
  return { profiles: p.data as ProfileRow[], domains: d.data as DomainRow[], stats };
}

export interface OwnerOffer {
  id: string;
  amount_usd: number;
  max_usd: number;
  created_at: string;
  bidder: { id: string; name: string; handle: string; city: string | null } | null;
}

/** Offers on one of the signed-in owner's domains (row-level security limits this to owners and bidders). */
export async function loadOffersFor(domainId: string): Promise<OwnerOffer[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("offers")
    .select("id, amount_usd, max_usd, created_at, bidder:profiles!offers_bidder_id_fkey(id, name, handle, city)")
    .eq("domain_id", domainId)
    .order("max_usd", { ascending: false });
  if (error) throw error;
  return data as unknown as OwnerOffer[];
}

/* ---- writes (row-level security enforces ownership) ---- */

const need = () => {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign-in isn't set up on this site yet.");
  return sb;
};

export async function saveDomain(ownerId: string, input: DomainInput, id?: string) {
  const sb = need();
  const row = { ...input, name: input.name.trim().toLowerCase() };
  const q = id ? sb.from("domains").update(row).eq("id", id) : sb.from("domains").insert({ ...row, owner_id: ownerId });
  const { error } = await q;
  if (error) throw friendly(error, row.name);
}

export async function deleteDomain(id: string, name: string) {
  const { error } = await need().from("domains").delete().eq("id", id);
  if (error) throw friendly(error, name);
}

export async function updateProfile(id: string, input: ProfileInput) {
  const { error } = await need().from("profiles").update(input).eq("id", id);
  if (error) throw friendly(error, "");
}

export async function placeOffer(domainId: string, amount: number, max: number | null) {
  const { data, error } = await need().rpc("place_offer", { p_domain: domainId, p_amount: amount, p_max: max });
  if (error) throw friendly(error, "");
  return data as { price: number; bidders: number; i_lead: boolean };
}

export async function acceptOffer(domainId: string) {
  const { data, error } = await need().rpc("accept_offer", { p_domain: domainId });
  if (error) throw friendly(error, "");
  return data as { price: number; buyer_id: string };
}

export interface NotificationRow {
  id: string;
  kind: "outbid" | "watch" | "listing_removed" | "offer_received";
  message: string;
  domain: string | null;
  read: boolean;
  created_at: string;
}

export async function loadNotifications(): Promise<NotificationRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
  return (data as NotificationRow[]) ?? [];
}

export async function markNotificationsRead() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("notifications").update({ read: true }).eq("read", false);
}

/** Turn database errors into sentences a member can act on. */
export function friendly(e: { message?: string; code?: string }, name: string): Error {
  const m = e.message ?? "";
  if (e.code === "23505" || /duplicate key/.test(m))
    return new Error(`${name} is already listed by another member. DNS verification (coming next) will let the real owner claim it.`);
  if (/domains_name_check|check constraint "domains_name/.test(m)) return new Error(`“${name}” isn't a valid domain name, e.g. example.com.`);
  if (/buy_now_has_price/.test(m)) return new Error("Buy now needs a price.");
  if (/auction_has_end/.test(m)) return new Error("An auction needs an end date.");
  if (/auction_has_bids/.test(m)) return new Error(`${name} has bids — an auction with bids can be removed after it ends.`);
  if (/below_minimum:(\d+)/.test(m)) return new Error(`The minimum offer is $${Number(m.match(/below_minimum:(\d+)/)![1]).toLocaleString("en-US")}.`);
  if (/sign_in_required|JWT/.test(m)) return new Error("Sign in with X to do that.");
  if (/own_domain/.test(m)) return new Error("You can't bid on your own domain.");
  if (/auction_ended/.test(m)) return new Error("This auction has ended.");
  if (/already_sold/.test(m)) return new Error("This domain is already sold.");
  if (/not_listed/.test(m)) return new Error("This domain isn't listed right now.");
  if (/no_offers/.test(m)) return new Error("There are no offers to accept yet.");
  if (/row-level security|permission denied|not_owner/.test(m)) return new Error("You can only change your own listings and profile.");
  return new Error(m || "Something went wrong — try again.");
}
