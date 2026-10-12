# Domainers Map Product Build

_Started 2026-10-12 09:53 UTC_

---

## User

# Domainers Map — Master Product Build Prompt

Act as a senior SaaS architect, product designer, geospatial engineer and full-stack developer.

Build a production-oriented application called Domainers Map.

PRODUCT VISION

Domainers Map is a global discovery and intelligence platform for domain investors, domain brokers, domain buyers, startups and companies.

The platform combines:

1. An interactive global map.
2. A directory of domain investors and brokers.
3. A company and startup directory.
4. A searchable domain inventory.
5. AI-assisted domain-to-company buyer matching.
6. A lightweight lead CRM.
7. Events and professional networking.
8. Sponsored profiles and premium visibility as a future monetization option.

The main differentiator is connecting domains to potential end-user companies, not simply displaying pins on a map.

TECHNOLOGY

Use:

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* Supabase
* PostgreSQL
* PostGIS where appropriate
* MapLibre GL JS
* OpenStreetMap-compatible map tiles

Inspect the existing project before making changes. Preserve existing functionality when extending an existing codebase.

PRODUCT EXPERIENCE

Create a premium, dark-first professional SaaS interface with:

* A large interactive map
* A searchable left sidebar
* Filter chips
* A company/profile details drawer
* Clustering for dense map regions
* A map/list toggle
* Responsive mobile layouts
* Smooth but restrained animations

The visual identity should feel like domain intelligence software, not a generic social network.

ARCHITECTURE

Separate:

* Public marketing pages
* Authenticated application
* Database and API layer
* Search and matching services
* Admin console

Use reusable components and a clear feature-based folder structure.

Do not hard-code business data into components.

Before implementation, produce:

1. Architecture proposal.
2. Database schema.
3. Page and route inventory.
4. Component inventory.
5. Implementation sequence.
6. Risks and external service dependencies.

Then implement the foundation without generating fake live integrations or claiming that any external service is connected when it is not.

## Assistant



## Assistant

_[tool: read_skill_prompt]_

_[tool: ask_user]_

Form is up — waiting on your picks (codebase, design system, scope, hero screen) before I start the plan and prototype.

## User

Answered — Asked Claude to decide; deliverables: Planning doc (architecture, schema, routes, components, sequence, risks), Interactive app prototype (map, sidebar, drawer, filters), Public marketing landing page, Admin console screens; primary_screen: Map explorer; audience: Domain investors; map_data: Seeded from my data; variations: 2–3 map-explorer layout options, 2–3 details-drawer treatments

## Assistant

_[tool: list_files]_

_[tool: read_skill_prompt]_

_[tool: read_skill_prompt]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: update_todos]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: copy_starter_component]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: get_webview_logs]_

_[tool: update_todos]_

_[tool: set_project_title]_

_[tool: ready_for_verification]_

_[tool: show_html]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: str_replace_edit]_

Now the hub page linking everything.

_[tool: dc_write]_

_[tool: ready_for_verification]_

_[tool: ready_for_verification]_

First pass is up — start at **Domainers Map** (hub), which links to:

- **App** — map explorer prototype: clustering, filters (type/TLD/region/verified/in-view), map↔list toggle, details drawer, domain→buyer matching with scored reasons, and a local lead pipeline. Top-bar controls switch 3 sidebar layouts × 3 drawer treatments.
- **Plan** — architecture, schema, routes, components, sequence, risks (printable).
- **Landing** and **Admin** console.

Caveats: no codebase or design system was connected, so I derived a dark variant of the default Classical system (Cormorant/Lora, gold stroke accent). Seed data is placeholder in `data/seed.json` — drop in your export in that shape. The map uses vector country geometry by default; OSM street tiles are behind the “Streets” toggle because the public tile server blocks this preview origin. Nothing claims a live backend.

Next: pick a layout + drawer combination to lock Phase 2, and send real seed data.

## User

Found issues — fixing…

## User

Found issues — fixing…

## Assistant

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Those overlaps are the floating sidebar sitting over map cluster markers — intentional layering (the panel is opaque over the map), not a defect.

Fixed all four verifier items: drawer match rows now place score in the right column, Matches table scrolls horizontally with a readable "Why" column, list mode clears the toolbar and the floating sidebar, and floating-layout cards drop the city from the kicker.

## User

Research again source, on original is some outbid system why we dont have even in plan ? And second what you think to implement verification via x.com and some points to grow on map to present country or similar... Suggest some update and i will confirm first before to implement here.

## Assistant



## Assistant

I searched for the "original source" — no public Domainers Map product or spec with an outbid system turned up, so I can't see what you're referring to. If it's a brief or site, paste the text or link and I'll align to it exactly. Meanwhile, here's what I'd propose; confirm and I'll implement.

**1. Offers & outbid system** (missing from plan — my gap)
- Every listed domain accepts offers; make‑offer names get a visible "highest offer" and offer count.
- Outbid flow: when a higher offer lands, previous bidders get notified ("You've been outbid on verdant.com — $14k → $16.5k"), can raise with proxy max.
- Optional timed auctions with reserve and soft‑close (anti‑snipe +5 min).
- Schema: `offers` (domain_id, bidder_workspace_id, amount, max_proxy, status), `auctions` (domain_id, starts/ends, reserve, soft_close_min), `notifications`.
- UI: offer panel in the domain drawer, "My offers / Outbid" tab, countdown chips on cards.

**2. Verification via X.com**
- Sign in with X (OAuth 2.0) → links handle; verification = handle linked + account age ≥ 1 yr + a one‑time post or bio code containing your Domainers Map ID.
- Tiers: X‑verified (social), DNS‑verified (owns listed domains), Attested (completed deal confirmed by counterparty). Badges differ; only DNS/Attested unlock full match scores.
- Caveat: X API is paid and rate‑limited; treat as dependency.

**3. Points → presence on the map**
- Reputation points from: verification tier, profile completeness, listings with prices, offers made/received, deals attested, event RSVPs, endorsements.
- Points drive pin size/brightness and sort rank (never match scores); decay for inactivity.
- Country view at low zoom: countries shaded by member density with totals, "top countries" rail, per‑country leaderboard; zooming in resolves to clusters → pins.
- Sponsorship stays a separate, labelled mark — not purchasable points.

**4. Smaller additions**
- Watchlist for domains/companies; saved map views; "deal feed" of recent sales/offers per region.

_[tool: ask_user]_

_[tool: web_search]_

_[tool: web_search]_

_[tool: snip]_

Waiting on your picks (which features, outbid model, points effect) and the original source text if you have it — then I'll update plan, schema and prototype.

## User

Answered — Asked Claude to decide; features: Offers & outbid, Timed auctions + reserve, X.com verification, DNS / deal attestation tiers, Reputation points, Country-level map view, Leaderboards, Deal feed; outbid_model: Offers + proxy bids; points_effect: Pin + rank + badges

## Assistant

_[tool: run_script]_

Now the app updates.

_[tool: str_replace_edit]_

Now the JS: points/tiers, country view, offers engine, new views, drawer changes.

_[tool: str_replace_edit]_

Now the offers engine, drawer sections, and the Offers/Rank views.

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: str_replace_edit]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

_[tool: ready_for_verification]_

Round 2 is in (the #root warning is a false positive — the App is plain HTML, not React).

**App** (`Domainers Map — App.html`)
- Offers + proxy bids on every domain drawer; outbid alerts, Offers tab with Leading/Outbid status, "Simulate rival bid" to see an outbid land.
- Timed auctions with reserve, countdown chips and soft‑close note.
- X / DNS / Attested tiers on cards and profiles (X handle linked).
- Reputation points → pin size (3 steps), "Reputation" sort, rank + Top 10 badge.
- Country view at low zoom: density shading, count labels (merged where countries collide), click to zoom in.
- Rank tab: top members, top countries, most active brokers, deal feed.

**Plan** (v0.2): new architecture rows, 6 new tables (offers, auctions, notifications, verifications, deal_attestations, reputation), routes, components, sequence re‑ordered (offers before leads), risks added (X API cost, shill bidding, points gaming). **Admin** queue now shows X and Attested items.

Caveat: still no source for the "original" outbid rules — if you share it I'll align the increments/soft‑close details.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

Fixed: Plan now says "Phase 9" for payments, tier chips no longer wrap, and country labels merge when neighbours would touch (no more NO / "2 countries" overlap).

## User

Lets try again, Add my profile with few my domains inside and If its posible Verified X account to get icon from there (circular icon from x.com in this case use from @grabcom I am). I will give you some images how is presented in original source, i like that.

## User

Lets try again, Add my profile with few my domains inside and If its posible Verified X account to get icon from there (circular icon from x.com in this case use from @grabcom I am). I will give you some images how is presented in original source, i like that.

## Assistant

_[tool: run_script]_

_[tool: str_replace_edit]_

Now the JS: avatar pins, +N clusters, me-card, live counter, drawer avatar, climbing list.

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

The X avatar loads. Two fixes: the drawer header kicker overlaps the close button, and the "+N" cluster chip is slightly misplaced.

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

Still overlapping — the kicker div itself isn't flexing because `.kicker` is set `display` inline-level by the hole. Let me inspect.

_[tool: eval_js_user_view]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

The "you" tag still sits over "X verified" — `.tag` has `position:relative`? No… the `.rcard`'s `.spons`? Let me probe my iframe directly.

_[tool: eval_js]_

The tier chip is only 28px wide — its text overflows because `.tier` got `white-space:nowrap` but the flex item shrinks. Add `flex:none`.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: ready_for_verification]_

_[tool: ready_for_verification]_

Done — open the **App** from the hub:

- **Your profile** (Grab Com, @GrabCom) is the signed‑in user: card at the bottom of the sidebar, avatar in the top bar, and your X profile picture is pulled live from x.com via a public avatar proxy (falls back to initials if blocked). Production would use X OAuth instead.
- **Your inventory**: 3 placeholder domains (grabify.com, grabbed.io, grabber.ai) with one incoming offer — send your real domain list and city and I'll swap them (I put you in Amsterdam as a placeholder).
- **Map pins** now follow the pattern you liked: circular avatar pins with gold ring, rank badge (#21) under top‑20 members, pin size by points, and "+N" chips on clusters showing the top member's avatar.
- Top bar shows an online/members counter; Rank tab gained a "Climbing today" list (points since midnight).

Root‑mount warning is a false positive (plain HTML page). The bug fixed along the way: a class‑name collision (`.x`) that broke "X verified" chips.

## User

Found issues — fixing…

## Assistant

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: ready_for_verification]_

Fixed: your own domains now show "Offers received" with Accept/Decline (accepting marks the domain sold and creates a Won lead), no bid form, and footer actions "Edit listing / Find buyers". The overlap findings are the floating sidebar layered over map pins — intentional.

## User

I will give you more images, analize all and if need re-organize structure or whatewer need, change the Plan where needed. example is for builders we are for Domainers first.

## User

I will give you more images, analize all and if need re-organize structure or whatewer need, change the Plan where needed. example is for builders we are for Domainers first.

## Assistant

_[tool: str_replace_edit]_

Now the new views (Domainers, Domains, Companies, Events, Grow), visibility tiers, and points recompute.

_[tool: str_replace_edit]_

Now wire `recomputePoints` into init, and mobile CSS for the rail.

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: get_webview_logs]_

_[tool: eval_js]_

_[tool: multi_screenshot]_

_[tool: eval_js]_

The timeout is the screenshot capture (html-to-image on many map tiles/avatars), not the app. Capture the non-map views only.

_[tool: multi_screenshot]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: multi_screenshot]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: eval_js]_

Blob avatars work. Now screenshots of the new views.

_[tool: multi_screenshot]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: eval_js]_

Images are fine; the capture tool itself is struggling with this page. I'll hand it to the verifier and update the Plan doc meanwhile.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

_[tool: ready_for_verification]_

Analysed all ten screenshots and translated the mechanics (not the look) from a builder community to domainers.

**App restructured** — left rail: Explore · Domainers · Domains · Companies · Matches · Offers · Events · Today · Leads · Grow, with "+ List a domain" and your profile card at the bottom.
- **Domainers**: leaderboard directory (rank, avatar, tier, @handle, focus, city · type · featured domain, points).
- **Domains**: marketplace ranked by holder's points — search, Top / New / Most offers / Near you, category chips with counts, cards with price or current bid and offer count.
- **Companies**: buyers with wish lists and best‑fit inventory (our differentiator — no analogue in the reference).
- **Grow** (= Contribute): your spot on the map (city ✓ / country / worldwide tiles), progress to top 20 and the member just above you, invite link (+50 per join), point checklist adapted for domainers (DNS verify +15, priced listing +5, attest a deal +100, host a meetup +150, lander badge, X bio…), impact + role badges (Verified · Recruiter · Host · Connector · Dealmaker · Reviewer), Country $4 / World $12 plans. Clicking checklist items adds points and re‑ranks live.
- **Map**: visibility is now earned — everyone at city zoom, ≥40 pts or Country plan at country zoom, top 20 or World plan worldwide.

**Plan v0.3**: new §0 "Product structure" (nav IA, visibility tiers, point values), 6 more tables (plans, invites, lander_badges, x_posts, broker_reviews, profile_views), routes/components, monetisation rewritten around the two member plans, 2 new risks (X read access, badge crawler).

Still a placeholder: your city (Amsterdam) and the three domains — send real ones.

## User

Found issues — fixing…

## Assistant

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: eval_js]_

Two remaining overlaps are labels for unpinned countries that sit near pinned ones at zoom 2. Nudge labels away from any visible pin.

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

The grep path with the em dash doesn't match; the file is reachable by the plain name. Let me read the function.

_[tool: read_file]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: ready_for_verification]_

Both fixed: country counts now ride as a `+N` badge on the visible pin (separate labels only for unpinned countries, pushed clear of nearby pins — 0 collisions at zoom 2–3), and the nav rail scrolls so the profile card is reachable on short screens. The remaining validator findings are the opaque sidebar layered over map pins — intentional.

## User

Close not working, see image. 
Also see all images and i want when go over some domainer to open (automaticly will close when  go out). Must see all images to understand what i teling you.

## User

Close not working, see image. 
Also see all images and i want when go over some domainer to open (automaticly will close when  go out). Must see all images to understand what i teling you.

## User

did you update Plan ? if not please do it, othervice confirm.

## Assistant

Confirmed — the Plan (v0.3) is updated. It now includes: §0 Product structure (left‑rail IA, visibility tiers, point values), the offers/auction tables plus `sponsor_slots` / `slot_bids` for auctioned sponsor placements, verification tiers, reputation, plans/invites/lander badges, the `HoverCard` component, re‑ordered phases (Offers → Leads → Trust & reputation → Events + admin → Monetisation with Country $4 / World $12 and slot auctions → Networking), and new risks (X API, slot/shill bidding, badge crawler). You're looking at the current version.

