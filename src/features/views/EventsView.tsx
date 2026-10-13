"use client";

import { COUNTRY, flag } from "@/lib/geo";
import { fmtDate } from "@/lib/format";
import { useApp, useWorld } from "@/store/app-store";
import { PageHead } from "@/features/common/ui";
import { useOpenOnMap } from "@/features/common/nav";

export function EventsView() {
  const w = useWorld();
  const open = useOpenOnMap();
  const toast = useApp((s) => s.toast);
  const es = [...w.events].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead
          kicker="Networking"
          title="Events"
          sub="Conferences, meetups and dinners. Hosting one earns +150 points."
          action={<button className="btn primary" onClick={() => toast("Event form ships with Phase 8")}>+ Host a meetup</button>}
        />
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
          {es.map((e) => (
            <div key={e.id} className="rcard cursor-default p-4">
              <div className="k">
                <b>{e.format}</b>
                <span style={{ marginLeft: "auto" }}>{fmtDate(e.date)}</span>
              </div>
              <div className="t" style={{ gridColumn: "1/-1" }}>{e.name}</div>
              <div className="m">{flag(e.country)} {e.city}, {COUNTRY[e.country]}</div>
              <div className="m mt-2 gap-2">
                <button className="btn sm primary" onClick={() => toast("RSVP recorded locally")}>I&apos;m attending</button>
                <button className="btn sm ghost" onClick={() => open(e.id)}>On the map</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
