import type { Filters } from "@/store/app-store";
import type { Item } from "@/lib/types";

export interface Bounds {
  west: number;
  east: number;
  south: number;
  north: number;
}

/** Longitude test that survives world copies (bounds can run past ±180 when the map is panned across the antimeridian). */
function inBounds(b: Bounds, lat: number, lng: number) {
  if (lat < b.south || lat > b.north) return false;
  if (b.east - b.west >= 360) return true;
  return [lng, lng + 360, lng - 360].some((x) => x >= b.west && x <= b.east);
}

const activity = (i: Item) => ("deals12m" in i ? i.deals12m : "employees" in i ? i.employees / 4 : 0) || 0;

export function filterItems(items: Item[], F: Filters, bounds: Bounds | null): Item[] {
  const l = items.filter((i) => {
    if (F.type !== "all" && i.kind !== F.type) return false;
    if (F.tlds.length && !(i.tlds || []).some((t) => F.tlds.includes(t))) return false;
    if (F.regions.length && !F.regions.includes(i.region)) return false;
    if (F.verified && (i.kind === "investor" || i.kind === "broker") && !i.verified) return false;
    if (F.viewport && bounds && !inBounds(bounds, i.lat, i.lng)) return false;
    if (F.q) {
      const extra =
        i.kind === "company" ? [i.industry, i.currentDomain] : i.kind === "investor" || i.kind === "broker" ? [i.org, ...i.focus] : [];
      const hay = [i.label, "sub" in i ? i.sub : "", i.loc, ...extra, ...(i.tlds || [])].join(" ").toLowerCase();
      if (!hay.includes(F.q)) return false;
    }
    return true;
  });
  const pts = (i: Item) => ("points" in i ? i.points : 0);
  const price = (i: Item) => (i.kind === "domain" ? i.askingUSD : 0);
  if (F.sort === "relevance") l.sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0) || activity(b) - activity(a));
  if (F.sort === "points") l.sort((a, b) => pts(b) - pts(a));
  if (F.sort === "deals") l.sort((a, b) => activity(b) - activity(a));
  if (F.sort === "price") l.sort((a, b) => price(b) - price(a));
  if (F.sort === "name") l.sort((a, b) => a.label.localeCompare(b.label));
  return l;
}

/** TLD chips offered in the sidebar, in the order they first appear in the data. */
export const TLD_CHIPS = [".com", ".ai", ".io", ".de", ".co.uk", ".africa", ".ae", ".jp"];

/** Whether hovering should open previews (mouse/trackpad, not touch). */
export const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
