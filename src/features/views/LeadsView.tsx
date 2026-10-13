"use client";

import type { Stage } from "@/lib/types";
import { useApp, useWorld } from "@/store/app-store";
import { PageHead } from "@/features/common/ui";
import { useOpenOnMap } from "@/features/common/nav";

const STAGES: Stage[] = ["New", "Contacted", "Negotiating", "Won", "Lost"];

export function LeadsView() {
  const w = useWorld();
  const open = useOpenOnMap();
  const leads = useApp((s) => s.leads);
  const { setStage, setNote, removeLead } = useApp.getState();
  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead
          kicker="Lead CRM"
          title="Pipeline"
          sub="Companies and people you've flagged, with the domain you'd pitch. Stored locally in this prototype; production persists per workspace."
        />
        {leads.length ? (
          <table>
            <thead>
              <tr><th>Lead</th><th>Domain</th><th>Stage</th><th>Note</th><th>Added</th><th /></tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const t = w.byId[l.targetId];
                const d = l.domainId ? w.byId[l.domainId] : null;
                if (!t) return null;
                return (
                  <tr key={l.id}>
                    <td>
                      <span className="t">{t.label}</span>
                      <div className="muted text-[11px]">{t.kind} · {t.loc}</div>
                    </td>
                    <td className="mono text-[13px]">{d ? d.label : <span className="muted">—</span>}</td>
                    <td>
                      <select className="stage" value={l.stage} onChange={(e) => setStage(l.id, e.target.value as Stage)} aria-label="Stage">
                        {STAGES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="min-w-[200px]">
                      <input className="note" placeholder="Add a note…" defaultValue={l.note} onBlur={(e) => setNote(l.id, e.target.value)} aria-label="Note" />
                    </td>
                    <td className="muted num text-xs">{l.added}</td>
                    <td className="whitespace-nowrap">
                      <button className="btn sm ghost" onClick={() => open(t.id)}>Map</button>{" "}
                      <button className="btn sm ghost text-muted" onClick={() => removeLead(l.id)}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">No leads yet. Open a domain on the map and add its likely buyers.</div>
        )}
      </div>
    </section>
  );
}
