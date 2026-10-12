"use client";

import { useState } from "react";
import { COUNTRY } from "@/lib/geo";
import { money } from "@/lib/format";
import { buyersFor } from "@/lib/matching";
import { useApp, useWorld } from "@/store/app-store";
import { SearchBox } from "@/features/common/ui";
import { useOpenOnMap } from "@/features/common/nav";

export function MatchesView() {
  const w = useWorld();
  const open = useOpenOnMap();
  const picked = useApp((s) => s.pickedDomain);
  const set = useApp((s) => s.set);
  const addLead = useApp((s) => s.addLead);
  const [q, setQ] = useState("");
  // On phones the list and the detail are separate screens; picking a domain switches to the detail.
  const [detail, setDetail] = useState(!!picked);

  const ds = w.domains.filter((d) => d.status !== "sold" && d.name.includes(q.toLowerCase()));
  const pickedId = picked && w.domains.some((d) => d.id === picked && d.status !== "sold") ? picked : ds[0]?.id;
  const d = w.domains.find((x) => x.id === pickedId);
  const rows = d ? buyersFor(d, w.companies) : [];

  return (
    <section className="view on">
      <div className={`pane ${detail ? "sel" : ""}`}>
        <div className="pane-left">
          <div className="side-head">
            <SearchBox placeholder="Search your inventory…" aria-label="Search inventory" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="dlist">
            {ds.map((x) => {
              const top = buyersFor(x, w.companies)[0];
              return (
                <button
                  key={x.id}
                  className="drow"
                  aria-selected={x.id === pickedId}
                  onClick={() => {
                    set("pickedDomain", x.id);
                    setDetail(true);
                  }}
                >
                  <span className="n">{x.name}</span>
                  <span className="p">{x.status === "make-offer" ? "offer" : money(x.askingUSD)}</span>
                  <span className="m">best fit {top.score} · {top.c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="pane-main">
          {d && (
            <>
              <button className="btn sm ghost mb-2 min-[861px]:hidden" onClick={() => setDetail(false)}>← Inventory</button>
              <div className="kicker">Buyer matching</div>
              <h2 className="mono" style={{ fontWeight: 400, fontSize: 30 }}>{d.name}</h2>
              <p className="lead-sub">
                {rows.filter((r) => r.score >= 50).length} companies score 50+. Ranked on wish-list, brand-name and keyword fit, with a budget signal from disclosed funding.
              </p>
              <table>
                <thead>
                  <tr><th>Score</th><th>Company</th><th>Industry · stage</th><th>Current domain</th><th>Why</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.c.id}>
                      <td style={{ width: 120 }}>
                        <div className="flex items-center gap-2">
                          <b className="num w-7 font-heading text-xl text-accent">{r.score}</b>
                          <div className="bar flex-1"><i style={{ width: r.score + "%" }} /></div>
                        </div>
                      </td>
                      <td>
                        <span className="t">{r.c.name}</span>
                        <div className="muted text-[11px]">{r.c.city}, {COUNTRY[r.c.country]}</div>
                      </td>
                      <td>{r.c.industry} · {r.c.stage}</td>
                      <td className="mono text-xs">{r.c.currentDomain}</td>
                      <td className="muted why text-xs">{r.why}</td>
                      <td className="whitespace-nowrap">
                        <button className="btn sm" onClick={() => addLead(r.c.id, d.id)}>+ Lead</button>{" "}
                        <button className="btn sm ghost" onClick={() => open(r.c.id)}>Map</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
