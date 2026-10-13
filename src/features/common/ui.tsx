"use client";

import { useState, type ReactNode } from "react";
import { initials } from "@/lib/format";
import type { Item, PersonItem, Tier } from "@/lib/types";

export const TIER: Record<Tier, string> = { x: "X verified", dns: "DNS verified", attested: "Attested" };

export function TierChip({ i }: { i: { tier?: Tier | null } }) {
  if (!i.tier) return null;
  return <span className={`tier ${i.tier === "x" ? "tx" : i.tier}`}>{TIER[i.tier]}</span>;
}

/** Initials with the member's X avatar layered on top; the image removes itself if blocked. */
export function Av({ i, className = "av" }: { i: Pick<Item, "label"> & { avatar?: string }; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={className}>
      {initials(i.label)}
      {i.avatar && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={i.avatar}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

export function APin({ p, size, className = "", style }: { p: PersonItem; size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`apin ${p.kind} ${className}`} style={{ width: size, height: size, boxShadow: "none", ...style }}>
      <Av i={p} />
    </span>
  );
}

export function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SearchBox(props: React.InputHTMLAttributes<HTMLInputElement> & { wrapClass?: string }) {
  const { wrapClass, ...rest } = props;
  return (
    <div className={`search ${wrapClass ?? ""}`}>
      <SearchIcon />
      <input type="search" autoComplete="off" {...rest} />
    </div>
  );
}

export function Seg<T extends string>({
  value, options, onChange, label,
}: { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string }) {
  return (
    <span className="seg" role="group" aria-label={label}>
      {options.map(([v, t]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {t}
        </button>
      ))}
    </span>
  );
}

export function PageHead({ kicker, title, sub, action }: { kicker: string; title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  const head = (
    <div>
      <div className="kicker">{kicker}</div>
      <h2>{title}</h2>
      {sub && <p className="lead-sub">{sub}</p>}
    </div>
  );
  if (!action) return head;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      {head}
      {action}
    </div>
  );
}

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
