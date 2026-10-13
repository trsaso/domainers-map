/**
 * Lets views outside the map (directories, leaderboards, the drawer) move the camera.
 * The map registers itself on mount; calls made while it is hidden (another view is active)
 * are queued and replayed once the Explore view is visible and resized.
 */
import type { Camera } from "./types";

export type Padding = { top?: number; right?: number; bottom?: number; left?: number };

export interface MapApi {
  camera(): Camera;
  flyTo(lat: number, lng: number, zoom?: number, padding?: Padding): void;
  /** Pan just enough to bring the point inside the padded viewport; no-op when it is already visible. */
  ensureVisible(lat: number, lng: number, padding?: Padding): void;
  fitPoints(points: [number, number][], maxZoom: number): void;
  zoom(): number;
  isVisible(): boolean;
  resize(): void;
}

let api: MapApi | null = null;
let pending: ((m: MapApi) => void) | null = null;

export const mapController = {
  register(m: MapApi | null) {
    api = m;
  },
  run(fn: (m: MapApi) => void) {
    if (api && api.isVisible()) fn(api);
    else pending = fn;
  },
  /** Called by the Explore view when it becomes visible. */
  activated() {
    if (!api) return;
    api.resize();
    if (pending) {
      const fn = pending;
      pending = null;
      fn(api);
    }
  },
  zoom: () => (api ? api.zoom() : 2),
  camera: (): Camera | null => (api ? api.camera() : null),
};
