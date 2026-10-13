"use client";

import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { domainsFor } from "@/lib/matching";
import { auctionOf, endsIn, offersOf, priceLabel } from "@/lib/offers";
import { isPerson, type Item } from "@/lib/types";
import { useApp, useWorld } from "@/store/app-store";
import { PageHead, TierChip } from "@/features/common/ui";
import { useOpenOnMap } from "@/features/common/nav";

function Unwatch({ i }: { i: Item }) {
  const toggleWatch = useApp((s) => s.toggleWatch);
  return (
    <button className="btn sm ghost text-accent-hi" onClick={() => toggleWatch(i.id)} aria-label={`Stop watching ${i.label}`} title="Stop watching">
      ★
    </button>
  );
}

export function WatchlistView() {
  const w = useWorld();
  const open = useOpenOnMap();
  const router = useRouter();
  const watch = useApp((s) => s.watch);
  const offers = useApp((s) => s.offers);
  const savedViews = useApp((s) => s.savedViews);
  const alerts = useApp((s) => s.notifs).filter((n) => n.kind === "watch").slice(0, 10);
  const { simulateMarket, markAllRead, applyView, deleteView } = useApp.getState();
  const items = Object.keys(watch).map((id) => w.byId[id]).filter(Boolean);
  const domains = items.filter((i) => i.kind === "domain");
  const people = items.filter(isPerson);
  const companies = items.filter((i) => i.kind === "company");

  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead
          kicker="Watchlist"
          title="Watching"
          sub="Star any domain, domainer or company with ☆ in its drawer. You get an alert when a watched name gets an offer, changes price or sells, when a domainer lists or climbs, or when a company gets a new best-fit name."
          action={
            <button className="btn" onClick={simulateMarket} title="Prototype only: a rival bids on one of your watched domains">
              Simulate market activity
            </button>
          }
        />

        {alerts.length > 0 && (
          <div className="mb-[22px] rounded border border-divider px-3.5 py-1">
            {alerts.map((n, k) => (
              <div key={n.at + k} className="row text-[13px]">
                <span>
                  {!n.read && <span className="status-lead">● </span>}
                  {n.msg}
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="muted text-[11px]">{new Date(n.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  <button className="btn sm ghost" onClick={() => open(n.id)}>View</button>
                </span>
              </div>
            ))}
            <div className="py-2">
              <button className="btn sm ghost" onClick={() => markAllRead("watch")}>Mark all read</button>
            </div>
          </div>
        )}

        {!items.length && <div className="empty">Nothing watched yet. Open a domain, domainer or company and tap ☆.</div>}

        {domains.length > 0 && (
          <>
            <h4 className="kicker mb-1.5 mt-2">Domains · {domains.length}</h4>
            <table className="mb-7">
              <thead>
                <tr><th>Domain</th><th>Held by</th><th>Now</th><th>Offers</th><th>Ends</th><th /></tr>
              </thead>
              <tbody>
                {domains.map((d) =>
                  d.kind !== "domain" ? null : (
                    <tr key={d.id}>
                      <td className="mono text-sm">
                        {d.name}
                        <div className="muted font-body text-[11px]">{d.category}</div>
                      </td>
                      <td>{d.owner.name}</td>
                      <td className={`mono ${d.status === "sold" ? "status-lead" : ""}`}>{priceLabel(d, offers)}</td>
                      <td className="num">{offersOf(d.id, offers).length}</td>
                      <td>{auctionOf(d.id) ? <span className="auct">{endsIn(d.id)}</span> : <span className="muted">open</span>}</td>
                      <td className="whitespace-nowrap">
                        <button className="btn sm" onClick={() => open(d.id)}>Open</button> <Unwatch i={d} />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </>
        )}

        {people.length > 0 && (
          <>
            <h4 className="kicker mb-1.5">Domainers · {people.length}</h4>
            <div className="mb-7">
              {people.map((p) => (
                <div key={p.id} className="lead-row" style={{ gridTemplateColumns: "40px 1fr auto auto" }}>
                  <span className="r">#{p.rank}</span>
                  <button className="lnk" onClick={() => open(p.id)}>
                    <span className="font-heading text-[17px] font-semibold">{p.name}</span> <TierChip i={p} />
                    <div className="muted text-[11px]">
                      {p.city} · {w.domains.filter((d) => d.ownerId === p.id && d.status !== "sold").length} listed
                    </div>
                  </button>
                  <span className="pts">{p.points}</span>
                  <Unwatch i={p} />
                </div>
              ))}
            </div>
          </>
        )}

        {companies.length > 0 && (
          <>
            <h4 className="kicker mb-1.5">Companies · {companies.length}</h4>
            <div className="mb-7">
              {companies.map((c) => {
                if (c.kind !== "company") return null;
                const f = domainsFor(c, w.domains)[0];
                return (
                  <div key={c.id} className="lead-row" style={{ gridTemplateColumns: "1fr auto auto" }}>
                    <button className="lnk" onClick={() => open(c.id)}>
                      <span className="font-heading text-[17px] font-semibold">{c.name}</span>{" "}
                      <span className="muted text-xs">{c.industry} · {c.fundingUSD ? money(c.fundingUSD) + " raised" : "bootstrapped"}</span>
                      <div className="muted text-[11px]">best fit: <span className="mono">{f?.d.name ?? "—"}</span></div>
                    </button>
                    <span className="pts">{f?.score ?? "—"}</span>
                    <Unwatch i={c} />
                  </div>
                );
              })}
            </div>
          </>
        )}

        <h4 className="kicker mb-1.5 mt-2">Saved map views · {savedViews.length}</h4>
        {savedViews.length ? (
          savedViews.map((v) => (
            <div key={v.id} className="row">
              <span>
                <span className="font-heading text-[17px] font-semibold">{v.name}</span>
                {v.camera && <span className="muted mono text-[11px]"> · z{Math.round(v.camera.zoom)} @ {v.camera.lat.toFixed(1)}, {v.camera.lng.toFixed(1)}</span>}
              </span>
              <span className="flex gap-2">
                <button
                  className="btn sm"
                  onClick={() => {
                    router.push("/explore");
                    applyView(v.id);
                  }}
                >
                  Open on map
                </button>
                <button className="btn sm ghost text-muted" onClick={() => deleteView(v.id)}>Delete</button>
              </span>
            </div>
          ))
        ) : (
          <div className="muted text-[13px]">Use “+ Save view” in the Explore sidebar to keep a set of filters and a map position.</div>
        )}
      </div>
    </section>
  );
}
