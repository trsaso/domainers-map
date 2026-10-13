"use client";

import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { COUNTRY, ISO, codeForIso, project, unproject } from "@/lib/geo";
import { esc, initials } from "@/lib/format";
import { mapController } from "@/lib/map-controller";
import type { Item, Plan, PersonItem } from "@/lib/types";
import { isPerson } from "@/lib/types";
import type { DemandPoint } from "@/lib/demand";
import { countryCenter, countryCounts, pinPx, pinSize, visibleAt } from "@/lib/world";
import { useApp } from "@/store/app-store";
import type { Bounds } from "./filter";
import { canHover } from "./filter";

/**
 * Zoom bookkeeping: MapLibre uses 512px tiles, the visibility tiers (≤3 worldwide, 4–5 country,
 * ≥6 city) and cluster cell sizes were specified on the 256px scale. LZ converts between them.
 */
const LZ = 1;
const lz = (m: maplibregl.Map) => m.getZoom() + LZ;

export interface MapViewState {
  bounds: Bounds;
  z: number;
}

interface Props {
  list: Item[];
  all: Item[];
  selected: Item | null;
  plan: Plan;
  streets: boolean;
  /** Buyer-demand heatmap points; null hides the layer. */
  demand: DemandPoint[] | null;
  onView(v: MapViewState): void;
}

const STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#15130f" } }],
};

function avatarHTML(i: PersonItem) {
  return `<span class="av">${esc(initials(i.label))}${
    i.avatar
      ? `<img src="${esc(i.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
      : ""
  }</span>`;
}

/**
 * Natural Earth rings that cross ±180° (Russia, Fiji) jump from 180 to -180 between vertices, which a
 * planar renderer draws as a band across the whole map. Keep each ring continuous instead.
 */
function unwrapAntimeridian(g: Geometry): Geometry {
  const ring = (r: number[][]) => {
    let prev: number | null = null;
    return r.map(([lng, lat]) => {
      let x = lng;
      if (prev !== null) while (x - prev > 180) x -= 360;
      if (prev !== null) while (x - prev < -180) x += 360;
      prev = x;
      return [x, lat];
    });
  };
  if (g.type === "Polygon") return { ...g, coordinates: g.coordinates.map(ring) };
  if (g.type === "MultiPolygon") return { ...g, coordinates: g.coordinates.map((p) => p.map(ring)) };
  return g;
}

export function MapView({ list, all, selected, plan, streets, demand, onView }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [zoomTick, setZoomTick] = useState(0);
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  // Latest props for map event handlers registered once.
  const live = useRef({ all, plan });
  live.current = { all, plan };

  /* ---- init ---- */
  useEffect(() => {
    const map = new maplibregl.Map({
      container: el.current!,
      style: STYLE,
      center: [10, 30],
      zoom: 2 - LZ,
      minZoom: 2 - LZ,
      maxZoom: 18 - LZ,
      attributionControl: { compact: false, customAttribution: "Natural Earth" },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    const report = () => {
      const b = map.getBounds();
      onViewRef.current({ bounds: { west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() }, z: lz(map) });
      setZoomTick((t) => t + 1);
    };
    map.on("moveend", report);

    map.on("load", async () => {
      const topo = (await import("world-atlas/countries-110m.json")).default as unknown as Topology;
      const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { iso?: string }>;
      fc.features = fc.features
        .filter((f) => f.id !== "010")
        .map((f) => ({ ...f, geometry: unwrapAntimeridian(f.geometry), properties: { ...f.properties, iso: String(f.id) } }));
      map.addSource("countries", { type: "geojson", data: fc });
      map.addLayer({ id: "countries-fill", type: "fill", source: "countries", paint: { "fill-color": "#242120" } });
      map.addLayer({ id: "countries-line", type: "line", source: "countries", paint: { "line-color": "rgba(239,233,225,.22)", "line-width": 0.6 } });
      setLoaded(true);
      report();
    });

    // Country click (country view) zooms in; a click on empty map closes a pinned drawer.
    map.on("click", (e) => {
      if (e.originalEvent.target !== map.getCanvas()) return;
      const f = map.getLayer("countries-fill") ? map.queryRenderedFeatures(e.point, { layers: ["countries-fill"] })[0] : undefined;
      const code = f ? codeForIso(String(f.properties?.iso)) : undefined;
      const { all } = live.current;
      if (code && lz(map) < 5 && countryCounts(all)[code]) {
        const [lat, lng] = countryCenter(all, code);
        map.flyTo({ center: [lng, lat], zoom: 5 - LZ, duration: 700 });
        return;
      }
      useApp.getState().closeDrawer();
    });

    // Keep the canvas sized to its grid cell (drawer open/close, layout switches, view changes).
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el.current!);

    mapController.register({
      camera: () => {
        const c = map.getCenter().wrap();
        return { lat: +c.lat.toFixed(4), lng: +c.lng.toFixed(4), zoom: +lz(map).toFixed(2) };
      },
      flyTo: (lat, lng, zoom) => map.flyTo({ center: [lng, lat], zoom: (zoom ?? lz(map)) - LZ, duration: 600 }),
      fitPoints: (pts, maxZoom) => {
        const b = new maplibregl.LngLatBounds();
        pts.forEach(([lat, lng]) => b.extend([lng, lat]));
        map.fitBounds(b, { padding: 80, maxZoom: maxZoom - LZ, duration: 600 });
      },
      zoom: () => lz(map),
      isVisible: () => !!el.current && el.current.offsetWidth > 0,
      resize: () => map.resize(),
    });

    return () => {
      ro.disconnect();
      mapController.register(null);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ---- OpenStreetMap tiles (opt-in) ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (streets && !map.getSource("osm")) {
      map.addSource("osm", {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© OpenStreetMap contributors",
      });
      // Inverted (brightness-min > max), desaturated and warmed to sit inside the dark theme.
      map.addLayer(
        {
          id: "osm",
          type: "raster",
          source: "osm",
          paint: { "raster-brightness-min": 0.68, "raster-brightness-max": 0, "raster-saturation": -0.7, "raster-contrast": -0.1, "raster-hue-rotate": 185 },
        },
        "countries-fill",
      );
    } else if (!streets && map.getSource("osm")) {
      map.removeLayer("osm");
      map.removeSource("osm");
    }
    map.setPaintProperty("countries-fill", "fill-opacity", streets ? 0.35 : 1);
  }, [streets, loaded]);

  /* ---- buyer-demand heatmap ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const data = {
      type: "FeatureCollection" as const,
      features: (demand ?? []).map((p) => ({
        type: "Feature" as const,
        properties: { score: p.score },
        geometry: { type: "Point" as const, coordinates: [p.company.lng, p.company.lat] },
      })),
    };
    const src = map.getSource("demand") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
    else {
      map.addSource("demand", { type: "geojson", data });
      map.addLayer({
        id: "demand",
        type: "heatmap",
        source: "demand",
        paint: {
          "heatmap-weight": ["/", ["get", "score"], 100],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 2.2, 9, 4],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 32, 4, 64, 9, 96],
          "heatmap-opacity": 0.9,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(194,141,65,0)",
            0.05, "rgba(194,141,65,.22)",
            0.3, "rgba(194,141,65,.55)",
            0.6, "rgba(225,173,102,.8)",
            1, "rgba(255,236,200,.95)",
          ],
        },
      });
    }
    map.setLayoutProperty("demand", "visibility", demand ? "visible" : "none");
  }, [demand, loaded]);

  /* ---- markers, clusters, country shading & labels ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const { select, hoverEnter, hoverLeave } = useApp.getState();
    const hover = canHover();
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    const z = lz(map);
    const countryView = z <= 3;
    const shade = countryView && !demand;
    const counts = countryCounts(all);
    const people = all.filter(isPerson);

    // Country shading by member density (country view only).
    const mx = Math.max(...Object.values(counts));
    const fill: unknown[] = ["match", ["get", "iso"]];
    const line: unknown[] = ["match", ["get", "iso"]];
    Object.entries(counts).forEach(([code, n]) => {
      fill.push(ISO[code], `rgba(194,141,65,${(0.12 + 0.5 * (n / mx)).toFixed(3)})`);
      line.push(ISO[code], "rgba(194,141,65,.55)");
    });
    fill.push("#242120");
    line.push("rgba(239,233,225,.22)");
    map.setPaintProperty("countries-fill", "fill-color", shade ? fill : "#242120");
    map.setPaintProperty("countries-line", "line-color", shade ? line : "rgba(239,233,225,.22)");
    map.setPaintProperty("countries-line", "line-width", shade ? 0.9 : 0.6);

    const add = (node: HTMLElement, lng: number, lat: number, z_: number) => {
      node.style.zIndex = String(z_);
      markers.current.push(new maplibregl.Marker({ element: node, anchor: "center" }).setLngLat([lng, lat]).addTo(map));
    };
    const node = (html: string, size: number | null, title: string) => {
      const d = document.createElement("div");
      d.className = "mk";
      d.innerHTML = html;
      d.title = title;
      if (size) {
        d.style.width = size + "px";
        d.style.height = size + "px";
      }
      return d;
    };

    // Country count labels for countries that have no worldwide pin of their own.
    if (countryView) {
      const visiblePeople = people.filter((i) => visibleAt(i, z, plan));
      const pinned = new Set(visiblePeople.map((i) => i.country));
      const cw = z <= 2.5 ? 110 : 70;
      const ch = z <= 2.5 ? 60 : 48;
      const cells: Record<string, { code: string; n: number; ll: [number, number]; p: { x: number; y: number } }[]> = {};
      Object.entries(counts)
        .filter(([code]) => !pinned.has(code))
        .forEach(([code, n]) => {
          const ll = countryCenter(all, code);
          const p = project(ll[0], ll[1], z);
          const k = Math.floor(p.x / cw) + "_" + Math.floor(p.y / ch);
          (cells[k] = cells[k] || []).push({ code, n, ll, p });
        });
      const groups = Object.values(cells);
      const avg = (g: typeof groups[number], f: (x: typeof g[number]) => number) => g.reduce((s, x) => s + f(x), 0) / g.length;
      for (let i = 0; i < groups.length; i++)
        for (let j = i + 1; j < groups.length; j++) {
          const a = groups[i], b = groups[j];
          if (!a.length || !b.length) continue;
          if (Math.abs(avg(a, (x) => x.p.x) - avg(b, (x) => x.p.x)) < cw * 0.9 && Math.abs(avg(a, (x) => x.p.y) - avg(b, (x) => x.p.y)) < ch * 0.9) {
            a.push(...b);
            b.length = 0;
          }
        }
      const pinPts = visiblePeople.map((i) => project(i.lat, i.lng, z));
      groups
        .filter((g) => g.length && g.length <= 4)
        .forEach((g) => {
          const n = g.reduce((s, x) => s + x.n, 0);
          let lat = avg(g, (x) => x.ll[0]);
          let lng = avg(g, (x) => x.ll[1]);
          // Push the label below any visible pin it would collide with.
          const pt = project(lat, lng, z);
          const near = pinPts.filter((q) => Math.abs(q.x - pt.x) < 84 && Math.abs(q.y - pt.y) < 64);
          if (near.length) ({ lat, lng } = unproject(pt.x, Math.max(...near.map((q) => q.y)) + 48, z));
          const d = node(`<span class="country-label"><b>${n}</b>${g.length === 1 ? g[0].code : `${g.length} countries`}</span>`, null, g.map((x) => COUNTRY[x.code]).join(", "));
          d.addEventListener("click", (e) => {
            e.stopPropagation();
            if (g.length === 1) map.flyTo({ center: [g[0].ll[1], g[0].ll[0]], zoom: 5 - LZ, duration: 700 });
            else mapController.run((m) => m.fitPoints(g.map((x) => x.ll), 5));
          });
          add(d, lng, lat, 500);
        });
    }

    // Pins and grid clusters (64px cells on the 256 scale) — domains ride on their holder's pin.
    const isSel = (i: Item) => !!selected && (selected.id === i.id || (selected.kind === "domain" && selected.ownerId === i.id));
    const vis = list.filter((i) => visibleAt(i, z, plan) || isSel(i));
    const cells: Record<string, Item[]> = {};
    vis
      .filter((i) => i.kind !== "domain")
      .forEach((i) => {
        const p = project(i.lat, i.lng, z);
        const k = Math.floor(p.x / 64) + "_" + Math.floor(p.y / 64);
        (cells[k] = cells[k] || []).push(i);
      });

    const wire = (d: HTMLElement, i: Item) => {
      d.addEventListener("click", (e) => {
        e.stopPropagation();
        select(i.id);
      });
      if (hover) {
        d.addEventListener("mouseenter", () => hoverEnter(i.id));
        d.addEventListener("mouseleave", () => hoverLeave());
      }
    };

    Object.values(cells).forEach((g) => {
      if (g.length === 1 || z >= 10) {
        g.forEach((i) => {
          const sel = isSel(i);
          if (isPerson(i)) {
            const cc = countryView ? counts[i.country] : 0;
            const html = `<span class="apin ${i.kind} ${pinSize(i)}${sel ? " sel" : ""}">${avatarHTML(i)}${
              cc > 1 ? `<span class="cluster" style="position:absolute;right:-14px;top:-8px;height:18px;font-size:10px;padding:0 6px">+${cc - 1}</span>` : ""
            }${i.rank <= 20 ? `<span class="rk">#${i.rank}</span>` : ""}</span>`;
            const d = node(html, pinPx(i), i.label);
            wire(d, i);
            add(d, i.lng, i.lat, sel ? 1000 : Math.round(i.points));
          } else {
            const d = node(`<span class="pin ${i.kind}${sel ? " sel" : ""}"></span>`, 12, i.label);
            wire(d, i);
            add(d, i.lng, i.lat, sel ? 1000 : 0);
          }
        });
        return;
      }
      const lat = g.reduce((a, i) => a + i.lat, 0) / g.length;
      const lng = g.reduce((a, i) => a + i.lng, 0) / g.length;
      const top = g.filter(isPerson).sort((a, b) => b.points - a.points)[0];
      const sz = top ? pinPx(top) : 24;
      const html = top
        ? `<span style="position:relative;display:block;width:${sz}px;height:${sz}px"><span class="apin ${top.kind} ${pinSize(top)}">${avatarHTML(top)}</span><span class="cluster" style="position:absolute;right:-16px;top:-10px;height:20px;font-size:11px;padding:0 7px">+${g.length - 1}</span></span>`
        : `<span class="cluster">+${g.length}</span>`;
      const d = node(html, top ? sz : null, `${g.length} members`);
      d.addEventListener("click", (e) => {
        e.stopPropagation();
        mapController.run((m) => m.fitPoints(g.map((i) => [i.lat, i.lng]), Math.max(Math.round(z) + 2, 6)));
      });
      add(d, lng, lat, top ? Math.round(top.points) : 0);
    });
  }, [list, all, selected, plan, loaded, zoomTick, demand]);

  return <div ref={el} className="map" aria-label="Map of domainers, companies, domains and events" />;
}
