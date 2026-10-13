import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { COUNTRY } from "./geo";
import { initials, money } from "./format";
import { findProfile, handleOf } from "./profile";

/** 1200×630 share card for a member's public profile (Open Graph + X summary_large_image). */
export const CARD_SIZE = { width: 1200, height: 630 };

const font = (pkg: string, file: string) => readFile(path.join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

/** Best effort: embed the X avatar if it can be fetched quickly at build time, else initials. */
async function avatarData(url?: string) {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

const C = { bg: "#1b1917", surface: "#242120", text: "#efe9e1", muted: "rgba(239,233,225,.62)", faint: "rgba(239,233,225,.4)", accent: "#c28d41", hi: "#e1ad66" };
const TIER = { x: "X verified", dns: "DNS verified", attested: "Attested" } as const;

export async function renderShareCard(handle: string) {
  const [h400, h600, body] = await Promise.all([
    font("cormorant-garamond", "cormorant-garamond-latin-400-normal.woff"),
    font("cormorant-garamond", "cormorant-garamond-latin-600-normal.woff"),
    font("lora", "lora-latin-400-normal.woff"),
  ]);
  const found = await findProfile(handle);
  const fonts = [
    { name: "Cormorant", data: h400, weight: 400 as const },
    { name: "Cormorant", data: h600, weight: 600 as const },
    { name: "Lora", data: body, weight: 400 as const },
  ];
  if (!found) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.bg, color: C.text, alignItems: "center", justifyContent: "center", fontFamily: "Cormorant", fontSize: 72 }}>
        Domainers Map
      </div>,
      { ...CARD_SIZE, fonts },
    );
  }
  const { p, w } = found;
  const listed = w.domains.filter((d) => d.ownerId === p.id && d.status !== "sold").sort((a, b) => b.askingUSD - a.askingUSD);
  const avatar = await avatarData(p.avatar);
  const stat = (v: string | number, l: string, gold = false) => (
    <div style={{ display: "flex", flexDirection: "column", marginRight: 56 }}>
      <div style={{ display: "flex", fontFamily: "Cormorant", fontSize: 64, lineHeight: 1, color: gold ? C.accent : C.text }}>{v}</div>
      <div style={{ display: "flex", fontFamily: "Lora", fontSize: 20, color: C.muted, marginTop: 6 }}>{l}</div>
    </div>
  );

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: C.bg, color: C.text, padding: 28 }}>
      <div style={{ display: "flex", flex: 1, border: `1px solid rgba(194,141,65,.45)`, borderRadius: 14, padding: "44px 56px", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", fontFamily: "Cormorant", fontWeight: 600, fontSize: 30 }}>
          <div style={{ display: "flex", width: 18, height: 18, borderRadius: 9, border: `2.5px solid ${C.accent}`, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: C.accent }} />
          </div>
          Domainers Map
          <div style={{ display: "flex", marginLeft: "auto", fontFamily: "Lora", fontSize: 18, letterSpacing: 3, color: C.accent }}>{p.rank <= 10 ? "TOP 10 DOMAINER" : "DOMAINER PROFILE"}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 46 }}>
          <div style={{ display: "flex", position: "relative", width: 210, height: 210, marginRight: 52 }}>
            <div style={{ display: "flex", width: 210, height: 210, borderRadius: 105, border: `5px solid ${C.accent}`, background: "#2d2b2b", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "Cormorant", fontWeight: 600, fontSize: 84, color: C.hi }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {avatar ? <img src={avatar} width={200} height={200} style={{ objectFit: "cover" }} alt="" /> : initials(p.name)}
            </div>
            <div style={{ display: "flex", position: "absolute", bottom: -16, left: 66, background: C.accent, color: C.bg, borderRadius: 20, padding: "4px 18px", fontSize: 26, fontFamily: "Lora" }}>{`#${p.rank}`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontFamily: "Lora", fontSize: 20, letterSpacing: 3, color: C.accent }}>
              {`${p.type.toUpperCase()} · ${p.city.toUpperCase()}, ${(COUNTRY[p.country] ?? p.country).toUpperCase()}`}
            </div>
            <div style={{ display: "flex", fontFamily: "Cormorant", fontWeight: 600, fontSize: 92, lineHeight: 1.02, marginTop: 6 }}>{p.name}</div>
            <div style={{ display: "flex", alignItems: "center", fontFamily: "Lora", fontSize: 24, color: C.muted, marginTop: 8 }}>
              {p.xHandle ? `@${p.xHandle}` : p.org || ""}
              {p.tier && (
                <div style={{ display: "flex", marginLeft: 16, fontSize: 17, letterSpacing: 2, padding: "3px 10px", borderRadius: 3, border: `1px solid ${p.tier === "x" ? "rgba(239,233,225,.35)" : C.accent}`, background: p.tier === "attested" ? C.accent : "transparent", color: p.tier === "attested" ? C.bg : p.tier === "dns" ? C.accent : C.text }}>
                  {TIER[p.tier].toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 34 }}>
          {stat(p.points, "points", true)}
          {stat(listed.length, "names listed")}
          {stat(p.deals12m, "deals, 12 mo")}
          {stat(p.portfolio ? p.portfolio.toLocaleString("en-US") : "—", "domains held")}
        </div>

        <div style={{ display: "flex", marginTop: "auto", alignItems: "center" }}>
          {listed.slice(0, 3).map((d) => (
            <div key={d.id} style={{ display: "flex", marginRight: 12, padding: "6px 14px", border: `1px solid ${C.accent}`, borderRadius: 4, fontFamily: "Lora", fontSize: 22, color: C.text }}>
              {d.name}
              <span style={{ color: C.muted, marginLeft: 10 }}>{d.status === "make-offer" ? "offers" : money(d.askingUSD)}</span>
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto", fontFamily: "Lora", fontSize: 20, color: C.faint }}>{`/u/${handleOf(p)}`}</div>
        </div>
      </div>
    </div>,
    { ...CARD_SIZE, fonts },
  );
}
