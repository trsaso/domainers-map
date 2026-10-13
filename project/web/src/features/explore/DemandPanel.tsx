"use client";

import { demandByCountry, demandOptions, MIN_DEMAND_SCORE, type DemandPoint, type DemandQuery } from "@/lib/demand";
import { useApp, useWorld } from "@/store/app-store";
import { Seg } from "@/features/common/ui";

export function DemandPanel({ q, points, onChange }: { q: DemandQuery; points: DemandPoint[]; onChange(q: DemandQuery): void }) {
  const w = useWorld();
  const select = useApp((s) => s.select);
  const opts = demandOptions(w.domains, q.mode);
  const countries = demandByCountry(points).slice(0, 3);
  const top = points.slice(0, 3);
  return (
    <div className="demand" role="region" aria-label="Buyer demand">
      <div className="flex items-center justify-between gap-2">
        <span className="kicker">Buyer demand</span>
        <Seg
          value={q.mode}
          label="Demand by"
          onChange={(mode) => onChange({ mode, key: demandOptions(w.domains, mode)[0]?.[0] ?? "" })}
          options={[["category", "Category"], ["tld", "Extension"]]}
        />
      </div>
      <div className="chips mt-2.5">
        {opts.map(([k, n]) => (
          <button key={k} className={`chip ${q.mode === "tld" ? "tld" : ""}`} aria-pressed={q.key === k} onClick={() => onChange({ ...q, key: k })}>
            {k} <span className="muted">{n}</span>
          </button>
        ))}
      </div>
      <div className="heat-scale mt-3" aria-hidden />
      <div className="muted mt-1 flex justify-between text-[10px] uppercase tracking-[.1em]">
        <span>fewer buyers</span>
        <span>more, stronger fits</span>
      </div>
      {points.length ? (
        <>
          <div className="mt-3 text-xs">
            <b className="font-heading text-base">{points.length}</b> compan{points.length === 1 ? "y" : "ies"} score {MIN_DEMAND_SCORE}+ for{" "}
            <span className={q.mode === "tld" ? "mono" : ""}>{q.key}</span>
          </div>
          <div className="mt-1.5">
            {countries.map((c) => (
              <div key={c.code} className="row text-xs">
                <span>{c.name}</span>
                <span className="muted num">{c.n} buyer{c.n === 1 ? "" : "s"} · {c.score}</span>
              </div>
            ))}
          </div>
          <h4 className="kicker mb-1 mt-2.5">Strongest buyers</h4>
          {top.map((p) => (
            <button key={p.company.id} className="lnk row w-full text-xs" onClick={() => select(p.company.id, true)}>
              <span>
                {p.company.name} <span className="muted">→ <span className="mono">{p.best.name}</span></span>
              </span>
              <span className="text-accent num">{p.score}</span>
            </button>
          ))}
        </>
      ) : (
        <div className="muted mt-3 text-xs italic">No company scores {MIN_DEMAND_SCORE}+ for this slice yet.</div>
      )}
      <div className="ai-note">From matcher scores against live listings. Heuristic in this prototype.</div>
    </div>
  );
}
