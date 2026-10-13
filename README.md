# Domainers Map — web app

Next.js 15 (App Router) + TypeScript + Tailwind + MapLibre GL implementation of the
`Domainers Map - App.html` design. **Frontend only:** data comes from `src/data/seed.json`,
and anything the user does (offers, leads, Grow actions, plan, layout) is kept in
`localStorage` (`dmap.v1`). Nothing claims a live backend.

```bash
npm install
npm run dev        # http://localhost:3000 → /explore
npm run build && npm start
npm run typecheck
npm test           # database permission + bidding rules (PGlite)
```

## Structure

```
src/
  app/                    routes: /explore /domainers /domains /companies /matches
    (app)/…                       /offers /watchlist /events /today /leads /grow
    u/[handle]/           public profile + opengraph-image / twitter-image share cards
    globals.css           design tokens + component classes ported from the prototype
  data/seed.json          placeholder seed (same shape as the design bundle)
  lib/                    framework-free domain logic
    world.ts              data access, points/ranks, visibility tiers
    watch.ts              watchlist snapshots → alert messages
    demand.ts             buyer-demand slices for the heatmap
    profile.ts            public handles, X compose intent
    share-card.tsx        1200×630 share card (next/og)
    offers.ts             offers + proxy bids, auctions
    matching.ts           heuristic buyer matcher
    grow.ts, geo.ts, format.ts, types.ts, map-controller.ts
  store/app-store.ts      zustand store (persisted prototype state + UI state)
  features/
    shell/                rail, top bar, app shell (keeps the map mounted across views)
    explore/              sidebar, MapLibre map, list mode, filtering
    drawer/               details drawer + offer section
    views/                one component per rail view
```

To connect a backend later, replace `lib/world.ts` (and the store actions that mutate
offers/leads) with API calls. Components only consume the `World` shape.

## Accounts and shared listings (Supabase)

With `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set, the app adds:

- **Sign in with X.** A profile is created from the X account (name, handle, picture). New members
  then add their city and pin on `/profile`.
- **My domains** (`/my-domains`). Add, edit, delete or bulk add listings. Each listing is Buy now,
  Make offer, Auction (reserve, soft close) or Unlisted. Listed names are visible to everyone; only
  the owner can change them. New listings are marked **Unverified** until DNS verification ships.
- **Shared offers and bids.** These go through `place_offer()` on the server, which applies the minimum,
  runs proxy bidding, keeps maximums private, extends auctions on late bids (soft close), and notifies
  the outbid leader and the owner. Owners accept the high offer from the drawer.
- **Sample data.** The demo members stay, labelled **Sample**. The seed's placeholder profile is dropped,
  and a real listing hides a sample one with the same name.

Schema and permissions are in `supabase/migrations/`; setup steps are in [SETUP.md](SETUP.md).
`npm test` runs the permission and bidding rules against those migrations in PGlite (in-process
Postgres). Without the env vars, the app stays in demo mode.

## Features added after the first build

- **Watchlist.** Use ☆ in any drawer to watch a domain, domainer or company. Alerts arrive after
  market changes, but not after your own actions:
  - domains: a new offer, a price move, or a sale
  - domainers: a new listing, a sale, or a rank change
  - companies: a new best-fit name

  The **Watchlist** page lists alerts, watched items and saved views. "Simulate market activity"
  makes a rival bid on a watched domain; it exists for the prototype only.
- **Saved map views.** "+ Save view" in the sidebar stores the current filters and the map
  camera. Clicking a view chip restores both.
- **Demand heatmap.** The **Demand** toggle next to Streets adds a MapLibre heatmap of companies,
  each weighted by its best matcher score (30 or more) against live names in the chosen
  category or extension. The panel shows the top countries and the strongest buyers.
- **Public profiles.** `/u/<handle>` (the X handle, otherwise the member id) is statically
  generated with Open Graph/X metadata and a generated `summary_large_image` card. `?invite=1`
  shows the invite banner; Grow's invite link points here. "Share on X" and "Post it on X" open
  X's own compose screen through an intent URL, so nothing is posted automatically. "Open on
  the map" deep-links to `/explore?open=<id>`.
  - Set `NEXT_PUBLIC_SITE_URL` in production so share-card URLs are absolute and correct.
  - Public pages show seed data only, not the viewer's local offers or Grow points.

## Behaviour notes

- **Hover opens the drawer.** Hovering a pin or a result card opens that item's drawer as an
  overlay, so the map doesn't reflow under the pointer. It closes when the pointer leaves,
  unless the pointer moves into the drawer. Clicking a pin or card, or clicking inside a
  previewed drawer, pins the drawer open.
- **Closing:** ✕, `Esc`, or a click on empty map.
- **Layout and drawer switchers** (Sidebar / Floating / Split × Side / Card / Sheet) are kept
  from the prototype, and the choice is remembered.
- **Zoom tiers** use the prototype's 256-px-tile scale: worldwide ≤ 3, country 4–5, city ≥ 6.
  MapLibre's zoom is offset by one to match.
- **Map base:** Natural Earth 110m countries, bundled from `world-atlas`, so there is no tile
  dependency. OpenStreetMap tiles are opt-in through **Streets**.
- **The X avatar** for @GrabCom loads from `unavatar.io` and falls back to initials.
  Production should use X OAuth.
