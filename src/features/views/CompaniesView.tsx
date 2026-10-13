"use client";

import { flag } from "@/lib/geo";
import { money } from "@/lib/format";
import { domainsFor } from "@/lib/matching";
import { useApp, useWorld } from "@/store/app-store";
import { PageHead } from "@/features/common/ui";
import { useOpenOnMap } from "@/features/common/nav";

export function CompaniesView() {
  const w = useWorld();
  const open = useOpenOnMap();
  const addLead = useApp((s) => s.addLead);
  const cs = [...w.companies].sort((a, b) => b.fundingUSD - a.fundingUSD);
  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead
          kicker="Buyers"
          title="Companies"
          sub={`${cs.length} companies that have stated the names they want. Claimable by the company; wish lists feed the matcher.`}
        />
        <table>
          <thead>
            <tr>
              <th>Company</th><th>Industry · stage</th><th>Current domain</th><th>Wants</th><th>Best fit in inventory</th><th />
            </tr>
          </thead>
          <tbody>
            {cs.map((c) => {
              const f = domainsFor(c, w.domains)[0];
              return (
                <tr key={c.id}>
                  <td>
                    <span className="t">{c.name}</span>
                    <div className="muted text-[11px]">
                      {flag(c.country)} {c.city} · {c.fundingUSD ? money(c.fundingUSD) + " raised" : "bootstrapped"}
                    </div>
                  </td>
                  <td>{c.industry} · {c.stage}</td>
                  <td className="mono text-xs">{c.currentDomain}</td>
                  <td>
                    <span className="flex gap-1">{c.wants.map((x) => <span key={x} className="tag accent mono">{x}</span>)}</span>
                  </td>
                  <td className="mono text-xs">
                    {f ? <>{f.d.name} <span className="text-accent">{f.score}</span></> : "—"}
                  </td>
                  <td className="whitespace-nowrap">
                    <button className="btn sm" onClick={() => open(c.id)}>Open</button>{" "}
                    <button className="btn sm ghost" onClick={() => addLead(c.id)}>+ Lead</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
