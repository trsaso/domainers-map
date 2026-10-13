"use client";

import { COUNTRY } from "@/lib/geo";
import { money } from "@/lib/format";
import { mapController } from "@/lib/map-controller";
import type { PersonItem } from "@/lib/types";
import { DB, ME, countryCenter, countryCounts } from "@/lib/world";
import { useApp, useWorld } from "@/store/app-store";
import { APin, PageHead, TierChip } from "@/features/common/ui";
import { useGo, useOpenOnMap } from "@/features/common/nav";

const Name = ({ children }: { children: React.ReactNode }) => (
  <span className="font-heading text-[17px] font-semibold">{children}</span>
);

export function TodayView() {
  const w = useWorld();
  const open = useOpenOnMap();
  const go = useGo();
  const offers = useApp((s) => s.offers);
  const people = [...w.people].sort((a, b) => b.points - a.points);
  const myOffers = (p: PersonItem) => Object.values(offers).flat().filter((o) => o.bidderId === p.id).length;
  // Sample "points since midnight" until the activity ledger exists.
  const gained = (p: PersonItem) => ((p.deals12m * 7 + p.name.length * 3) % 40) + (p.tier === "attested" ? 10 : 0) + myOffers(p) * 2;
  const climbing = [...w.people].sort((a, b) => gained(b) - gained(a)).slice(0, 6);
  const countries = Object.entries(countryCounts(w.items)).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const brokers = w.people.filter((p) => p.type === "broker").sort((a, b) => b.deals12m - a.deals12m).slice(0, 5);
  const feed = [
    ...Object.entries(offers).flatMap(([id, arr]) =>
      arr.map((o) => ({
        kind: "offer" as const,
        domain: w.byId[id].label,
        price: o.amount,
        who: o.bidderId === ME ? "You" : w.byId[o.bidderId]?.label,
        country: w.byId[o.bidderId]?.country,
        at: o.at,
      })),
    ),
    ...DB.deals.map((x) => ({ ...x, who: x.buyer })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);
  const flyToCountry = (c: string) => {
    go("explore");
    const [lat, lng] = countryCenter(w.items, c);
    mapController.run((m) => m.flyTo(lat, lng, 5));
  };

  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead
          kicker="Reputation"
          title="Leaderboards"
          sub="Points come from verification tier, listings, offers, attested deals and activity. They change pin size, sort rank and badges — never match scores, and they can't be bought."
        />
        <div className="grid gap-7" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          <div>
            <h4 className="kicker mb-1.5">Top members</h4>
            {people.slice(0, 10).map((p, i) => (
              <div key={p.id} className="lead-row">
                <span className="r">{i + 1}</span>
                <button className="lnk" onClick={() => open(p.id)}>
                  <Name>{p.name}</Name> <span className="muted text-xs">{p.city}</span>
                  <div className="mt-0.5 flex gap-1.5">
                    <TierChip i={p} />
                    <span className="muted text-[11px]">{p.type}</span>
                  </div>
                </button>
                <span className="pts">{p.points}</span>
              </div>
            ))}
          </div>
          <div>
            <h4 className="kicker mb-1.5">Top countries</h4>
            {countries.map(([c, n], i) => (
              <div key={c} className="lead-row">
                <span className="r">{i + 1}</span>
                <button className="lnk" onClick={() => flyToCountry(c)}>
                  <Name>{COUNTRY[c]}</Name>
                  <div className="muted text-[11px]">{w.people.filter((p) => p.country === c).reduce((a, p) => a + p.points, 0)} pts combined</div>
                </button>
                <span className="pts">{n}</span>
              </div>
            ))}
            <h4 className="kicker mb-1.5 mt-[22px]">Most active brokers</h4>
            {brokers.map((p, i) => (
              <div key={p.id} className="lead-row">
                <span className="r">{i + 1}</span>
                <button className="lnk" onClick={() => open(p.id)}>
                  <Name>{p.name}</Name> <span className="muted text-xs">{p.org || p.city}</span>
                </button>
                <span className="pts" style={{ fontSize: 16 }}>{p.deals12m} deals</span>
              </div>
            ))}
          </div>
          <div>
            <h4 className="kicker mb-1.5">
              Climbing today <span className="muted text-[11px] normal-case tracking-normal">· points since midnight (sample)</span>
            </h4>
            {climbing.map((p) => (
              <div key={p.id} className="lead-row" style={{ gridTemplateColumns: "34px 1fr auto" }}>
                <APin p={p} size={34} className="" />
                <button className="lnk" onClick={() => open(p.id)}>
                  <Name>{p.name}</Name>
                  <div className="muted text-[11px]">{p.city}{p.xHandle ? " · @" + p.xHandle : ""}</div>
                </button>
                <span className="text-right">
                  <span className="gain font-heading text-lg">▲ {gained(p)}</span>
                  <div className="muted text-[11px]">#{p.rank}</div>
                </span>
              </div>
            ))}
            <h4 className="kicker mb-1.5 mt-[22px]">Deal feed</h4>
            {feed.map((f, k) => (
              <div key={k} className="lead-row" style={{ gridTemplateColumns: "1fr auto" }}>
                <span>
                  <span className="mono text-[13px]">{f.domain}</span>{" "}
                  <span className="muted text-xs">
                    {f.kind === "sale" ? "sold to" : "offer by"} {f.who || "undisclosed"}
                    {f.country ? " · " + f.country : ""}
                  </span>
                  <div className="muted text-[11px]">{f.at.slice(0, 10)}</div>
                </span>
                <span className="mono" style={{ color: f.kind === "sale" ? "var(--accent-hi)" : "var(--text)" }}>{money(f.price)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
