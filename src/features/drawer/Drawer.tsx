"use client";

import { fmtDate, money } from "@/lib/format";
import { km } from "@/lib/geo";
import { buyersFor, domainsFor } from "@/lib/matching";
import { isPerson, type CompanyItem, type DomainItem, type EventItem, type Item, type PersonItem } from "@/lib/types";
import { profilePath, xIntent } from "@/lib/profile";
import { ME } from "@/lib/world";
import { useApp, useWorld } from "@/store/app-store";
import { Av, TierChip } from "@/features/common/ui";
import { useGo } from "@/features/common/nav";
import { OfferSection } from "./OfferSection";

/** Details drawer for the selected item: opened by a click, closed with ✕, Esc or a click on empty map. */
export function Drawer({ item }: { item: Item }) {
  return (
    <div className="drawer" role="dialog" aria-label={`${item.label} details`}>
      {isPerson(item) ? (
        <PersonDrawer i={item} />
      ) : item.kind === "company" ? (
        <CompanyDrawer i={item} />
      ) : item.kind === "domain" ? (
        <DomainDrawer i={item} />
      ) : (
        <EventDrawer i={item} />
      )}
    </div>
  );
}

function HeadTools({ id, label }: { id: string; label: string }) {
  const closeDrawer = useApp((s) => s.closeDrawer);
  const toggleWatch = useApp((s) => s.toggleWatch);
  const watched = useApp((s) => !!s.watch[id]);
  return (
    <span className="tools">
      <button
        type="button"
        className={`x star ${watched ? "on" : ""}`}
        onClick={() => toggleWatch(id)}
        aria-pressed={watched}
        aria-label={watched ? `Stop watching ${label}` : `Watch ${label}`}
        title={watched ? "Watching — click to stop" : "Watch: alerts on offers, price changes and sales"}
      >
        {watched ? "★" : "☆"}
      </button>
      <button type="button" className="x" onClick={closeDrawer} aria-label="Close">
        ✕
      </button>
    </span>
  );
}

function Nearby({ i }: { i: Item }) {
  const w = useWorld();
  const select = useApp((s) => s.select);
  const n = w.items
    .filter((o) => o.id !== i.id && o.kind !== "domain" && o.kind !== "event" && km(i, o) < 600)
    .sort((a, b) => km(i, a) - km(i, b))
    .slice(0, 4);
  if (!n.length) return <>No members within 600 km.</>;
  return (
    <>
      {n.map((o) => (
        <button key={o.id} className="lnk block" onClick={() => select(o.id, true)}>
          {o.label}{" "}
          <span className="muted">
            · {o.kind}, {Math.round(km(i, o))} km
          </span>
        </button>
      ))}
    </>
  );
}

function PersonDrawer({ i }: { i: PersonItem }) {
  const w = useWorld();
  const { select, addLead } = useApp.getState();
  const listed = w.domains.filter((d) => d.ownerId === i.id);
  const dns = i.tier === "dns" || i.tier === "attested";
  return (
    <>
      <div className="d-head" style={{ gridTemplateColumns: "52px 1fr auto" }}>
        <span className={`apin ${i.kind}`} style={{ gridRow: "1/4", gridColumn: 1, width: 52, height: 52, alignSelf: "start" }}>
          <Av i={i} />
        </span>
        <div className="kicker flex flex-wrap items-center gap-1.5" style={{ gridColumn: 2 }}>
          {i.kind}
          {i.sponsored ? " · sponsored" : ""} <TierChip i={i} />
          {i.rank <= 10 && <span className="tag fill">Top 10</span>}
          {i.id === ME && <span className="tag" style={{ padding: "0 6px", fontSize: 10 }}>you</span>}
        </div>
        <HeadTools id={i.id} label={i.label} />
        <div className="d-title" style={{ gridColumn: "2/4" }}>{i.name}</div>
        <div className="d-sub" style={{ gridColumn: "2/4" }}>
          {i.org ? i.org + " · " : ""}
          {i.loc}
          {i.xHandle && (
            <>
              {" · "}
              <a href={`https://x.com/${i.xHandle}`} target="_blank" rel="noopener noreferrer">
                @{i.xHandle}
              </a>
            </>
          )}
        </div>
        <div className="d-sub flex gap-3" style={{ gridColumn: "2/4" }}>
          <a href={profilePath(i)} target="_blank" rel="noopener">Public profile ↗</a>
          <a
            href={xIntent(
              i.id === ME ? `I'm #${i.rank} on Domainers Map — see my names and make an offer` : `${i.name} on Domainers Map — #${i.rank}, ${i.points} pts`,
              (typeof window !== "undefined" ? window.location.origin : "") + profilePath(i),
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on X
          </a>
        </div>
      </div>
      <div className="d-body">
        <div className="d-sec">
          <div className="stats">
            <div className="stat"><b style={{ color: "var(--accent)" }}>{i.points}</b><span>reputation · rank #{i.rank}</span></div>
            <div className="stat"><b>{i.portfolio ? i.portfolio.toLocaleString() : "—"}</b><span>domains held</span></div>
            <div className="stat"><b>{i.deals12m}</b><span>deals, 12 mo</span></div>
          </div>
        </div>
        <div className="d-sec">
          <h4>Verification</h4>
          <div className="chips">
            <span className={`tier ${i.tier ? "tx" : ""}`}>X {i.xHandle ? "✓" : "—"}</span>
            <span className={`tier ${dns ? "dns" : ""}`}>DNS {dns ? "✓" : "—"}</span>
            <span className={`tier ${i.tier === "attested" ? "attested" : ""}`}>Attested {i.tier === "attested" ? "✓" : "—"}</span>
          </div>
          <div className="ai-note">X links the handle; DNS proves ownership of listed domains; Attested means a counterparty confirmed a completed deal.</div>
        </div>
        <div className="d-sec">
          <h4>Focus</h4>
          <div className="chips">
            {i.focus.map((f) => <span key={f} className="tag">{f}</span>)}
            {i.tlds.map((t) => <span key={t} className="tag mono">{t}</span>)}
          </div>
        </div>
        <div className="d-sec">
          <h4>{i.kind === "broker" ? "Represented inventory" : "Listed inventory"} · {listed.length}</h4>
          {listed.length ? (
            listed.map((d) => (
              <div key={d.id} className="row">
                <button className="lnk mono" onClick={() => select(d.id)}>{d.name}</button>
                <span className="mono muted" style={{ fontSize: 12 }}>
                  {d.status === "make-offer" ? "Make offer" : d.status === "sold" ? "Sold" : money(d.askingUSD)}
                </span>
              </div>
            ))
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>No public listings.</div>
          )}
        </div>
        <div className="d-sec">
          <h4>Nearby</h4>
          <div className="muted" style={{ fontSize: 13 }}><Nearby i={i} /></div>
        </div>
      </div>
      <div className="d-actions">
        <button className="btn primary" onClick={() => addLead(i.id)} disabled={i.id === ME}>Add to leads</button>
        <button className="btn" disabled title="Messaging ships after auth">Message</button>
      </div>
    </>
  );
}

function CompanyDrawer({ i }: { i: CompanyItem }) {
  const w = useWorld();
  const go = useGo();
  const { select, addLead } = useApp.getState();
  const fits = domainsFor(i, w.domains).slice(0, 4);
  return (
    <>
      <div className="d-head">
        <div className="kicker">company · {i.stage}</div>
        <HeadTools id={i.id} label={i.label} />
        <div className="d-title">{i.name}</div>
        <div className="d-sub">{i.industry} · {i.loc}</div>
      </div>
      <div className="d-body">
        <div className="d-sec">
          <div className="stats">
            <div className="stat"><b>{i.employees}</b><span>employees</span></div>
            <div className="stat"><b>{i.fundingUSD ? money(i.fundingUSD) : "—"}</b><span>raised</span></div>
            <div className="stat"><b className="mono" style={{ fontSize: 14, lineHeight: 1.7 }}>{i.currentDomain}</b><span>current domain</span></div>
          </div>
        </div>
        <div className="d-sec">
          <h4>Wants</h4>
          <div className="chips">{i.wants.map((x) => <span key={x} className="tag accent mono">{x}</span>)}</div>
        </div>
        <div className="d-sec">
          <h4>Inventory that fits</h4>
          {fits.map((f) => (
            <div key={f.d.id} className="match">
              <button className="lnk n mono" style={{ fontSize: 14, fontFamily: "var(--mono)", fontWeight: 400 }} onClick={() => select(f.d.id)}>
                {f.d.name}
              </button>
              <div className="s">{f.score}</div>
              <div className="why">{f.why} · {f.d.status === "make-offer" ? "make offer" : money(f.d.askingUSD)}</div>
              <div className="bar"><i style={{ width: f.score + "%" }} /></div>
            </div>
          ))}
          <div className="ai-note">Scores are heuristic in this prototype. Production uses the embedding + rules matcher described in the plan.</div>
        </div>
      </div>
      <div className="d-actions">
        <button className="btn primary" onClick={() => addLead(i.id)}>Add to leads</button>
        <button className="btn" onClick={() => go("matches")}>Open in Matches</button>
      </div>
    </>
  );
}

function DomainDrawer({ i }: { i: DomainItem }) {
  const w = useWorld();
  const go = useGo();
  const { select, addLead, toast, set } = useApp.getState();
  const buyers = buyersFor(i, w.companies).slice(0, 5);
  const own = i.ownerId === ME;
  const findBuyers = () => {
    set("pickedDomain", i.id);
    go("matches");
  };
  return (
    <>
      <div className="d-head">
        <div className="kicker">domain · {i.category}{own ? " · yours" : ""}</div>
        <HeadTools id={i.id} label={i.label} />
        <div className="d-title mono">{i.name}</div>
        <div className="d-sub">
          held by{" "}
          <button className="lnk" style={{ color: "var(--accent)" }} onClick={() => select(i.owner.id)}>
            {own ? "you" : i.owner.name}
          </button>{" "}
          · {i.loc}
        </div>
      </div>
      <div className="d-body">
        <div className="d-sec">
          <div className="stats">
            <div className="stat"><b>{i.status === "make-offer" ? "Offer" : i.status === "sold" ? "Sold" : money(i.askingUSD)}</b><span>asking</span></div>
            <div className="stat"><b>{buyers.filter((b) => b.score >= 50).length}</b><span>strong buyers</span></div>
            <div className="stat"><b className="mono" style={{ fontSize: 18 }}>{i.tld}</b><span>extension</span></div>
          </div>
        </div>
        <OfferSection key={i.id} d={i} />
        <div className="d-sec">
          <h4>Likely end-user buyers</h4>
          {buyers.map((b) => (
            <div key={b.c.id} className="match">
              <div className="n">
                {b.c.name}{" "}
                <span className="muted" style={{ fontFamily: "var(--body)", fontSize: 12, fontWeight: 400 }}>
                  {b.c.city} · {b.c.industry}
                </span>
              </div>
              <div className="s">{b.score}</div>
              <div className="why">{b.why}</div>
              <div className="bar"><i style={{ width: b.score + "%" }} /></div>
              <div style={{ gridColumn: "1/-1", marginTop: 6, display: "flex", gap: 6 }}>
                <button className="btn sm ghost" onClick={() => addLead(b.c.id, i.id)}>+ Lead</button>
                <button className="btn sm ghost" onClick={() => select(b.c.id, true)}>Show on map</button>
              </div>
            </div>
          ))}
          <div className="ai-note">Ranked on wish-list match, brand-name match, keyword overlap and budget signal.</div>
        </div>
      </div>
      <div className="d-actions">
        {own ? (
          <>
            <button className="btn primary" onClick={() => toast("Listing editor ships with inventory CRUD")}>Edit listing</button>
            <button className="btn" onClick={findBuyers}>Find buyers</button>
          </>
        ) : (
          <>
            <button className="btn primary" onClick={() => addLead(buyers[0].c.id, i.id)}>Lead: {buyers[0].c.name}</button>
            <button className="btn" onClick={findBuyers}>All matches</button>
          </>
        )}
      </div>
    </>
  );
}

function EventDrawer({ i }: { i: EventItem }) {
  const toast = useApp((s) => s.toast);
  return (
    <>
      <div className="d-head">
        <div className="kicker">{i.kind}</div>
        <HeadTools id={i.id} label={i.label} />
        <div className="d-title">{i.name}</div>
        <div className="d-sub">{fmtDate(i.date)} · {i.loc}</div>
      </div>
      <div className="d-body">
        <div className="d-sec">
          <h4>Members nearby</h4>
          <div className="muted" style={{ fontSize: 13 }}><Nearby i={i} /></div>
        </div>
        <div className="d-sec">
          <h4>Format</h4>
          <span className="tag">{i.sub}</span>
        </div>
      </div>
      <div className="d-actions">
        <button className="btn primary" onClick={() => toast("RSVP recorded locally")}>I&apos;m attending</button>
      </div>
    </>
  );
}
