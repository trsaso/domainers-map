"use client";

import { flag } from "@/lib/geo";
import { money } from "@/lib/format";
import { auctionOf, endsIn, leading, offersOf } from "@/lib/offers";
import { statLine } from "@/lib/world";
import { useApp, useWorld, type DomainFilters } from "@/store/app-store";
import { APin, PageHead, SearchBox, Seg } from "@/features/common/ui";
import { useOpenOnMap } from "@/features/common/nav";

export function DomainsView() {
  const w = useWorld();
  const open = useOpenOnMap();
  const DF = useApp((s) => s.domainFilters);
  const setDF = useApp((s) => s.setDomainFilters);
  const offers = useApp((s) => s.offers);
  const live = w.domains.filter((d) => d.status !== "sold");
  const cats: Record<string, number> = {};
  live.forEach((d) => (cats[d.category] = (cats[d.category] || 0) + 1));
  const l = live.filter((d) => (DF.cat === "all" || d.category === DF.cat) && d.name.includes(DF.q));
  const me = w.me;
  if (DF.sort === "top") l.sort((a, b) => b.owner.points - a.owner.points);
  if (DF.sort === "new") l.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  if (DF.sort === "offers") l.sort((a, b) => offersOf(b.id, offers).length - offersOf(a.id, offers).length);
  if (DF.sort === "near") {
    const dist = (o: { lat: number; lng: number }) => Math.hypot(o.lat - me.lat, o.lng - me.lng);
    l.sort((a, b) => dist(a.owner) - dist(b.owner));
  }

  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead kicker="Marketplace" title="Domains" sub={`${statLine(w)} · ranked by the holder's points.`} />
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <SearchBox
            wrapClass="flex-1 min-w-[220px]"
            placeholder={`Search ${live.length} domains…`}
            aria-label="Search domains"
            value={DF.q}
            onChange={(e) => setDF({ q: e.target.value.toLowerCase() })}
          />
          <Seg<DomainFilters["sort"]>
            value={DF.sort}
            label="Sort"
            onChange={(v) => setDF({ sort: v })}
            options={[["top", "Top"], ["new", "New"], ["offers", "Most offers"], ["near", "Near you"]]}
          />
        </div>
        <div className="chips mb-[18px]">
          <button className="chip" aria-pressed={DF.cat === "all"} onClick={() => setDF({ cat: "all" })}>
            All <span className="muted">{live.length}</span>
          </button>
          {Object.entries(cats)
            .sort((a, b) => b[1] - a[1])
            .map(([c, n]) => (
              <button key={c} className="chip" aria-pressed={DF.cat === c} onClick={() => setDF({ cat: c })}>
                {c} <span className="muted">{n}</span>
              </button>
            ))}
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
          {l.map((d, i) => {
            const o = d.owner;
            const lead = leading(d.id, offers);
            const n = offersOf(d.id, offers).length;
            return (
              <button key={d.id} className="rcard p-4" onClick={() => open(d.id)}>
                <div className="k">
                  <b>{d.category}</b>
                  {auctionOf(d.id) && <span className="auct">{endsIn(d.id)}</span>}
                  <span style={{ marginLeft: "auto" }}>{d.status === "make-offer" ? "make offer" : "listed"}</span>
                </div>
                <div className="t mono" style={{ fontSize: 18, gridColumn: "1/-1" }}>{d.name}</div>
                <div className="m mt-1.5 items-center gap-2">
                  <APin p={o} size={22} style={{ borderWidth: 1 }} />
                  <span>{o.name} · {flag(o.country)} {o.city}</span>
                </div>
                <div className="m mt-2 justify-between">
                  <span className="font-heading text-base font-semibold text-accent">#{i + 1}</span>
                  <span className="mono">
                    {lead ? money(lead.price) + " bid" : d.status === "make-offer" ? "—" : money(d.askingUSD)}
                    {n > 0 && <span className="muted"> · {n} offer{n > 1 ? "s" : ""}</span>}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
