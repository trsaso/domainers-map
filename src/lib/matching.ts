import type { CompanyItem, Domain, DomainItem } from "./types";

/** Heuristic buyer matcher — production replaces this with the embedding + rules matcher in the plan. */
export function scoreCompany(d: Domain, c: CompanyItem) {
  let s = 0;
  const why: string[] = [];
  if (c.wants.includes(d.name)) {
    s += 55;
    why.push("on their wish list");
  }
  const sld = d.name.split(".")[0];
  if (c.name.toLowerCase().replace(/\s/g, "").includes(sld)) {
    s += 25;
    why.push("matches brand name");
  }
  const ov = d.keywords.filter((k) => c.keywords.includes(k));
  if (ov.length) {
    s += Math.min(ov.length * 12, 24);
    why.push("keyword overlap: " + ov.join(", "));
  }
  if (c.currentDomain.endsWith(".io") || c.currentDomain.includes("-") || c.currentDomain.split(".").length > 2) s += 6;
  if (c.fundingUSD > d.askingUSD * 20) s += 8;
  else if (c.fundingUSD && c.fundingUSD < d.askingUSD * 3) {
    s -= 10;
    why.push("budget stretch");
  }
  return { score: Math.max(4, Math.min(98, s)), why: why.length ? why.join(" · ") : "weak semantic fit" };
}

export const buyersFor = (d: Domain, companies: CompanyItem[]) =>
  companies.map((c) => ({ c, ...scoreCompany(d, c) })).sort((a, b) => b.score - a.score);

export const domainsFor = (c: CompanyItem, domains: DomainItem[]) =>
  domains
    .filter((d) => d.status !== "sold")
    .map((d) => ({ d, ...scoreCompany(d, c) }))
    .sort((a, b) => b.score - a.score);
