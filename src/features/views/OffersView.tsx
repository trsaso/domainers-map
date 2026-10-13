"use client";

import { money } from "@/lib/format";
import { auctionOf, endsIn, leading, myStatus, offersOf } from "@/lib/offers";
import { ME } from "@/lib/world";
import { useApp, useWorld } from "@/store/app-store";
import { PageHead } from "@/features/common/ui";
import { useOpenOnMap } from "@/features/common/nav";

export function OffersView() {
  const w = useWorld();
  const open = useOpenOnMap();
  const offers = useApp((s) => s.offers);
  const notifs = useApp((s) => s.notifs)
    .filter((n) => (n.kind ?? "outbid") === "outbid")
    .slice(0, 8);
  const { simulateRival, markAllRead } = useApp.getState();
  const mine = w.domains.filter((d) => offersOf(d.id, offers).some((o) => o.bidderId === ME));

  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead
          kicker="Offers & auctions"
          title="My offers"
          sub="Proxy bids keep you ahead up to your max. Outbid alerts land here and in the Offers badge."
          action={
            <button className="btn" onClick={simulateRival} title="Prototype only: a rival raises against one of your leading offers">
              Simulate rival bid
            </button>
          }
        />
        {notifs.length > 0 && (
          <div className="mb-[22px] rounded border border-divider px-3.5 py-1">
            {notifs.map((n, k) => (
              <div key={n.at + k} className="row text-[13px]">
                <span>
                  {!n.read && <span className="status-out">● </span>}
                  {n.msg}
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="muted text-[11px]">
                    {new Date(n.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button className="btn sm ghost" onClick={() => open(n.id)}>Raise</button>
                </span>
              </div>
            ))}
            <div className="py-2">
              <button className="btn sm ghost" onClick={() => markAllRead("outbid")}>Mark all read</button>
            </div>
          </div>
        )}
        {mine.length ? (
          <table>
            <thead>
              <tr><th>Domain</th><th>Current high</th><th>Your max</th><th>Status</th><th>Bidders</th><th>Ends</th><th /></tr>
            </thead>
            <tbody>
              {mine.map((d) => {
                const l = leading(d.id, offers)!;
                const meB = l.bidders.find((b) => b.bidderId === ME)!;
                const st = myStatus(d.id, offers);
                return (
                  <tr key={d.id}>
                    <td className="mono text-sm">
                      {d.name}
                      <div className="muted font-body text-[11px]">{d.category} · {d.owner.name}</div>
                    </td>
                    <td className="mono">{money(l.price)}</td>
                    <td className="mono">{money(meB.max)}</td>
                    <td className={st === "leading" ? "status-lead" : "status-out"}>{st === "leading" ? "Leading" : "Outbid"}</td>
                    <td className="num">{l.count}</td>
                    <td>{auctionOf(d.id) ? <span className="auct">{endsIn(d.id)}</span> : <span className="muted">open</span>}</td>
                    <td>
                      <button className="btn sm" onClick={() => open(d.id)}>{st === "leading" ? "View" : "Raise"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">No offers yet. Open a domain and make one.</div>
        )}
      </div>
    </section>
  );
}
