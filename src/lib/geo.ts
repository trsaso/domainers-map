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

/** ISO 3166 numeric codes (all countries), matching world-atlas feature ids. */
export const ISO: Record<string, string> = {
  AD: "020", AE: "784", AF: "004", AG: "028", AI: "660", AL: "008", AM: "051", AO: "024", AR: "032", AT: "040", AU: "036", AW: "533",
  AZ: "031", BA: "070", BB: "052", BD: "050", BE: "056", BF: "854", BG: "100", BH: "048", BI: "108", BJ: "204", BM: "060", BN: "096",
  BO: "068", BR: "076", BS: "044", BT: "064", BW: "072", BY: "112", BZ: "084", CA: "124", CD: "180", CF: "140", CG: "178", CH: "756",
  CI: "384", CL: "152", CM: "120", CN: "156", CO: "170", CR: "188", CU: "192", CV: "132", CY: "196", CZ: "203", DE: "276", DJ: "262",
  DK: "208", DM: "212", DO: "214", DZ: "012", EC: "218", EE: "233", EG: "818", ER: "232", ES: "724", ET: "231", FI: "246", FJ: "242",
  FM: "583", FR: "250", GA: "266", GB: "826", GD: "308", GE: "268", GH: "288", GM: "270", GN: "324", GQ: "226", GR: "300", GT: "320",
  GW: "624", GY: "328", HK: "344", HN: "340", HR: "191", HT: "332", HU: "348", ID: "360", IE: "372", IL: "376", IN: "356", IQ: "368",
  IR: "364", IS: "352", IT: "380", JM: "388", JO: "400", JP: "392", KE: "404", KG: "417", KH: "116", KI: "296", KM: "174", KN: "659",
  KR: "410", KW: "414", KY: "136", KZ: "398", LA: "418", LB: "422", LC: "662", LI: "438", LK: "144", LR: "430", LS: "426", LT: "440",
  LU: "442", LV: "428", LY: "434", MA: "504", MC: "492", MD: "498", ME: "499", MG: "450", MH: "584", MK: "807", ML: "466", MM: "104",
  MN: "496", MO: "446", MR: "478", MT: "470", MU: "480", MV: "462", MW: "454", MX: "484", MY: "458", MZ: "508", NA: "516", NE: "562",
  NG: "566", NI: "558", NL: "528", NO: "578", NP: "524", NR: "520", NZ: "554", OM: "512", PA: "591", PE: "604", PG: "598", PH: "608",
  PK: "586", PL: "616", PR: "630", PS: "275", PT: "620", PW: "585", PY: "600", QA: "634", RO: "642", RS: "688", RU: "643", RW: "646",
  SA: "682", SB: "090", SC: "690", SD: "729", SE: "752", SG: "702", SI: "705", SK: "703", SL: "694", SM: "674", SN: "686", SO: "706",
  SR: "740", SS: "728", ST: "678", SV: "222", SY: "760", SZ: "748", TD: "148", TG: "768", TH: "764", TJ: "762", TL: "626", TM: "795",
  TN: "788", TO: "776", TR: "792", TT: "780", TV: "798", TW: "158", TZ: "834", UA: "804", UG: "800", US: "840", UY: "858", UZ: "860",
  VA: "336", VC: "670", VE: "862", VN: "704", VU: "548", WS: "882", XK: "983", YE: "887", ZA: "710", ZM: "894", ZW: "716",
};
export const codeForIso = (iso: string) => Object.keys(ISO).find((k) => ISO[k] === iso);

export const REGIONS: { r: Region; title?: string }[] = [
  { r: "Americas" },
  { r: "Europe" },
  { r: "MEA", title: "Middle East & Africa" },
  { r: "APAC", title: "Asia-Pacific" },
];

/**
 * Members can live anywhere: fill in the name (via Intl) and a coarse region for countries the
 * sample data didn't cover, so filters and labels work for every member.
 */
export function ensureCountry(code: string, lng: number, lat: number) {
  if (!code || COUNTRY[code]) return;
  let name = code;
  try {
    name = new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {}
  COUNTRY[code] = name;
  REGION[code] = lng < -30 ? "Americas" : lng > 60 ? "APAC" : lat > 35 && lng < 45 ? "Europe" : "MEA";
}

/** Every ISO 3166-1 alpha-2 code, for the profile country picker. */
export const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW".split(" ");

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
