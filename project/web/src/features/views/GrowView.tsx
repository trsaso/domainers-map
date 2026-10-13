"use client";

import { COUNTRY } from "@/lib/geo";
import { GROW, TOP_N, isDone } from "@/lib/grow";
import type { Plan } from "@/lib/types";
import { profilePath, xIntent } from "@/lib/profile";
import { ME, tierOf } from "@/lib/world";
import { useApp, useWorld } from "@/store/app-store";
import { APin, Av, PageHead, TierChip } from "@/features/common/ui";

function Tile({ k, label, ok, note }: { k: "city" | "country" | "world"; label: string; ok: boolean; note: string }) {
  const me = useWorld().me;
  const size = k === "city" ? 40 : k === "country" ? 48 : 60;
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-lg border p-3.5 text-center"
      style={{ borderColor: ok ? "var(--accent)" : "var(--divider)", borderStyle: ok ? "solid" : "dashed" }}
    >
      <div className="hatch relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded">
        <span className="apin" style={{ width: size, height: size, ...(ok ? {} : { filter: "grayscale(1)", opacity: 0.6 }) }}>
          <Av i={me} />
        </span>
        <span className="absolute left-2 top-1.5 font-mono text-[10px] text-faint">
          {k === "city" ? "zoom ≥ 6" : k === "country" ? "zoom 4–5" : "zoom ≤ 3"}
        </span>
      </div>
      <div className="font-heading text-lg font-semibold">{label}</div>
      <div className="text-xs" style={{ color: ok ? "var(--accent-hi)" : "var(--muted)" }}>{note}</div>
    </div>
  );
}

function PlanCard({ id, name, price, perks, current, popular }: { id: Exclude<Plan, "free">; name: string; price: string; perks: React.ReactNode[]; current: Plan; popular?: boolean }) {
  const setPlan = useApp((s) => s.setPlan);
  const on = current === id;
  return (
    <div className="relative rounded border p-4" style={{ borderColor: popular || on ? "var(--accent)" : "var(--divider)" }}>
      {popular && <span className="kicker absolute right-3.5 top-4">Popular</span>}
      <div className="font-heading text-xl font-semibold">{name}</div>
      <div>
        <b className="font-heading text-[28px]">{price}</b> <span className="muted">/ month</span>
      </div>
      <ul className="mb-3.5 mt-2.5 pl-4 text-[13px] leading-[1.7] text-muted">
        {perks.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <button className={`btn w-full ${popular ? "primary" : ""}`} onClick={() => setPlan(on ? "free" : id)}>
        {on ? `Cancel ${name}` : `Get ${name}`}
      </button>
    </div>
  );
}

export function GrowView() {
  const w = useWorld();
  const actions = useApp((s) => s.actions);
  const plan = useApp((s) => s.plan);
  const offers = useApp((s) => s.offers);
  const leads = useApp((s) => s.leads);
  const { doAction, toast } = useApp.getState();
  const me = w.me;
  const ranked = [...w.people].sort((a, b) => b.points - a.points);
  const top20 = ranked[Math.min(TOP_N - 1, ranked.length - 1)];
  const above = ranked[me.rank - 2];
  const toTop = Math.max(0, top20.points - me.points + 1);
  const done = GROW.filter((a) => isDone(a, actions));
  const next = GROW.find((a) => !isDone(a, actions));
  const tier = tierOf(me, plan);
  const invites = Object.keys(actions).filter((k) => k.startsWith("inv")).length;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}${profilePath(me)}?invite=1`;
  const madeOffers = Object.values(offers).flat().filter((o) => o.bidderId === ME).length;
  const won = leads.filter((l) => l.stage === "Won").length;

  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead kicker="Grow" title="Your spot on the map" />
        <div className="mb-[18px] mt-1.5 flex items-center gap-3.5">
          <APin p={me} size={56} style={{ boxShadow: undefined }} />
          <div>
            <div className="font-heading text-[22px] font-semibold">
              {me.name} <TierChip i={me} />
            </div>
            <div className="muted">
              #{me.rank} of {w.people.length} domainers · {me.points} points{me.xHandle ? " · @" + me.xHandle : ""}
            </div>
          </div>
        </div>
        {next && (
          <button className="btn mb-[18px] w-full justify-between border-surface2 bg-surface2 px-4 py-3" onClick={() => doAction(next.id)}>
            <span>
              <span className="text-accent">Next:</span> {next.t} · +{next.pts}
            </span>
            <span>›</span>
          </button>
        )}
        <div className="card-box mb-[18px]">
          <div className="grid grid-cols-3 gap-3">
            <Tile k="city" label={me.city} ok note="✓ always visible" />
            <Tile k="country" label={COUNTRY[me.country]} ok={tier !== "city"} note={tier !== "city" ? "You’re here" : `${Math.max(0, 40 - me.points)} points away · or Country plan`} />
            <Tile k="world" label="Worldwide" ok={tier === "world"} note={tier === "world" ? "You’re here" : `${toTop} points away · or World plan`} />
          </div>
          <div className="mt-4 text-[13px]">
            <b className="font-heading text-lg">{me.points} points</b> · {toTop ? `${toTop} more to reach the top ${TOP_N}` : `you’re in the top ${TOP_N}`}
          </div>
          <div className="bar my-2" style={{ height: 6 }}>
            <i style={{ width: Math.min(100, Math.round((me.points / top20.points) * 100)) + "%" }} />
          </div>
          <div className="muted text-xs">{above ? `${above.points - me.points} points behind ${above.name} for #${me.rank - 1}` : "You lead the board"}</div>
        </div>
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
          <div className="card-box">
            <h4 className="kicker mb-2.5">Your link</h4>
            <div className="flex gap-2">
              <input className="mono h-9 flex-1 rounded border border-divider bg-transparent px-2.5 text-[13px]" readOnly value={link} aria-label="Invite link" />
              <button className="btn" onClick={() => { navigator.clipboard?.writeText(link); toast("Copied"); }}>Copy</button>
            </div>
            <a
              className="btn primary mt-2.5 w-full no-underline"
              href={xIntent(`I'm #${me.rank} on Domainers Map — domainers, brokers and the companies that buy names. Join me:`, link)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Post it on X
            </a>
            <a className="btn ghost mt-1 w-full" href={profilePath(me)} target="_blank" rel="noopener">
              View your public profile ↗
            </a>
            <div className="ai-note">+50 for every domainer who joins from it · {invites} so far</div>
          </div>
          <div className="card-box">
            <h4 className="kicker mb-2.5">Your impact</h4>
            <div className="stats">
              <div className="stat"><b>{invites}</b><span>domainers joined via you</span></div>
              <div className="stat"><b>{madeOffers}</b><span>offers made</span></div>
              <div className="stat"><b>{won}</b><span>deals attested</span></div>
            </div>
            <div className="chips mt-3">
              {([
                ["Verified", !!me.tier],
                ["Recruiter", invites > 0],
                ["Host", !!actions.meetup],
                ["Connector", !!actions.say_hi],
                ["Dealmaker", won > 0],
                ["Reviewer", !!actions.review],
              ] as const).map(([r, on]) => (
                <span key={r} className={`tag ${on ? "accent" : ""}`}>{on ? "✓ " : ""}{r}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-[18px] rounded-lg border border-divider px-[18px] py-1">
          <h4 className="kicker mb-1 mt-3.5">Grow on the map</h4>
          {GROW.map((a) => {
            const d = isDone(a, actions);
            return (
              <div key={a.id} className="row py-[11px]">
                <div>
                  <div className="font-heading text-[17px] font-semibold">
                    {a.t} {a.isNew && !d && <span className="tag fill px-[5px] py-0 text-[9px]">NEW</span>}
                  </div>
                  <div className="muted text-xs">{a.s}</div>
                </div>
                <div className="whitespace-nowrap text-right">
                  {d ? (
                    <span className="status-lead">✓</span>
                  ) : (
                    <>
                      <div className="num text-[13px]">+{a.pts}</div>
                      <button className="btn sm ghost" onClick={() => doAction(a.id)}>{a.action}</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div className="muted py-3 text-xs">
            <span className="status-lead">✓</span> {done.length} done · {me.points} points
          </div>
        </div>
        <div className="mt-[18px] rounded-lg border border-accent-deep p-[18px]">
          <h4 className="kicker mb-1">Get more out of Domainers Map</h4>
          <div className="muted mb-3.5 text-[13px]">Stay visible whatever your rank, and get the extras. Your points and rank are never for sale.</div>
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            <PlanCard id="country" name="Country" price="$4" current={plan} perks={[`Your face across ${COUNTRY[me.country]}, whatever your rank`, "Profile refreshed from X every week", "Keeps the map free for everyone"]} />
            <PlanCard
              id="world"
              name="World"
              price="$12"
              current={plan}
              popular
              perks={[
                "The biggest pin and your name, worldwide",
                "Followed backlinks to your domain landers",
                "Profile refreshed from X every day",
                "Buyer matches for your whole portfolio",
                <>Who viewed your profile <span className="tag px-[5px] py-0 text-[9px]">soon</span></>,
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
