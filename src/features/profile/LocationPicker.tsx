"use client";

import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { unwrapAntimeridian } from "@/lib/geo-shapes";

const STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#15130f" } }],
};

/** Click the map to place your pin. Only the point you choose is stored (pick your city, not your street). */
export function LocationPicker({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick(lat: number, lng: number): void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    const m = new maplibregl.Map({
      container: el.current!,
      style: STYLE,
      center: [lng ?? 10, lat ?? 30],
      zoom: lat != null ? 4 : 0.6,
      attributionControl: { compact: true, customAttribution: "Natural Earth" },
      dragRotate: false,
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.on("load", async () => {
      const topo = (await import("world-atlas/countries-110m.json")).default as unknown as Topology;
      const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry>;
      fc.features = fc.features.filter((f) => f.id !== "010").map((f) => ({ ...f, geometry: unwrapAntimeridian(f.geometry) }));
      m.addSource("c", { type: "geojson", data: fc });
      m.addLayer({ id: "c-fill", type: "fill", source: "c", paint: { "fill-color": "#242120" } });
      m.addLayer({ id: "c-line", type: "line", source: "c", paint: { "line-color": "rgba(239,233,225,.3)", "line-width": 0.6 } });
    });
    m.on("click", (e) => pick.current(+e.lngLat.lat.toFixed(3), +e.lngLat.lng.toFixed(3)));
    m.getCanvas().style.cursor = "crosshair";
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || lat == null || lng == null) return;
    if (!marker.current) {
      const d = document.createElement("div");
      d.className = "pin";
      d.style.width = d.style.height = "16px";
      marker.current = new maplibregl.Marker({ element: d }).setLngLat([lng, lat]).addTo(m);
    } else marker.current.setLngLat([lng, lat]);
  }, [lat, lng]);

  /** Move the camera (e.g. after "Use my location"). */
  useEffect(() => {
    if (lat != null && lng != null && map.current && !map.current.getBounds().contains([lng, lat])) map.current.easeTo({ center: [lng, lat], zoom: 4 });
  }, [lat, lng]);

  return <div ref={el} className="h-[260px] w-full overflow-hidden rounded border border-divider" aria-label="Map: click to place your pin" />;
}
