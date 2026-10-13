"use client";

import { fmtDate, money } from "@/lib/format";
import { priceLabel } from "@/lib/offers";
import type { Item } from "@/lib/types";
import { useApp } from "@/store/app-store";

export function ListView({ list, on }: { list: Item[]; on: boolean }) {
  const selectedId = useApp((s) => s.selectedId);
  const offers = useApp((s) => s.offers);
  const select = useApp((s) => s.select);
  return (
    <div className={`listview ${on ? "on" : ""}`}>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Location</th>
            <th>TLDs / Industry</th>
            <th>Activity</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((i) => (
            <tr key={i.id} className={selectedId === i.id ? "sel" : ""}>
              <td>
                <span className={`t ${i.kind === "domain" ? "mono" : ""}`}>{i.label}</span>
                {i.sponsored && (
                  <>
                    {" "}
                    <span className="spons">Sponsored</span>
                  </>
                )}
                <div className="muted" style={{ fontSize: 11 }}>
                  {i.kind === "domain" ? i.owner.name : i.sub}
                </div>
              </td>
              <td>
                <span className="tag">{i.kind}</span>
              </td>
              <td>{i.loc}</td>
              <td className="mono" style={{ fontSize: 12 }}>
                {i.kind === "company" ? i.industry : (i.tlds || []).join(" ")}
              </td>
              <td className="num">
                {i.kind === "domain"
                  ? priceLabel(i, offers)
                  : i.kind === "company"
                    ? money(i.fundingUSD) + " raised"
                    : i.kind === "event"
                      ? fmtDate(i.date)
                      : `${i.points} pts · ${i.deals12m} deals`}
              </td>
              <td>
                <button className="btn sm" onClick={() => select(i.id, true)}>
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
