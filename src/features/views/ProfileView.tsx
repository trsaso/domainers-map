"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { COUNTRY_CODES } from "@/lib/geo";
import { profilePath } from "@/lib/profile";
import { updateProfile, type ProfileRow } from "@/lib/remote";
import { useApp } from "@/store/app-store";
import { Av, Seg } from "@/features/common/ui";
import { AuthGate } from "@/features/auth/AuthGate";

const LocationPicker = dynamic(() => import("@/features/profile/LocationPicker").then((m) => m.LocationPicker), { ssr: false });

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function ProfileView() {
  return (
    <AuthGate kicker="Profile" title="Your profile" sub="Sign in with X to create your Domainers Map profile.">
      {(p) => <ProfileForm p={p} />}
    </AuthGate>
  );
}

function ProfileForm({ p }: { p: ProfileRow }) {
  const router = useRouter();
  const welcome = useSearchParams().get("welcome") === "1" || !p.onboarded;
  const { refreshRemote, toast, select } = useApp.getState();
  const [f, setF] = useState({
    name: p.name,
    kind: p.kind,
    org: p.org,
    bio: p.bio,
    focus: p.focus.join(", "),
    tlds: p.tlds.join(", "),
    portfolio: String(p.portfolio_size || ""),
    country: p.country ?? "",
    city: p.city ?? "",
    lat: p.lat,
    lng: p.lng,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const countries = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {}
    return COUNTRY_CODES.map((c) => [c, names?.of(c) ?? c] as const).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!f.name.trim()) return setErr("Add your name.");
    if (!f.country || !f.city.trim()) return setErr("Add your city and country so domainers near you can find you.");
    if (f.lat == null || f.lng == null) return setErr("Click the map to place your pin (your city is enough).");
    setBusy(true);
    try {
      await updateProfile(p.id, {
        name: f.name.trim(),
        kind: f.kind,
        org: f.org.trim(),
        bio: f.bio.trim(),
        focus: list(f.focus).slice(0, 6),
        tlds: list(f.tlds)
          .map((t) => (t.startsWith(".") ? t : "." + t).toLowerCase())
          .slice(0, 10),
        portfolio_size: Math.max(0, Math.min(1000000, parseInt(f.portfolio || "0", 10) || 0)),
        country: f.country,
        city: f.city.trim(),
        lat: f.lat,
        lng: f.lng,
        onboarded: true,
      });
      await refreshRemote();
      toast(welcome ? "You're on the map" : "Profile saved");
      if (welcome) {
        router.push("/explore");
        select(p.id, true);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="view on">
      <form className="pane-main solo form" onSubmit={save}>
        <div className="kicker">{welcome ? "Welcome" : "Profile"}</div>
        <h2>{welcome ? "Put yourself on the map" : "Your profile"}</h2>
        <p className="lead-sub">
          {welcome
            ? "Your name and picture come from X. Add where you're based and what you deal in, and your pin appears for everyone."
            : "This is what other domainers see on the map and on your public page."}
        </p>

        <div className="mb-6 flex items-center gap-3.5">
          <span className="apin" style={{ width: 56, height: 56 }}>
            <Av i={{ label: f.name || p.handle, avatar: p.avatar_url ?? undefined }} />
          </span>
          <div>
            <div className="font-heading text-[22px] font-semibold">{f.name || p.handle}</div>
            <div className="muted text-sm">
              @{p.handle} · <span className="tier tx">X verified</span>{" "}
              <a href={profilePath({ id: p.id, xHandle: p.handle })} target="_blank" rel="noopener">
                Public page ↗
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <Field label="Name" id="pf-name">
            <input id="pf-name" value={f.name} onChange={up("name")} maxLength={80} required />
          </Field>
          <Field label="I am a" id="pf-kind">
            <Seg value={f.kind} label="Member type" onChange={(v) => setF({ ...f, kind: v })} options={[["investor", "Domain investor"], ["broker", "Broker"]]} />
          </Field>
          <Field label="Country" id="pf-country">
            <select id="pf-country" value={f.country} onChange={up("country")} required>
              <option value="">Choose…</option>
              {countries.map(([c, n]) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="City" id="pf-city">
            <input id="pf-city" value={f.city} onChange={up("city")} maxLength={80} placeholder="e.g. Skopje" required />
          </Field>
          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="field-label">Your pin — click the map (your city is enough)</span>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() =>
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => setF((x) => ({ ...x, lat: +pos.coords.latitude.toFixed(2), lng: +pos.coords.longitude.toFixed(2) })),
                    () => toast("Couldn't get your location — click the map instead"),
                  )
                }
              >
                Use my location
              </button>
            </div>
            <LocationPicker lat={f.lat} lng={f.lng} onPick={(lat, lng) => setF((x) => ({ ...x, lat, lng }))} />
            <div className="muted mt-1 text-xs">{f.lat != null ? `Pin at ${f.lat}, ${f.lng}` : "No pin yet"}</div>
          </div>
          <Field label="Company (optional)" id="pf-org">
            <input id="pf-org" value={f.org} onChange={up("org")} maxLength={80} />
          </Field>
          <Field label="Domains you hold (approx.)" id="pf-portfolio">
            <input id="pf-portfolio" inputMode="numeric" value={f.portfolio} onChange={up("portfolio")} placeholder="e.g. 120" />
          </Field>
          <Field label="Focus — comma separated" id="pf-focus">
            <input id="pf-focus" value={f.focus} onChange={up("focus")} placeholder="brandable .com, AI names" />
          </Field>
          <Field label="Extensions — comma separated" id="pf-tlds">
            <input id="pf-tlds" value={f.tlds} onChange={up("tlds")} placeholder=".com, .ai, .io" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Short bio (optional)" id="pf-bio">
              <textarea id="pf-bio" value={f.bio} onChange={up("bio")} maxLength={280} rows={3} />
            </Field>
          </div>
        </div>

        {err && <div className="form-error mt-4" role="alert">{err}</div>}
        <div className="mt-6 flex gap-2">
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving…" : welcome ? "Save and go to the map" : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
