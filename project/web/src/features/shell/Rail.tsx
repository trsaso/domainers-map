"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useApp, useWorld } from "@/store/app-store";
import { Av } from "@/features/common/ui";
import type { View } from "@/features/common/nav";

const ITEMS: { v: View; label: string; ic: string; icStyle?: CSSProperties; count?: "domains" | "outbid" | "events" | "leads" | "watch" }[] = [
  { v: "explore", label: "Explore", ic: "" },
  { v: "domainers", label: "Domainers", ic: "pt" },
  { v: "domains", label: "Domains", ic: "ln", count: "domains" },
  { v: "companies", label: "Companies", ic: "sq" },
  { v: "matches", label: "Matches", ic: "sq", icStyle: { borderRadius: "50% 2px 50% 2px" } },
  { v: "offers", label: "Offers", ic: "", icStyle: { borderRadius: "2px 50% 50% 50%" }, count: "outbid" },
  { v: "watchlist", label: "Watchlist", ic: "", icStyle: { borderRadius: 0, clipPath: "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)", background: "currentColor", border: 0 }, count: "watch" },
  { v: "events", label: "Events", ic: "dm", count: "events" },
  { v: "today", label: "Today", ic: "ln", icStyle: { borderWidth: "1.5px 0 0 0", height: 1, marginTop: 0 } },
  { v: "leads", label: "Leads", ic: "sq", icStyle: { borderRadius: 2, borderStyle: "double" }, count: "leads" },
];

export function Rail({ view }: { view: string }) {
  const w = useWorld();
  const leads = useApp((s) => s.leads.length);
  const unread = useApp((s) => s.notifs.filter((n) => !n.read && (n.kind ?? "outbid") === "outbid").length);
  const unreadWatch = useApp((s) => s.notifs.filter((n) => !n.read && n.kind === "watch").length);
  const watching = useApp((s) => Object.keys(s.watch).length);
  const toast = useApp((s) => s.toast);
  const select = useApp((s) => s.select);
  const me = w.me;
  const counts = {
    domains: w.domains.filter((d) => d.status !== "sold").length,
    outbid: unread,
    events: w.events.length,
    leads,
    watch: unreadWatch || watching,
  };

  const link = (it: (typeof ITEMS)[number] | { v: View; label: string; ic: string; icStyle?: CSSProperties; count?: undefined }) => (
    <Link key={it.v} href={"/" + it.v} className="nv" aria-current={view === it.v ? "page" : undefined}>
      <span className={`ic ${it.ic}`} style={it.icStyle} />
      {it.label}
      {it.count && (it.count !== "outbid" || counts.outbid > 0) && (it.count !== "watch" || counts.watch > 0) && (
        <span className="count" style={it.count === "watch" && unreadWatch ? { background: "var(--accent)", color: "#1b1917" } : undefined} title={it.count === "watch" ? (unreadWatch ? `${unreadWatch} new alerts` : `${watching} watched`) : undefined}>
          {counts[it.count]}
        </span>
      )}
    </Link>
  );

  return (
    <nav className="rail" aria-label="Main">
      <div className="brand">
        <i />
        <span>Domainers Map</span>
      </div>
      {ITEMS.map(link)}
      <div className="sep" />
      {link({ v: "grow", label: "Grow", ic: "", icStyle: { borderStyle: "dotted" } })}
      <button className="btn primary cta" onClick={() => toast("Listing editor ships with inventory CRUD")}>
        + List a domain
      </button>
      <button className="me-card" onClick={() => select(me.id, true)}>
        <Av i={me} />
        <span>
          <span className="n">{me.name}</span>
          <div className="s">
            #{me.rank} · {me.points} pts{me.xHandle ? " · @" + me.xHandle : ""}
          </div>
        </span>
      </button>
    </nav>
  );
}
