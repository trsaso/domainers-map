import type { Region } from "./types";

export const REGION: Record<string, Region> = {
  NL: "Europe", US: "Americas", CA: "Americas", BR: "Americas", MX: "Americas", NO: "Europe", DE: "Europe", GB: "Europe",
  PT: "Europe", SE: "Europe", CH: "Europe", IE: "Europe", PL: "Europe", FR: "Europe", IN: "APAC", JP: "APAC", SG: "APAC",
  AU: "APAC", KR: "APAC", NG: "MEA", KE: "MEA", AE: "MEA",
};

export const COUNTRY: Record<string, string> = {
  NL: "Netherlands", US: "United States", CA: "Canada", BR: "Brazil", MX: "Mexico", NO: "Norway", DE: "Germany",
  GB: "United Kingdom", PT: "Portugal", SE: "Sweden", CH: "Switzerland", IE: "Ireland", PL: "Poland", FR: "France",
  IN: "India", JP: "Japan", SG: "Singapore", AU: "Australia", KR: "South Korea", NG: "Nigeria", KE: "Kenya", AE: "UAE",
};

/** ISO 3166 numeric codes, matching world-atlas feature ids. */
export const ISO: Record<string, string> = {
  NL: "528", US: "840", CA: "124", BR: "076", MX: "484", NO: "578", DE: "276", GB: "826", PT: "620", SE: "752",
  CH: "756", IE: "372", PL: "616", FR: "250", IN: "356", JP: "392", SG: "702", AU: "036", KR: "410", NG: "566",
  KE: "404", AE: "784",
};
export const codeForIso = (iso: string) => Object.keys(ISO).find((k) => ISO[k] === iso);

export const REGIONS: { r: Region; title?: string }[] = [
  { r: "Americas" },
  { r: "Europe" },
  { r: "MEA", title: "Middle East & Africa" },
  { r: "APAC", title: "Asia-Pacific" },
];

export const flag = (cc?: string) =>
  cc ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "";

type LatLng = { lat: number; lng: number };
export function km(a: LatLng, b: LatLng) {
  const R = 6371;
  const dl = ((b.lat - a.lat) * Math.PI) / 180;
  const dg = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dl / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Web-Mercator world pixels at a 256px-tile zoom level. The clustering and label-collision
 * rules were tuned on that scale, so the map converts its own zoom into it (see map/zoom.ts).
 */
export function project(lat: number, lng: number, z: number) {
  const s = 256 * 2 ** z;
  const phi = (Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180;
  return { x: (s * (lng + 180)) / 360, y: (s * (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI)) / 2 };
}
export function unproject(x: number, y: number, z: number) {
  const s = 256 * 2 ** z;
  const lng = (x / s) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / s;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}
