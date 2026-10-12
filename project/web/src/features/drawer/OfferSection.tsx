"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { auctionOf, endsIn, leading, minOffer, myStatus } from "@/lib/offers";
import type { DomainItem } from "@/lib/types";
import { ME } from "@/lib/world";
import { useApp, useWorld } from "@/store/app-store";

const endsAt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function OfferSection({ d }: { d: DomainItem }) {
  const w = useWorld();
  const offers = useApp((s) => s.offers);
  const { placeOffer, acceptOffer, toast } = useApp.getState();
  const l = leading(d.id, offers);
  const a = auctionOf(d.id);
  const st = myStatus(d.id, offers);
  const own = d.ownerId === ME;
  const min = minOffer(d, offers);
  const [amt, setAmt] = useState(String(min));
  const [max, setMax] = useState("");
  // After any bid lands the minimum moves; reset the form to the new floor.
  useEffect(() => {
    setAmt(String(min));
    setMax("");
  }, [min]);
  const name = (id: string) => w.byId[id]?.label || "Bidder";

  const reserve = a ? (
    <span className="muted">{l && l.price >= a.reserve ? "Reserve met" : `Reserve ${money(a.reserve)} not met`}</span>
  ) : null;
  const stats = (third: React.ReactNode) => (
    <div className="stats">
      <div className="stat"><b>{l ? money(l.price) : "—"}</b><span>{l ? "current high" : "no offers yet"}</span></div>
      <div className="stat"><b>{l ? l.count : 0}</b><span>bidder{l && l.count === 1 ? "" : "s"}</span></div>
      {third}
    </div>
  );

  if (own)
    return (
      <div className="d-sec">
        <h4>Offers received{a && <> · <span className="auct">{endsIn(d.id)}</span></>}</h4>
        {stats(<div className="stat"><b>{money(d.askingUSD)}</b><span>your asking</span></div>)}
        {a && <div style={{ fontSize: 12, marginTop: 8 }}>{reserve} · ends {endsAt(a.endsAt)}</div>}
        {l ? (
          <div style={{ marginTop: 10 }}>
            {l.bidders.map((b, i) => (
              <div key={b.bidderId} className="row" style={{ fontSize: 12 }}>
                <span>
                  {i === 0 && <span className="status-lead">● </span>}
                  {name(b.bidderId)} <span className="muted">· {w.byId[b.bidderId]?.city || ""}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="mono">{i === 0 ? money(l.price) : "≤ " + money(b.max)}</span>
                  {i === 0 && d.status !== "sold" && (
                    <>
                      <button className="btn sm primary" onClick={() => acceptOffer(d.id)}>Accept</button>
                      <button className="btn sm ghost" onClick={() => toast("Declined — bidder notified")}>Decline</button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="ai-note">Buyers see this listing with a minimum offer of {money(min)}.</div>
        )}
      </div>
    );

  return (
    <div className="d-sec">
      <h4>{a ? "Auction" : "Offers"}{a && <> · <span className="auct">{endsIn(d.id)}</span></>}</h4>
      {stats(
        <div className="stat">
          <b style={{ fontSize: 16, lineHeight: 1.5 }} className={st === "leading" ? "status-lead" : st === "outbid" ? "status-out" : ""}>
            {st === "leading" ? "You lead" : st === "outbid" ? "Outbid" : "—"}
          </b>
          <span>your status</span>
        </div>,
      )}
      {a && <div style={{ fontSize: 12, marginTop: 8 }}>{reserve} · ends {endsAt(a.endsAt)} · soft close +{a.softCloseMin} min</div>}
      {d.status !== "sold" && (
        <>
          <form
            className="offer-form"
            onSubmit={(e) => {
              e.preventDefault();
              placeOffer(d.id, amt, max);
            }}
          >
            <div>
              <label htmlFor="ofAmt">Offer</label>
              <input id="ofAmt" type="number" step={500} min={min} value={amt} onChange={(e) => setAmt(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ofMax">Max (proxy)</label>
              <input id="ofMax" type="number" step={500} placeholder={money(min * 1.2)} value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
            <button className="btn primary" type="submit">{l ? "Raise" : "Offer"}</button>
          </form>
          <div className="ai-note">Proxy bidding: we bid only as much as needed to keep you ahead, up to your max. You&apos;re notified the moment you&apos;re outbid.</div>
        </>
      )}
      {l && (
        <div style={{ marginTop: 10 }}>
          {l.bidders.slice(0, 4).map((b, i) => (
            <div key={b.bidderId} className="row" style={{ fontSize: 12 }}>
              <span>
                {i === 0 && <span className="status-lead">● </span>}
                {b.bidderId === ME ? "You" : name(b.bidderId)}
              </span>
              <span className="mono muted">{i === 0 ? money(l.price) : "≤ " + money(b.max)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
