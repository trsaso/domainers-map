"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { auctionOf, endsIn, increment, serverStat } from "@/lib/offers";
import { acceptOffer, loadOffersFor, placeOffer, type OwnerOffer } from "@/lib/remote";
import type { DomainItem } from "@/lib/types";
import { ME } from "@/lib/world";
import { useApp } from "@/store/app-store";
import { SignInButton } from "@/features/auth/AccountMenu";

const endsAt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Offers and bids on a member's listing. Everything is decided on the server (supabase/migrations/0002_offers.sql). */
export function ServerOfferSection({ d }: { d: DomainItem }) {
  useApp((s) => s.remoteRev);
  const session = useApp((s) => s.session);
  const { refreshRemote, toast } = useApp.getState();
  const st = serverStat(d.id);
  const a = auctionOf(d.id);
  const own = !!ME && d.ownerId === ME;
  const ended = !!a && new Date(a.endsAt).getTime() <= Date.now();
  const min = st ? (st.i_lead ? st.price : st.price + increment(st.price)) : (d.minOfferUSD ?? (d.saleType === "buy_now" ? Math.round((d.askingUSD * 0.5) / 500) * 500 : 100));
  const [amt, setAmt] = useState(String(min));
  const [max, setMax] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [book, setBook] = useState<OwnerOffer[] | null>(null);

  useEffect(() => {
    setAmt(String(min));
    setMax("");
  }, [min]);
  useEffect(() => {
    if (own) loadOffersFor(d.id).then(setBook).catch(() => setBook([]));
  }, [own, d.id, st?.offers]);

  async function offer(amount: number, maxUsd: number | null) {
    setErr("");
    setBusy(true);
    try {
      const r = await placeOffer(d.id, amount, maxUsd);
      await refreshRemote();
      toast(r.i_lead ? `You lead ${d.name} at ${money(r.price)}` : `Outbid instantly — the high bid is now ${money(r.price)}. Raise your max.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const stats = (third: React.ReactNode) => (
    <div className="stats">
      <div className="stat"><b>{st ? money(st.price) : "—"}</b><span>{st ? "current high" : "no offers yet"}</span></div>
      <div className="stat"><b>{st?.bidders ?? 0}</b><span>bidder{st?.bidders === 1 ? "" : "s"}</span></div>
      {third}
    </div>
  );
  const auctionLine = a && (
    <div className="mt-2 text-xs">
      <span className="muted">{a.reserve ? (st && st.price >= a.reserve ? "Reserve met" : "Reserve not met") : "No reserve"}</span> · {ended ? "ended" : "ends"} {endsAt(a.endsAt)} · soft close +{a.softCloseMin} min
    </div>
  );
  const heading = (
    <h4>
      {a ? "Auction" : "Offers"}
      {a && <> · <span className="auct">{endsIn(d.id)}</span></>}
    </h4>
  );

  if (d.status === "sold")
    return (
      <div className="d-sec">
        {heading}
        {stats(<div className="stat"><b style={{ fontSize: 16, lineHeight: 1.5 }} className="status-lead">Sold</b><span>status</span></div>)}
      </div>
    );

  if (own)
    return (
      <div className="d-sec">
        <h4>Offers received{a && <> · <span className="auct">{endsIn(d.id)}</span></>}</h4>
        {stats(<div className="stat"><b>{d.saleType === "buy_now" ? money(d.askingUSD) : "—"}</b><span>{d.saleType === "buy_now" ? "your price" : "no price set"}</span></div>)}
        {auctionLine}
        {book?.length ? (
          <div className="mt-2.5">
            {book.slice(0, 6).map((o, k) => (
              <div key={o.id} className="row text-xs">
                <span>
                  {k === 0 && <span className="status-lead">● </span>}
                  {o.bidder?.name ?? "Member"} <span className="muted">@{o.bidder?.handle} · {new Date(o.created_at).toLocaleDateString("en-GB")}</span>
                </span>
                <span className="mono">{money(o.amount_usd)}</span>
              </div>
            ))}
            <button
              className="btn sm primary mt-2.5"
              disabled={busy || (!!a && !ended)}
              title={a && !ended ? "Auctions can be accepted when they end" : undefined}
              onClick={async () => {
                setBusy(true);
                setErr("");
                try {
                  const r = await acceptOffer(d.id);
                  await refreshRemote();
                  toast(`Accepted ${money(r.price)} for ${d.name}. The buyer has been notified.`);
                } catch (e) {
                  setErr((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Accept high offer {st ? `· ${money(st.price)}` : ""}
            </button>
          </div>
        ) : (
          <div className="ai-note">Everyone can see this listing and make offers. You&apos;re notified of each one.</div>
        )}
        {err && <div className="form-error mt-2 text-xs">{err}</div>}
      </div>
    );

  const status = st?.i_lead ? "You lead" : st?.my_max ? "Outbid" : "—";
  return (
    <div className="d-sec">
      {heading}
      {stats(
        <div className="stat">
          <b style={{ fontSize: 16, lineHeight: 1.5 }} className={st?.i_lead ? "status-lead" : st?.my_max ? "status-out" : ""}>{status}</b>
          <span>{st?.my_max ? `your max ${money(st.my_max)}` : "your status"}</span>
        </div>,
      )}
      {auctionLine}
      {ended ? (
        <div className="ai-note">This auction has ended.</div>
      ) : !session ? (
        <div className="mt-3 flex flex-col gap-2">
          <SignInButton className="btn primary" label="Sign in with X to make an offer" />
          <div className="ai-note">Anyone can browse. Offers and bids need a profile so sellers know who they&apos;re dealing with.</div>
        </div>
      ) : (
        <>
          {d.saleType === "buy_now" && !st?.i_lead && (
            <button className="btn primary mt-3 w-full" disabled={busy} onClick={() => offer(d.askingUSD, null)}>
              Buy now · offer {money(d.askingUSD)}
            </button>
          )}
          <form
            className="offer-form"
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(amt, 10);
              const m = parseInt(max, 10);
              offer(n, Number.isFinite(m) ? m : null);
            }}
          >
            <div>
              <label htmlFor="sOfAmt">{a ? "Bid" : "Offer"}</label>
              <input id="sOfAmt" type="number" step={100} min={min} value={amt} onChange={(e) => setAmt(e.target.value)} />
            </div>
            <div>
              <label htmlFor="sOfMax">Max (proxy)</label>
              <input id="sOfMax" type="number" step={100} placeholder={money(Math.round(min * 1.2))} value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
            <button className="btn primary" type="submit" disabled={busy}>{st?.my_max ? "Raise" : a ? "Bid" : "Offer"}</button>
          </form>
          {err && <div className="form-error mt-2 text-xs" role="alert">{err}</div>}
          <div className="ai-note">
            Proxy bidding: we bid only as much as needed to keep you ahead, up to your max. Your max stays private, and you&apos;re notified the moment you&apos;re outbid.
            {d.saleType === "buy_now" && " Buy now sends an offer at the asking price; the seller confirms it."}
          </div>
        </>
      )}
    </div>
  );
}
