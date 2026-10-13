"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/store/app-store";

export const VIEWS = {
  explore: "Explore",
  domainers: "Domainers",
  domains: "Domains",
  companies: "Companies",
  matches: "Matches",
  offers: "Offers",
  watchlist: "Watchlist",
  events: "Events",
  today: "Today",
  leads: "Leads",
  grow: "Grow",
  "my-domains": "My domains",
  profile: "Profile",
} as const;
export type View = keyof typeof VIEWS;

/** Switch to the map and open an item there (the prototype's showView('explore');select(id,true)). */
export function useOpenOnMap() {
  const router = useRouter();
  const select = useApp((s) => s.select);
  return (id: string) => {
    router.push("/explore");
    select(id, true);
  };
}

export function useGo() {
  const router = useRouter();
  return (v: View) => router.push("/" + v);
}
