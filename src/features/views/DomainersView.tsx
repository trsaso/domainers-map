"use client";

import { flag } from "@/lib/geo";
import { ME } from "@/lib/world";
import { useWorld } from "@/store/app-store";
import { APin, PageHead, TierChip } from "@/features/common/ui";
import { useOpenOnMap } from "@/features/common/nav";

export function DomainersView() {
  const w = useWorld();
  const open = useOpenOnMap();
  const people = [...w.people].sort((a, b) => b.points - a.points);
  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead
          kicker="Directory"
          title="Top domainers"
          sub={`${w.people.length} domainers · ranked by points. Points come from verification, listings, offers, attested deals and activity — never from payment.`}
        />
        <div className="rounded border border-divider">
          {people.map((p, i) => {
            const top = w.domains.filter((d) => d.ownerId === p.id && d.status !== "sold").sort((a, b) => b.askingUSD - a.askingUSD)[0];
            return (
              <div key={p.id} className="lead-row m-0 border-b border-divider px-4 py-3.5" style={{ gridTemplateColumns: "28px 48px 1fr auto" }}>
                <span className="r" style={{ color: i < 3 ? "var(--accent)" : "var(--faint)" }}>{i + 1}</span>
                <APin p={p} size={44} />
                <div className="min-w-0">
                  <button className="lnk" onClick={() => open(p.id)}>
                    <span className="font-heading text-[19px] font-semibold">{p.name}</span> <TierChip i={p} />{" "}
                    {p.xHandle && <span className="muted text-xs">@{p.xHandle}</span>}
                  </button>
                  <div className="muted text-[13px]">
                    {p.focus.join(" · ")}
                    {p.org ? " · " + p.org : ""}
                  </div>
                  <div className="chips mt-1.5">
                    <span className="tag">{flag(p.country)} {p.city}</span>
                    <span className="tag">{p.type} · {p.tlds[0]}</span>
                    {top && (
                      <button className="tag accent mono cursor-pointer" onClick={() => open(top.id)}>
                        {top.name} ↗
                      </button>
                    )}
                    {p.id === ME && <span className="tag fill">you</span>}
                  </div>
                </div>
                <span className="text-right">
                  <span className="pts" style={{ fontSize: 22 }}>{p.points >= 1000 ? (p.points / 1000).toFixed(1) + "K" : p.points}</span>
                  <div className="muted text-[10px] uppercase tracking-[.1em]">points</div>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
