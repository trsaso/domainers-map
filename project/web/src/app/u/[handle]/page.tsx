import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNTRY, flag } from "@/lib/geo";
import { money } from "@/lib/format";
import { auctionOf, endsIn, leading } from "@/lib/offers";
import { findProfile, handleOf, profilePath, siteUrl, xIntent } from "@/lib/profile";
import { DB } from "@/lib/world";
import { Av, TierChip } from "@/features/common/ui";

type Params = { params: Promise<{ handle: string }>; searchParams: Promise<{ invite?: string }> };

export function generateStaticParams() {
  return DB.people.map((p) => ({ handle: handleOf(p) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = findProfile((await params).handle);
  if (!found) return { title: "Not found · Domainers Map" };
  const { p, w } = found;
  const listed = w.domains.filter((d) => d.ownerId === p.id && d.status !== "sold");
  const title = `${p.name}${p.xHandle ? ` (@${p.xHandle})` : ""} · Domainers Map`;
  const description = `#${p.rank} domainer · ${p.points} points · ${listed.length} names listed${listed.length ? ` incl. ${listed.slice(0, 3).map((d) => d.name).join(", ")}` : ""}. ${p.focus.join(", ")}.`;
  return {
    title,
    description,
    alternates: { canonical: profilePath(p) },
    openGraph: { type: "profile", title, description, url: profilePath(p), siteName: "Domainers Map" },
    twitter: { card: "summary_large_image", title, description, creator: p.xHandle ? `@${p.xHandle}` : undefined },
  };
}

export default async function PublicProfile({ params, searchParams }: Params) {
  const found = findProfile((await params).handle);
  if (!found) notFound();
  const { invite } = await searchParams;
  const { p, w } = found;
  const listed = w.domains.filter((d) => d.ownerId === p.id);
  const dns = p.tier === "dns" || p.tier === "attested";
  const url = siteUrl() + profilePath(p);

  return (
    <div className="h-screen overflow-y-auto">
      <header className="top" style={{ position: "sticky", top: 0 }}>
        <Link href="/" className="brand text-text no-underline hover:text-text">
          <i />
          <span>Domainers Map</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <a className="btn sm" href={xIntent(`${p.name} on Domainers Map — #${p.rank} domainer`, url)} target="_blank" rel="noopener noreferrer">
            Share on X
          </a>
          <Link className="btn sm primary" href={`/explore?open=${p.id}`}>Open on the map</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-4 pb-16 pt-8 sm:px-8">
        {invite && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent bg-[rgba(194,141,65,.08)] px-4 py-3 text-[13px]">
            <span>
              <b className="font-heading text-base">{p.xHandle ? "@" + p.xHandle : p.name}</b> invited you to Domainers Map — the map of
              domain investors, brokers and the companies that buy names.
            </span>
            <Link className="btn sm primary" href="/explore">Explore the map →</Link>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-6">
          <span className={`apin ${p.kind}`} style={{ width: 112, height: 112, borderWidth: 3 }}>
            <Av i={p} className="av !text-[40px]" />
            <span className="rk" style={{ fontSize: 12, bottom: -11 }}>#{p.rank}</span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="kicker">
              {p.type} · {flag(p.country)} {p.city}, {COUNTRY[p.country]}
            </div>
            <h1 className="mt-1 text-[48px]">{p.name}</h1>
            <div className="muted mt-1 flex flex-wrap items-center gap-2 text-sm">
              {p.org && <span>{p.org}</span>}
              {p.xHandle && (
                <a href={`https://x.com/${p.xHandle}`} target="_blank" rel="noopener noreferrer">@{p.xHandle}</a>
              )}
              <TierChip i={p} />
              {p.rank <= 10 && <span className="tag fill">Top 10</span>}
            </div>
          </div>
        </div>

        <div className="card-box mt-8">
          <div className="stats" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="stat"><b style={{ color: "var(--accent)" }}>{p.points}</b><span>points · rank #{p.rank} of {w.people.length}</span></div>
            <div className="stat"><b>{listed.filter((d) => d.status !== "sold").length}</b><span>names listed</span></div>
            <div className="stat"><b>{p.portfolio ? p.portfolio.toLocaleString() : "—"}</b><span>domains held</span></div>
            <div className="stat"><b>{p.deals12m}</b><span>deals, 12 mo</span></div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_260px]">
          <div>
            <h4 className="kicker mb-3">{p.type === "broker" ? "Represented inventory" : "Listed inventory"} · {listed.length}</h4>
            {listed.length ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
                {listed.map((d) => {
                  const l = leading(d.id, {});
                  return (
                    <Link key={d.id} href={`/explore?open=${d.id}`} className="rcard p-4 text-text no-underline hover:text-text">
                      <div className="k">
                        <b>{d.category}</b>
                        {auctionOf(d.id) && <span className="auct">{endsIn(d.id)}</span>}
                      </div>
                      <div className="t mono" style={{ fontSize: 17, gridColumn: "1/-1" }}>{d.name}</div>
                      <div className="m mt-2 justify-between">
                        <span>{d.status === "sold" ? "Sold" : d.status === "make-offer" ? "Make offer" : "Buy now / offer"}</span>
                        <span className="mono text-text">{d.status === "sold" ? "—" : l ? money(l.price) + " bid" : d.status === "make-offer" ? "—" : money(d.askingUSD)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="muted text-[13px]">No public listings.</div>
            )}
          </div>
          <aside>
            <h4 className="kicker mb-3">Verification</h4>
            <div className="chips">
              <span className={`tier ${p.tier ? "tx" : ""}`}>X {p.xHandle ? "✓" : "—"}</span>
              <span className={`tier ${dns ? "dns" : ""}`}>DNS {dns ? "✓" : "—"}</span>
              <span className={`tier ${p.tier === "attested" ? "attested" : ""}`}>Attested {p.tier === "attested" ? "✓" : "—"}</span>
            </div>
            <h4 className="kicker mb-3 mt-6">Focus</h4>
            <div className="chips">
              {p.focus.map((f) => <span key={f} className="tag">{f}</span>)}
              {p.tlds.map((t) => <span key={t} className="tag mono">{t}</span>)}
            </div>
            <p className="ai-note mt-6">
              Points come from verification, listings, offers, attested deals and activity — never from payment.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
