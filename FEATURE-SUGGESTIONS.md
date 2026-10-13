# Domainers Map — suggested features

> **Status:** #3 Watchlist + saved map views, #8 Demand heatmap and #10 Public profiles + share
> cards are **built** (frontend prototype). See README → "Features added after the first build".

Proposals for your confirmation. None of these are built yet. Each one is new relative to the Plan
(v0.3), which already covers offers/auctions, X/DNS/attestation tiers, reputation, country view,
leaderboards, deal feed, events, messaging, escrow partner, CSV import, sponsor slots, lander
badges, broker reviews and the Country/World plans.

Ranked by value to **domainers first** and by how well each one feeds the core
differentiator (domain → end-user buyer).

| # | Feature | Why domainers care | Effort | Depends on |
|---|---------|--------------------|--------|------------|
| 1 | **Buyer-intent alerts** | Know the moment a matching company becomes a likely buyer | M | Funding/news feeds, trademark data |
| 2 | **Comparable sales & price guidance** | Price listings and offers with confidence | M | Deal feed + a sales-data source |
| 3 | **Watchlist + saved map views** | Follow names, companies and regions without re-searching | S | — |
| 4 | **Hosted “for sale” lander with built-in offers** | Turns type-in traffic into offers on the map | M | DNS verification (planned) |
| 5 | **Outbound pitch composer** | Matches → Leads → a sent pitch in one flow | M | Email provider (planned), LLM |
| 6 | **Portfolio & renewals dashboard** | Renewal costs, ROI and the drop list per name | M | Registrar APIs / CSV |
| 7 | **Expiring-name radar** | Catch drops that already have a matched buyer | L | Drop lists / zone files |
| 8 | **Demand heatmap layer** | See where buyers for a category or TLD cluster | S | Existing matcher output |
| 9 | **Broker mandates & co-broking** | List a name through a broker with a visible commission split | M | Attestation flow (planned) |
| 10 | **Public profile pages + share cards** | `domainersmap.com/@handle`, with X-ready OG images | S | — |

## Details

**1. Buyer-intent alerts.** Watch companies for signals: a funding round, a rebrand, trademark
filings, hiring for "brand/marketing", or a hyphenated or `.io` domain. When a signal lands for a
company that scores ≥ 50 against one of your names, notify the owner ("Tidewell raised a Series C —
tidewell.com scores 98"). Shows as a pulse on the company pin and in Offers/Today. Schema:
`company_signals(company_id, kind, source_url, seen_at)` plus a matcher re-run trigger.

**2. Comparable sales & price guidance.** Add a "Comps" section to the domain drawer: recent sales
with the same TLD, length and keywords, from the deal feed plus an external sales source. Show a
suggested range next to the offer form ("comps $30k–$55k") and warn sellers whose asking price is
far outside it. Make the figures clearly labelled estimates, never a valuation claim.

**3. Watchlist + saved map views.** A ☆ on any domain, company or domainer, and "Save this view"
(filters + map bounds) in the sidebar. Watched items trigger alerts on price change, a new offer,
an auction ending or a sale. This one is cheap and makes the app sticky; first proposed earlier
in the design chat but not yet in the Plan.

**4. Hosted lander with built-in offers.** Owners point a domain's DNS at a Domainers Map lander
(which also proves ownership and feeds the DNS tier). Visitors make offers that land directly in
the proxy-bid engine. Lander traffic counts toward points, and the owner sees views/offers per name.

**5. Outbound pitch composer.** From a match row, draft a short, personalised pitch (domain, why it
fits, price/offer link) and send or copy it. Leads get "pitched / opened / replied" stages. Rate
limits and opt-out handling are mandatory (anti-spam risk, reputation strikes for abuse).

**6. Portfolio & renewals dashboard.** Import from a registrar API or CSV: renewal dates and costs,
annual carry cost, offers received and sell-through per name. Suggest which names to drop (no
matches, no offers, high renewal) and which to price up (strong matches).

**7. Expiring-name radar.** Daily list of pending-delete/expiring names that score well against
companies on the map, so domainers backorder the ones with a ready buyer. Data licensing is the
main risk.

**8. Demand heatmap layer.** A map toggle next to "Streets": shade regions by buyer demand for a
chosen category or TLD (e.g. AI companies wanting `.ai` in Europe). Reuses matcher scores and is
cheap to build on the existing country shading.

**9. Broker mandates & co-broking.** An investor assigns a name to a broker (exclusive or open)
with a commission split. The broker's profile shows "represented inventory", and closed deals
attest both parties.

**10. Public profile pages + share cards.** Indexable public profiles and listings with generated
OG images (avatar, rank, top names) designed for posting on X. This drives the invite loop that
Grow already rewards.

## Suggested next step

Ship **3 (Watchlist)**, **8 (Heatmap)** and **10 (Public profiles)** first: they are small,
need no new data vendors, and strengthen the map and the growth loop. Then **1 (Buyer-intent)**
and **2 (Comps)**, which make the matcher the reason domainers come back daily.
