export const money = (n: number) =>
  n >= 1e6
    ? "$" + (n / 1e6).toFixed(n % 1e6 ? 2 : 0).replace(/\.?0+$/, "") + "M"
    : n >= 1e3
      ? "$" + Math.round(n / 1e3) + "k"
      : "$" + n;

export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** For the few places that build marker HTML strings for the map. */
export const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const today = () => new Date().toISOString().slice(0, 10);
