"use client";

import { useMemo } from "react";
import { REGIONS } from "@/lib/geo";
import { fmtDate } from "@/lib/format";
import { auctionOf, endsIn, offersOf, priceLabel } from "@/lib/offers";
import type { Item } from "@/lib/types";
import { useApp, useWorld, type Filters } from "@/store/app-store";
import { SearchBox, TierChip } from "@/features/common/ui";
import { TLD_CHIPS, canHover } from "./filter";

const TYPES: [Filters["type"], string][] = [
  ["all", "All"],
  ["investor", "Investors"],
  ["broker", "Brokers"],
  ["company", "Companies"],
  ["domain", "Domains"],
  ["event", "Events"],
];

export function Sidebar({ list }: { list: Item[] }) {
  const w = useWorld();
  const F = useApp((s) => s.filters);
  const setF = useApp((s) => s.setFilters);
  const offers = useApp((s) => s.offers);
  const selectedId = useApp((s) => s.selectedId);
  const watch = useApp((s) => s.watch);
  const savedViews = useApp((s) => s.savedViews);
  const filtersRev = useApp((s) => s.filtersRev);
  const { select, hoverEnter, hoverLeave, saveView, applyView, deleteView } = useApp.getState();

  const tlds = useMemo(() => {
    const present = new Set(w.items.flatMap((i) => i.tlds || []));
    return TLD_CHIPS.filter((t) => present.has(t));
  }, [w.items]);
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <aside className="side">
      <div className="side-head">
        <SearchBox
          key={filtersRev}
          placeholder="Search people, companies, domains, cities…"
          aria-label="Search"
          defaultValue={F.q}
          onChange={(e) => setF({ q: e.target.value.trim().toLowerCase() })}
        />
        <div className="chips">
          {TYPES.map(([t, label]) => (
            <button key={t} className="chip" aria-pressed={F.type === t} onClick={() => setF({ type: t })}>
              {label}
            </button>
          ))}
        </div>
        <div className="chiprow">
          <span className="lbl">TLD</span>
          <div className="chips">
            {tlds.map((t) => (
              <button key={t} className="chip tld" aria-pressed={F.tlds.includes(t)} onClick={() => setF({ tlds: toggle(F.tlds, t) })}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="chiprow">
          <span className="lbl">Region</span>
          <div className="chips">
            {REGIONS.map(({ r, title }) => (
              <button key={r} className="chip" title={title} aria-pressed={F.regions.includes(r)} onClick={() => setF({ regions: toggle(F.regions, r) })}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="chiprow">
          <span className="lbl">Only</span>
          <div className="chips">
            <button className="chip" aria-pressed={F.verified} onClick={() => setF({ verified: !F.verified })}>
              Verified
            </button>
            <button className="chip" aria-pressed={F.viewport} onClick={() => setF({ viewport: !F.viewport })}>
              In view
            </button>
          </div>
        </div>
        <div className="chiprow">
          <span className="lbl">Views</span>
          <div className="chips">
            {savedViews.map((v) => (
              <span key={v.id} className="chip view-chip">
                <button onClick={() => applyView(v.id)} title="Apply filters and map position">{v.name}</button>
                <button className="del" onClick={() => deleteView(v.id)} aria-label={`Delete view ${v.name}`}>×</button>
              </span>
            ))}
            <button className="chip" onClick={saveView} title="Save the current filters and map position">
              + Save view
            </button>
          </div>
        </div>
      </div>
      <div className="results-bar">
        <span>
          {list.length} result{list.length === 1 ? "" : "s"}
          {F.viewport ? " in view" : ""}
        </span>
        <label>
          Sort{" "}
          <select value={F.sort} onChange={(e) => setF({ sort: e.target.value as Filters["sort"] })}>
            <option value="relevance">Sponsored first</option>
            <option value="points">Reputation</option>
            <option value="deals">Most active</option>
            <option value="price">Asking price</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div className="results" onMouseLeave={() => hoverLeave()}>
        {list.length ? (
          list.map((i) => (
            <button
              key={i.id}
              className="rcard"
              aria-selected={selectedId === i.id}
              onClick={() => select(i.id, true)}
              onMouseEnter={(e) => {
                if (!canHover()) return;
                const r = e.currentTarget.getBoundingClientRect();
                hoverEnter(i.id, r.right, r.top + r.height / 2);
              }}
              onMouseLeave={() => hoverLeave()}
            >
              <div className="k">
                <b>{i.kind}</b>
                {watch[i.id] && <span className="text-accent-hi" title="On your watchlist">★</span>}
                {i.sponsored && <span className="spons">Sponsored</span>}
                {(i.kind === "investor" || i.kind === "broker") && <TierChip i={i} />}
                {i.kind === "domain" && auctionOf(i.id) && <span className="auct">{endsIn(i.id)}</span>}
                <span style={{ marginLeft: "auto" }}>{i.city}</span>
              </div>
              <CardBody i={i} offerCount={i.kind === "domain" ? offersOf(i.id, offers).length : 0} price={i.kind === "domain" ? priceLabel(i, offers) : ""} />
            </button>
          ))
        ) : (
          <div className="empty">Nothing here. Pan the map or clear a filter.</div>
        )}
      </div>
    </aside>
  );
}

function CardBody({ i, offerCount, price }: { i: Item; offerCount: number; price: string }) {
  switch (i.kind) {
    case "domain":
      return (
        <>
          <div className="t mono">{i.name}</div>
          <div className="p">{price}</div>
          <div className="m">
            {i.category} · held by {i.owner.name}
            {offerCount ? ` · ${offerCount} offer${offerCount > 1 ? "s" : ""}` : ""}
          </div>
        </>
      );
    case "company":
      return (
        <>
          <div className="t">{i.name}</div>
          <div className="p muted">{i.stage}</div>
          <div className="m">
            {i.industry} · <span className="mono">{i.currentDomain}</span>
          </div>
        </>
      );
    case "event":
      return (
        <>
          <div className="t">{i.name}</div>
          <div className="p muted">{fmtDate(i.date)}</div>
          <div className="m">{i.sub}</div>
        </>
      );
    default:
      return (
        <>
          <div className="t">{i.name}</div>
          <div className="p muted num">
            {i.points} pts · #{i.rank}
          </div>
          <div className="m">
            {i.org ? i.org + " · " : ""}
            {i.tlds.map((t) => (
              <span key={t} className="mono">
                {t}
              </span>
            ))}
          </div>
        </>
      );
  }
}
