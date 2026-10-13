"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { fmtDate, money } from "@/lib/format";
import { flag } from "@/lib/geo";
import { offersOf, priceLabel } from "@/lib/offers";
import { isPerson, type Item } from "@/lib/types";
import { useApp, useWorld } from "@/store/app-store";
import { Av, TierChip } from "@/features/common/ui";

const W = 270;

/** Small preview shown while hovering a pin or a result card. Click opens the full drawer. */
export function HoverCard({ host }: { host: React.RefObject<HTMLElement | null> }) {
  const w = useWorld();
  const hover = useApp((s) => s.hover);
  const selectedId = useApp((s) => s.selectedId);
  const offers = useApp((s) => s.offers);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const item = hover && hover.id !== selectedId ? w.byId[hover.id] : null;

  // Place beside the anchor, flipping left / clamping vertically to stay inside the Explore view.
  useLayoutEffect(() => {
    if (!hover || !host.current || !ref.current) return setPos(null);
    const box = host.current.getBoundingClientRect();
    const h = ref.current.offsetHeight || 120;
    const x = hover.x - box.left;
    const y = hover.y - box.top;
    let left = x + 14;
    if (left + W > box.width - 12) left = x - W - 50;
    const top = Math.min(Math.max(8, y - 24), box.height - h - 12);
    setPos({ left: Math.max(8, left), top });
  }, [hover, host, item]);

  if (!item) return null;
  return (
    <div ref={ref} className="hcard" role="tooltip" style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden" }}>
      <HoverBody i={item} offersCount={item.kind === "domain" ? offersOf(item.id, offers).length : 0} price={item.kind === "domain" ? priceLabel(item, offers) : ""} />
      <div className="hint">Click to open</div>
    </div>
  );
}

function HoverBody({ i, offersCount, price }: { i: Item; offersCount: number; price: string }) {
  const w = useWorld();
  if (isPerson(i)) {
    const listed = w.domains.filter((d) => d.ownerId === i.id && d.status !== "sold").length;
    return (
      <>
        <div className="hd">
          <span className={`apin ${i.kind}`} style={{ width: 40, height: 40, boxShadow: "none" }}>
            <Av i={i} />
          </span>
          <div className="min-w-0">
            <div className="nm">
              {i.name} <TierChip i={i} />
            </div>
            <div className="sub">
              {i.xHandle ? "@" + i.xHandle + " · " : ""}
              {flag(i.country)} {i.city}
            </div>
          </div>
        </div>
        <div className="bio">
          <span className="text-accent">★</span> {i.focus.join(" · ")}
          {i.org ? " — " + i.org : ""}
        </div>
        <div className="ft">
          <span>
            {i.kind} · {listed} listed · {i.deals12m} deals
          </span>
          <b>
            #{i.rank} · {i.points} pts
          </b>
        </div>
      </>
    );
  }
  if (i.kind === "company")
    return (
      <>
        <div className="hd">
          <span className="pin company mx-auto" style={{ width: 14, height: 14 }} />
          <div className="min-w-0">
            <div className="nm">{i.name}</div>
            <div className="sub">
              {i.currentDomain} · {flag(i.country)} {i.city}
            </div>
          </div>
        </div>
        <div className="bio">
          {i.industry} · {i.stage} · wants {i.wants.map((x, k) => <span key={x} className="mono">{k ? ", " : ""}{x}</span>)}
        </div>
        <div className="ft">
          <span>{i.employees} employees</span>
          <b>{i.fundingUSD ? money(i.fundingUSD) : "—"}</b>
        </div>
      </>
    );
  if (i.kind === "event")
    return (
      <>
        <div className="hd">
          <span className="pin event mx-auto" style={{ width: 12, height: 12 }} />
          <div className="min-w-0">
            <div className="nm">{i.name}</div>
            <div className="sub">
              {fmtDate(i.date)} · {flag(i.country)} {i.city}
            </div>
          </div>
        </div>
        <div className="ft">
          <span>{i.sub}</span>
        </div>
      </>
    );
  return (
    <>
      <div className="hd">
        <span className="pin mx-auto" style={{ width: 12, height: 12 }} />
        <div className="min-w-0">
          <div className="nm mono" style={{ fontSize: 15, fontWeight: 400 }}>{i.name}</div>
          <div className="sub">
            {i.category} · held by {i.owner.name}
          </div>
        </div>
      </div>
      <div className="ft">
        <span>{offersCount} offer{offersCount === 1 ? "" : "s"}</span>
        <b>{price}</b>
      </div>
    </>
  );
}
