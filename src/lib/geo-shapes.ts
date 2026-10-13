import type { Geometry } from "geojson";

/**
 * Natural Earth rings that cross ±180° (Russia, Fiji) jump from 180 to -180 between vertices, which a
 * planar renderer draws as a band across the whole map. Keep each ring continuous instead.
 */
export function unwrapAntimeridian(g: Geometry): Geometry {
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
