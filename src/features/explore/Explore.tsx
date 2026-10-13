"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { mapController } from "@/lib/map-controller";
import { useApp, useWorld } from "@/store/app-store";
import { Seg } from "@/features/common/ui";
import { Drawer } from "@/features/drawer/Drawer";
import { demandOptions, demandPoints, type DemandQuery } from "@/lib/demand";
import { DemandPanel } from "./DemandPanel";
import { filterItems } from "./filter";
import { ListView } from "./ListView";
import type { MapViewState } from "./MapView";
import { Sidebar } from "./Sidebar";

// MapLibre touches window/WebGL at import time — client only.
const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), { ssr: false });

export function Explore({ active }: { active: boolean }) {
  const w = useWorld();
  const F = useApp((s) => s.filters);
  const layout = useApp((s) => s.layout);
  const drawer = useApp((s) => s.drawer);
  const plan = useApp((s) => s.plan);
  const mode = useApp((s) => s.mode);
  const sideOpen = useApp((s) => s.sideOpen);
  const selectedId = useApp((s) => s.selectedId);
  const previewId = useApp((s) => s.previewId);
  const set = useApp((s) => s.set);
  const closeDrawer = useApp((s) => s.closeDrawer);
  const [view, setView] = useState<MapViewState | null>(null);
  const [streets, setStreets] = useState(false);
  const [demandQ, setDemandQ] = useState<DemandQuery | null>(null);
  const demand = useMemo(() => (demandQ ? demandPoints(demandQ, w.companies, w.domains) : null), [demandQ, w.companies, w.domains]);

  const list = useMemo(() => filterItems(w.items, F, view?.bounds ?? null), [w.items, F, view]);
  const selected = selectedId ? w.byId[selectedId] ?? null : null;
  const shown = previewId ? w.byId[previewId] ?? null : selected;
  const countryView = (view?.z ?? 2) <= 3;

  useEffect(() => {
    if (active) requestAnimationFrame(() => mapController.activated());
  }, [active]);

  // Esc closes whatever the drawer is showing.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, closeDrawer]);

  return (
    <section
      className={`view explore ${active ? "on" : ""} layout-${layout} drawer-${drawer} ${selected ? "open" : ""} ${sideOpen ? "side-open" : ""}`}
      aria-hidden={!active}
    >
      <Sidebar list={list} />
      <div className="mapwrap">
        <MapView list={list} all={w.items} selected={selected} plan={plan} streets={streets} demand={demand} onView={setView} />
        <div className="maptools">
          <Seg value={mode} label="View mode" onChange={(v) => set("mode", v)} options={[["map", "Map"], ["list", "List"]]} />
          <span className="seg">
            <button aria-pressed={streets} title="OpenStreetMap street tiles" onClick={() => setStreets(!streets)}>
              Streets
            </button>
            <button
              aria-pressed={!!demandQ}
              title="Heatmap of where buyers for a category or extension are"
              onClick={() => setDemandQ(demandQ ? null : { mode: "category", key: demandOptions(w.domains, "category")[0]?.[0] ?? "" })}
            >
              Demand
            </button>
          </span>
        </div>
        {demandQ && demand && mode === "map" && !shown && <DemandPanel q={demandQ} points={demand} onChange={setDemandQ} />}
        {!(countryView && !selected) && mode === "map" && (
          <div className="legend">
            <span><i className="pin" />Investor</span>
            <span><i className="pin broker" />Broker</span>
            <span><i className="pin company" />Company</span>
            <span><i className="pin event" />Event</span>
            <span>
              <span className="cluster" style={{ height: 16, fontSize: 9, padding: "0 5px", boxShadow: "none" }}>+N</span>more
            </span>
          </div>
        )}
        <button className="btn mob-toggle" onClick={() => set("sideOpen", true)}>
          Show list
        </button>
        <ListView list={list} on={mode === "list"} />
        {shown && <Drawer item={shown} preview={shown.id !== selectedId} />}
      </div>
    </section>
  );
}
