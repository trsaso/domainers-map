"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/format";
import { serverStat } from "@/lib/offers";
import { deleteDomain, saveDomain, type DomainInput, type DomainRow, type ProfileRow, type SaleType } from "@/lib/remote";
import { DB } from "@/lib/world";
import { useApp } from "@/store/app-store";
import { PageHead, Seg } from "@/features/common/ui";
import { useOpenOnMap } from "@/features/common/nav";
import { AuthGate } from "@/features/auth/AuthGate";
import { Field } from "./ProfileView";

const SALE: [SaleType, string][] = [
  ["buy_now", "Buy now"],
  ["offer", "Make offer"],
  ["auction", "Auction"],
  ["unlisted", "Unlisted"],
];
const SALE_LABEL = Object.fromEntries(SALE) as Record<SaleType, string>;
const CATEGORIES = [...new Set([...DB.domains.map((d) => d.category), "Short", "Geo", "Crypto", "Other"])].sort();

export function MyDomainsView() {
  return (
    <AuthGate kicker="Portfolio" title="My domains" sub="Sign in with X to list your domains. Everyone can see listed names and make offers or bid.">
      {(p) => <MyDomains p={p} />}
    </AuthGate>
  );
}

type Editing = { mode: "add" } | { mode: "edit"; row: DomainRow } | { mode: "bulk" } | null;

function MyDomains({ p }: { p: ProfileRow }) {
  const rows = useApp((s) => s.myDomains);
  useApp((s) => s.remoteRev);
  const params = useSearchParams();
  const router = useRouter();
  const open = useOpenOnMap();
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<Record<string, string>>({});
  const { refreshRemote, toast } = useApp.getState();

  // Deep links: "+ List a domain" (?add=1) and "Edit listing" from a drawer (?edit=<id>).
  useEffect(() => {
    const edit = params.get("edit");
    if (params.get("add")) setEditing({ mode: "add" });
    else if (edit) {
      const row = rows.find((r) => r.id === edit);
      if (row) setEditing({ mode: "edit", row });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, rows.length]);

  const close = () => {
    setEditing(null);
    if (params.toString()) router.replace("/my-domains");
  };

  async function remove(r: DomainRow) {
    try {
      await deleteDomain(r.id, r.name);
      setConfirmDel(null);
      await refreshRemote();
      toast(`Removed ${r.name}`);
    } catch (e) {
      setRowErr({ ...rowErr, [r.id]: (e as Error).message });
      setConfirmDel(null);
    }
  }

  return (
    <section className="view on">
      <div className="pane-main solo">
        <PageHead
          kicker="Portfolio"
          title="My domains"
          sub="Listed names are visible to everyone on the map and in Domains. Only you can edit or remove them."
          action={
            !editing && (
              <span className="flex gap-2">
                <button className="btn" onClick={() => setEditing({ mode: "bulk" })}>Bulk add</button>
                <button className="btn primary" onClick={() => setEditing({ mode: "add" })}>+ Add domain</button>
              </span>
            )
          }
        />
        {!p.onboarded && (
          <div className="notice mb-5">
            Your listings are saved but won&apos;t appear on the map until you add your city.{" "}
            <a href="/profile">Finish your profile →</a>
          </div>
        )}

        {editing?.mode === "bulk" && <BulkAdd ownerId={p.id} onDone={close} />}
        {(editing?.mode === "add" || editing?.mode === "edit") && (
          <DomainForm key={editing.mode === "edit" ? editing.row.id : "new"} ownerId={p.id} row={editing.mode === "edit" ? editing.row : undefined} onDone={close} />
        )}

        {rows.length ? (
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Sale</th>
                <th>Price</th>
                <th>Offers</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = serverStat(r.id);
                return (
                  <tr key={r.id}>
                    <td className="mono text-sm">
                      {r.name}
                      <div className="muted font-body text-[11px]">{r.category}</div>
                      {rowErr[r.id] && <div className="form-error font-body text-xs">{rowErr[r.id]}</div>}
                    </td>
                    <td>
                      {SALE_LABEL[r.sale_type]}
                      {r.sale_type === "auction" && r.auction_ends_at && (
                        <div className="muted text-[11px]">ends {new Date(r.auction_ends_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      )}
                    </td>
                    <td className="mono">
                      {r.sale_type === "buy_now" && r.price_usd ? money(r.price_usd) : r.min_offer_usd ? `min ${money(r.min_offer_usd)}` : "—"}
                    </td>
                    <td className="num">{st ? `${st.offers} · high ${money(st.price)}` : <span className="muted">none</span>}</td>
                    <td>
                      {r.status === "sold" ? (
                        <span className="tag fill">Sold</span>
                      ) : r.verified_at ? (
                        <span className="tier dns">DNS verified</span>
                      ) : (
                        <span className="tag" title="DNS ownership check arrives next">Unverified</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {confirmDel === r.id ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-out">Delete {r.name}?</span>
                          <button className="btn sm" onClick={() => remove(r)}>Delete</button>
                          <button className="btn sm ghost" onClick={() => setConfirmDel(null)}>Keep</button>
                        </span>
                      ) : (
                        <span className="flex gap-1">
                          {r.sale_type !== "unlisted" && p.onboarded && (
                            <button className="btn sm ghost" onClick={() => open(r.id)}>Map</button>
                          )}
                          <button className="btn sm" onClick={() => setEditing({ mode: "edit", row: r })} disabled={r.status === "sold"}>
                            Edit
                          </button>
                          <button className="btn sm ghost text-muted" onClick={() => setConfirmDel(r.id)}>
                            Delete
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          !editing && <div className="empty">No domains yet. Add one, or paste a list with Bulk add.</div>
        )}
      </div>
    </section>
  );
}

const toLocalInput = (iso: string | null) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 7 * 864e5);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const num = (s: string) => {
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function DomainForm({ ownerId, row, onDone }: { ownerId: string; row?: DomainRow; onDone(): void }) {
  const { refreshRemote, toast } = useApp.getState();
  const [f, setF] = useState({
    name: row?.name ?? "",
    category: row?.category ?? "Brandable",
    keywords: row?.keywords.join(", ") ?? "",
    sale: (row?.sale_type ?? "offer") as SaleType,
    price: row?.price_usd ? String(row.price_usd) : "",
    min: row?.min_offer_usd ? String(row.min_offer_usd) : "",
    ends: toLocalInput(row?.auction_ends_at ?? null),
    reserve: row?.reserve_usd ? String(row.reserve_usd) : "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const hasBids = row ? (serverStat(row.id)?.offers ?? 0) > 0 : false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const name = f.name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(name)) return setErr(`“${f.name}” isn't a valid domain name, e.g. example.com.`);
    if (f.sale === "buy_now" && !num(f.price)) return setErr("Buy now needs a price.");
    if (f.sale === "auction" && new Date(f.ends).getTime() < Date.now() + 36e5) return setErr("An auction should end at least an hour from now.");
    const input: DomainInput = {
      name,
      category: f.category.trim() || "Other",
      keywords: f.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 12),
      sale_type: f.sale,
      price_usd: f.sale === "buy_now" ? num(f.price) : null,
      min_offer_usd: f.sale === "unlisted" ? null : num(f.min),
      auction_ends_at: f.sale === "auction" ? new Date(f.ends).toISOString() : null,
      reserve_usd: f.sale === "auction" ? num(f.reserve) : null,
    };
    setBusy(true);
    try {
      await saveDomain(ownerId, input, row?.id);
      await refreshRemote();
      toast(row ? `Saved ${name}` : `Listed ${name}`);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card-box form mb-6" onSubmit={submit}>
      <h4 className="kicker mb-3">{row ? `Edit ${row.name}` : "List a domain"}</h4>
      <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
        <Field label="Domain" id="df-name">
          <input id="df-name" className="mono" value={f.name} onChange={up("name")} placeholder="example.com" disabled={!!row} autoFocus={!row} required />
        </Field>
        <Field label="Category" id="df-cat">
          <input id="df-cat" list="df-cats" value={f.category} onChange={up("category")} maxLength={40} />
          <datalist id="df-cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <div className="md:col-span-2">
          <Field label="How you're selling it" id="df-sale">
            <Seg value={f.sale} label="Sale type" onChange={(v) => setF({ ...f, sale: v })} options={SALE} />
          </Field>
          <div className="muted mt-1.5 text-xs">
            {f.sale === "buy_now" && "A fixed price anyone can see. Buyers can still make offers."}
            {f.sale === "offer" && "No price shown. Buyers make offers; you accept the one you like."}
            {f.sale === "auction" && "Timed bidding with automatic proxy bids. A bid in the last minutes extends the auction by 5 minutes."}
            {f.sale === "unlisted" && "Kept in your portfolio but hidden from everyone else."}
            {hasBids && f.sale !== (row?.sale_type ?? f.sale) && " This domain already has offers — they stay attached."}
          </div>
        </div>
        {f.sale === "buy_now" && (
          <Field label="Price (USD)" id="df-price">
            <input id="df-price" className="mono" inputMode="numeric" value={f.price} onChange={up("price")} placeholder="25000" required />
          </Field>
        )}
        {f.sale === "auction" && (
          <>
            <Field label="Auction ends" id="df-ends">
              <input id="df-ends" type="datetime-local" value={f.ends} onChange={up("ends")} required />
            </Field>
            <Field label="Reserve (USD, optional)" id="df-reserve">
              <input id="df-reserve" className="mono" inputMode="numeric" value={f.reserve} onChange={up("reserve")} placeholder="Not shown to bidders" />
            </Field>
          </>
        )}
        {f.sale !== "unlisted" && (
          <Field label={f.sale === "auction" ? "Starting bid (USD, optional)" : "Minimum offer (USD, optional)"} id="df-min">
            <input id="df-min" className="mono" inputMode="numeric" value={f.min} onChange={up("min")} placeholder="e.g. 1000" />
          </Field>
        )}
        <Field label="Keywords — help the buyer matcher (optional)" id="df-kw">
          <input id="df-kw" value={f.keywords} onChange={up("keywords")} placeholder="grab, fast, delivery" />
        </Field>
      </div>
      {err && <div className="form-error mt-3" role="alert">{err}</div>}
      <div className="mt-5 flex gap-2">
        <button className="btn primary" disabled={busy}>{busy ? "Saving…" : row ? "Save changes" : "List domain"}</button>
        <button type="button" className="btn ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

/** Paste a list: one domain per line, optionally followed by a price ("grabify.com, 24000"). */
function BulkAdd({ ownerId, onDone }: { ownerId: string; onDone(): void }) {
  const { refreshRemote, toast } = useApp.getState();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ ok: string[]; failed: [string, string][] } | null>(null);
  const lines = useMemo(
    () =>
      text
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 200),
    [text],
  );

  async function run() {
    setBusy(true);
    const ok: string[] = [];
    const failed: [string, string][] = [];
    for (const line of lines) {
      const [rawName, rawPrice] = line.split(/[,;\t]| {2,}/).map((x) => x.trim());
      const name = rawName.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      const price = rawPrice ? num(rawPrice) : null;
      try {
        await saveDomain(ownerId, {
          name,
          category: "Other",
          keywords: [],
          sale_type: price ? "buy_now" : "offer",
          price_usd: price,
          min_offer_usd: null,
          auction_ends_at: null,
          reserve_usd: null,
        });
        ok.push(name);
      } catch (e) {
        failed.push([name, (e as Error).message]);
      }
    }
    setBusy(false);
    setReport({ ok, failed });
    await refreshRemote();
    toast(`Listed ${ok.length} of ${lines.length}`);
    if (!failed.length) onDone();
  }

  return (
    <div className="card-box form mb-6">
      <h4 className="kicker mb-1">Bulk add</h4>
      <p className="muted mb-3 text-[13px]">One domain per line. Add a price after a comma to list it as Buy now; otherwise it&apos;s Make offer. You can edit each one afterwards.</p>
      <div className="field">
        <label className="field-label" htmlFor="bulk">Domains ({lines.length})</label>
        <textarea id="bulk" className="mono" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={"grabify.com, 24000\ngrabbed.io\ngrabber.ai, 12000"} />
      </div>
      {report && report.failed.length > 0 && (
        <div className="mt-3 text-[13px]">
          <div className="status-lead">Listed {report.ok.length}.</div>
          {report.failed.map(([n, why]) => (
            <div key={n} className="form-error">
              <span className="mono">{n}</span>: {why}
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button className="btn primary" disabled={busy || !lines.length} onClick={run}>{busy ? "Listing…" : `List ${lines.length || ""} domains`}</button>
        <button className="btn ghost" onClick={onDone}>{report ? "Done" : "Cancel"}</button>
      </div>
    </div>
  );
}
