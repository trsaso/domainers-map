"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { money, today } from "@/lib/format";
import { GROW } from "@/lib/grow";
import { mapController } from "@/lib/map-controller";
import { increment, leading, myStatus, type OfferBook } from "@/lib/offers";
import type { Camera, DrawerStyle, Item, Layout, Lead, Notif, Plan, Stage } from "@/lib/types";
import { describeChange, snapshot, type WatchSnap } from "@/lib/watch";
import { DB, ME, getWorld } from "@/lib/world";

export interface Filters {
  q: string;
  type: "all" | Item["kind"];
  tlds: string[];
  regions: string[];
  verified: boolean;
  viewport: boolean;
  sort: "relevance" | "points" | "deals" | "price" | "name";
}

export interface SavedView {
  id: string;
  name: string;
  filters: Filters;
  camera: Camera | null;
}

export interface DomainFilters {
  q: string;
  sort: "top" | "new" | "offers" | "near";
  cat: string;
}

interface Persisted {
  leads: Lead[];
  layout: Layout;
  drawer: DrawerStyle;
  offers: OfferBook;
  notifs: Notif[];
  actions: Record<string, boolean>;
  plan: Plan;
  sold: string[];
  /** Watched item id → last snapshot we alerted on. */
  watch: Record<string, WatchSnap>;
  savedViews: SavedView[];
}

interface Ui {
  /** Item pinned open by a click; stays until closed. */
  selectedId: string | null;
  /** Small hover card for a pin or result card; `x`/`y` are viewport coordinates of its anchor. */
  hover: { id: string; x: number; y: number } | null;
  /** The results list folds away while a drawer is open so the map keeps its width; the "List" tab reopens it. */
  listHidden: boolean;
  mode: "map" | "list";
  sideOpen: boolean;
  filters: Filters;
  domainFilters: DomainFilters;
  pickedDomain: string | null;
  toastMsg: string;
  toastOn: boolean;
  /** Bumped when filters are replaced wholesale (saved view applied) so uncontrolled inputs reset. */
  filtersRev: number;
}

interface Actions {
  set<K extends keyof (Persisted & Ui)>(k: K, v: (Persisted & Ui)[K]): void;
  setFilters(p: Partial<Filters>): void;
  setDomainFilters(p: Partial<DomainFilters>): void;
  toast(msg: string): void;
  select(id: string, fly?: boolean): void;
  closeDrawer(): void;
  hoverEnter(id: string, x: number, y: number): void;
  hoverLeave(): void;
  addLead(targetId: string, domainId?: string | null): void;
  setStage(id: string, stage: Stage): void;
  setNote(id: string, note: string): void;
  removeLead(id: string): void;
  placeOffer(domainId: string, amount: number | string, max: number | string, bidder?: string): void;
  acceptOffer(domainId: string): void;
  simulateRival(): void;
  markAllRead(kind: "outbid" | "watch"): void;
  doAction(id: string): void;
  setPlan(p: Plan): void;
  toggleWatch(id: string): void;
  simulateMarket(): void;
  saveView(): void;
  applyView(id: string): void;
  deleteView(id: string): void;
}

export type AppState = Persisted & Ui & Actions;

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** Map padding that keeps a selected pin clear of an overlaying drawer (the side drawer shrinks the map instead). */
const drawerPadding = (drawer: DrawerStyle) =>
  typeof window === "undefined" || window.innerWidth <= 860
    ? { bottom: typeof window === "undefined" ? 0 : Math.round(window.innerHeight * 0.6) }
    : drawer === "card"
      ? { right: 390 }
      : drawer === "sheet"
        ? { bottom: Math.round(window.innerHeight * 0.52) }
        : {};

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const world = () => getWorld(get().actions, get().sold);
      const notify = (msg: string, id: string, kind: Notif["kind"] = "outbid") =>
        set((s) => ({ notifs: [{ msg, id, at: new Date().toISOString(), read: false, kind }, ...s.notifs] }));
      /** Re-snapshot watched items after a market change; `quiet` for the user's own actions. */
      const syncWatch = (quiet: boolean) => {
        const s = get();
        const w = world();
        const next: Record<string, WatchSnap> = {};
        const alerts: Notif[] = [];
        Object.entries(s.watch).forEach(([id, prev]) => {
          const item = w.byId[id];
          if (!item) return;
          const snap = snapshot(item, w, s.offers);
          const msg = quiet ? null : describeChange(item, prev, snap, w, s.offers);
          if (msg) alerts.push({ msg, id, at: new Date().toISOString(), read: false, kind: "watch" });
          next[id] = snap;
        });
        set({ watch: next, notifs: [...alerts, ...s.notifs] });
      };

      return {
        leads: [],
        layout: "sidebar",
        drawer: "side",
        offers: {},
        notifs: [],
        actions: {},
        plan: "free",
        sold: [],
        watch: {},
        savedViews: [],

        selectedId: null,
        hover: null,
        listHidden: false,
        mode: "map",
        sideOpen: false,
        filters: { q: "", type: "all", tlds: [], regions: [], verified: false, viewport: true, sort: "relevance" },
        domainFilters: { q: "", sort: "top", cat: "all" },
        pickedDomain: null,
        toastMsg: "",
        toastOn: false,
        filtersRev: 0,

        set: (k, v) => set({ [k]: v } as Partial<AppState>),
        setFilters: (p) => set((s) => ({ filters: { ...s.filters, ...p } })),
        setDomainFilters: (p) => set((s) => ({ domainFilters: { ...s.domainFilters, ...p } })),

        toast(msg) {
          clearTimeout(toastTimer);
          set({ toastMsg: msg, toastOn: true });
          toastTimer = setTimeout(() => set({ toastOn: false }), 1800);
        },

        select(id, fly) {
          set({ selectedId: id, hover: null, sideOpen: false, listHidden: true });
          const i = world().byId[id];
          if (!i) return;
          const padding = drawerPadding(get().drawer);
          // Let the layout settle (list folds, side drawer opens) before moving the camera.
          setTimeout(
            () =>
              mapController.run((m) =>
                fly ? m.flyTo(i.lat, i.lng, Math.max(m.zoom(), 5), padding) : m.ensureVisible(i.lat, i.lng, padding),
              ),
            fly ? 0 : 280,
          );
        },
        closeDrawer() {
          set({ selectedId: null, hover: null, listHidden: false });
        },

        hoverEnter(id, x, y) {
          set({ hover: { id, x, y } });
        },
        hoverLeave() {
          if (get().hover) set({ hover: null });
        },

        addLead(targetId, domainId = null) {
          const { leads, toast } = get();
          if (leads.some((l) => l.targetId === targetId && l.domainId === domainId)) {
            toast("Already in leads");
            return;
          }
          const lead: Lead = { id: "l" + Date.now(), targetId, domainId, stage: "New", note: "", added: today() };
          set({ leads: [lead, ...leads] });
          toast(`Added ${world().byId[targetId]?.label} to leads`);
        },
        setStage: (id, stage) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, stage } : l)) })),
        setNote: (id, note) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, note } : l)) })),
        removeLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

        placeOffer(domainId, amountIn, maxIn, bidder = ME) {
          const { offers, toast } = get();
          const amount = +amountIn || 0;
          const max = Math.max(+maxIn || 0, amount);
          const before = leading(domainId, offers);
          const d = world().byId[domainId];
          if (!amount) {
            toast("Enter an amount");
            return;
          }
          if (before && bidder === ME && before.bidderId !== ME && amount < before.price + increment(before.price)) {
            toast(`Minimum offer is ${money(before.price + increment(before.price))}`);
            return;
          }
          const next: OfferBook = {
            ...offers,
            [domainId]: [...(offers[domainId] || []), { bidderId: bidder, amount, max, at: new Date().toISOString() }],
          };
          set({ offers: next });
          const after = leading(domainId, next)!;
          if (before && before.bidderId !== after.bidderId && before.bidderId === ME)
            notify(`Outbid on ${d.label} — ${money(before.price)} → ${money(after.price)}`, domainId);
          syncWatch(bidder === ME);
          if (bidder === ME) {
            if (after.bidderId === ME) toast(`You lead ${d.label} at ${money(after.price)}`);
            else {
              notify(`Outbid instantly on ${d.label} — a proxy bid up to ${money(after.price)} beat your ${money(max)}`, domainId);
              toast("Outbid instantly — raise your max");
            }
          }
        },

        acceptOffer(domainId) {
          const { offers, leads, sold, toast } = get();
          const l = leading(domainId, offers);
          const w = world();
          const d = w.byId[domainId];
          if (!l) return;
          const t = w.byId[l.bidderId];
          const newLeads =
            t && !leads.some((x) => x.targetId === t.id && x.domainId === domainId)
              ? [{ id: "l" + Date.now(), targetId: t.id, domainId, stage: "Won" as Stage, note: `Accepted offer ${money(l.price)}`, added: today() }, ...leads]
              : leads;
          set({ sold: [...sold, domainId], leads: newLeads });
          syncWatch(true);
          toast(`Accepted ${money(l.price)} for ${d.label} — lead marked Won`);
        },

        simulateRival() {
          const { offers, toast, placeOffer } = get();
          const mine = DB.domains.filter((d) => myStatus(d.id, offers) === "leading");
          if (!mine.length) {
            toast("You lead no offers to be outbid on");
            return;
          }
          const d = mine[Math.floor(Math.random() * mine.length)];
          const l = leading(d.id, offers)!;
          const rivals = [
            ...DB.companies.filter((c) => c.wants.includes(d.name)).map((c) => c.id),
            ...DB.people.filter((p) => p.id !== ME).map((p) => p.id),
          ];
          const r = rivals[Math.floor(Math.random() * rivals.length)];
          const amt = l.price + increment(l.price);
          const mx = Math.round((amt * (1.1 + Math.random() * 0.3)) / 500) * 500;
          placeOffer(d.id, amt, mx, r);
        },

        markAllRead: (kind) =>
          set((s) => ({ notifs: s.notifs.map((n) => ((n.kind ?? "outbid") === kind ? { ...n, read: true } : n)) })),

        doAction(id) {
          set((s) => ({ actions: { ...s.actions, [id]: true } }));
          syncWatch(true);
          get().toast(`+${GROW.find((a) => a.id === id)?.pts ?? 0} points`);
        },
        setPlan(p) {
          set({ plan: p });
          get().toast(p === "free" ? "Plan cancelled" : `${p === "world" ? "World" : "Country"} plan active — pin visibility updated`);
        },

        toggleWatch(id) {
          const { watch, offers, toast } = get();
          const item = world().byId[id];
          if (!item) return;
          if (watch[id]) {
            const { [id]: _, ...rest } = watch;
            set({ watch: rest });
            toast(`Removed ${item.label} from your watchlist`);
          } else {
            set({ watch: { ...watch, [id]: snapshot(item, world(), offers) } });
            toast(`Watching ${item.label} — you'll get alerts on offers, price changes and sales`);
          }
        },

        /** Prototype only: a rival bids on one of the watched domains so an alert lands. */
        simulateMarket() {
          const { watch, offers, toast, placeOffer } = get();
          const w = world();
          const ds = Object.keys(watch)
            .map((id) => w.byId[id])
            .filter((i) => i?.kind === "domain" && i.status !== "sold");
          if (!ds.length) {
            toast("Star a domain that's still for sale first");
            return;
          }
          const d = ds[Math.floor(Math.random() * ds.length)];
          if (d.kind !== "domain") return;
          const l = leading(d.id, offers);
          const amt = l ? l.price + increment(l.price) : Math.max(500, Math.round((d.askingUSD * 0.6) / 500) * 500);
          const rivals = [...DB.companies.map((c) => c.id), ...DB.people.filter((p) => p.id !== ME && p.id !== d.ownerId).map((p) => p.id)];
          placeOffer(d.id, amt, amt, rivals[Math.floor(Math.random() * rivals.length)]);
        },

        saveView() {
          const { filters, savedViews, toast } = get();
          const type = { all: "", investor: "Investors", broker: "Brokers", company: "Companies", domain: "Domains", event: "Events" }[filters.type];
          const parts = [filters.q && `“${filters.q}”`, type, ...filters.regions, ...filters.tlds, filters.verified && "Verified"].filter(Boolean);
          const name = parts.length ? parts.join(" · ") : `Map view ${savedViews.length + 1}`;
          const view: SavedView = { id: "v" + Date.now(), name, filters, camera: mapController.camera() };
          set({ savedViews: [...savedViews, view] });
          toast(`Saved “${name}”`);
        },
        applyView(id) {
          const v = get().savedViews.find((x) => x.id === id);
          if (!v) return;
          set((s) => ({ filters: v.filters, filtersRev: s.filtersRev + 1 }));
          const cam = v.camera;
          if (cam) mapController.run((m) => m.flyTo(cam.lat, cam.lng, cam.zoom));
        },
        deleteView: (id) => set((s) => ({ savedViews: s.savedViews.filter((v) => v.id !== id) })),
      };
    },
    {
      name: "dmap.v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s): Persisted => ({
        leads: s.leads,
        layout: s.layout,
        drawer: s.drawer,
        offers: s.offers,
        notifs: s.notifs,
        actions: s.actions,
        plan: s.plan,
        sold: s.sold,
        watch: s.watch,
        savedViews: s.savedViews,
      }),
    },
  ),
);

/** Derived world (points, ranks, sold state) for the current persisted state. */
export function useWorld() {
  const actions = useApp((s) => s.actions);
  const sold = useApp((s) => s.sold);
  return getWorld(actions, sold);
}
