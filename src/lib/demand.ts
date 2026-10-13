import { COUNTRY } from "./geo";
import { scoreCompany } from "./matching";
import type { CompanyItem, DomainItem } from "./types";

/**
 * Buyer demand for a slice of inventory (a category or an extension): each company is weighted
 * by its best match score against the live names in that slice. Feeds the map heatmap layer.
 */
export type DemandMode = "category" | "tld";
export interface DemandQuery {
  mode: DemandMode;
  key: string;
}
export interface DemandPoint {
  company: CompanyItem;
  score: number;
  best: DomainItem;
}

export const MIN_DEMAND_SCORE = 30;

export function demandOptions(domains: DomainItem[], mode: DemandMode) {
  const c: Record<string, number> = {};
  domains
    .filter((d) => d.status !== "sold")
    .forEach((d) => {
      const k = mode === "category" ? d.category : d.tld;
      c[k] = (c[k] || 0) + 1;
    });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

export function demandPoints(q: DemandQuery, companies: CompanyItem[], domains: DomainItem[]): DemandPoint[] {
  const slice = domains.filter((d) => d.status !== "sold" && (q.mode === "category" ? d.category === q.key : d.tld === q.key));
  if (!slice.length) return [];
  return companies
    .map((company) => {
      const scored = slice.map((d) => ({ d, s: scoreCompany(d, company).score })).sort((a, b) => b.s - a.s)[0];
      return { company, score: scored.s, best: scored.d };
    })
    .filter((p) => p.score >= MIN_DEMAND_SCORE)
    .sort((a, b) => b.score - a.score);
}

export function demandByCountry(points: DemandPoint[]) {
  const by: Record<string, { code: string; name: string; score: number; n: number }> = {};
  points.forEach((p) => {
    const c = p.company.country;
    by[c] = by[c] || { code: c, name: COUNTRY[c] ?? c, score: 0, n: 0 };
    by[c].score += p.score;
    by[c].n += 1;
  });
  return Object.values(by).sort((a, b) => b.score - a.score);
}
