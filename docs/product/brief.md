# Product brief

> One page you can hand to anyone: what tipind is, who it serves, what it does,
> and how it is built.

## Elevator pitch

tipind is a small, fast, static website that replaces a shared price list with a
searchable catalog. A buyer abroad looks up a medicine by ingredient, brand,
manufacturer or pack size, adds packets to a cart, fills in a delivery address,
and sends the finished order to the tipind team by email or Telegram. The team
confirms availability, shipping and payment directly — so the website needs no
accounts, no checkout server and no payment integration.

## What it is

- A **pharmaceutical price catalog** for generic and ethical-brand medicines
  supplied from India.
- A **lightweight ordering funnel**: catalog → cart → delivery details →
  pre-formatted order message → email/Telegram.
- A **static marketing site** for the same business: credibility, shipping
  policy, payment methods, FAQs, contact channels.
- **One decision point per interaction**: everything up to "send the message"
  happens offline in the visitor's browser.

## Who it is for

| Audience                                                      | Their job on the site                                                         |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| International retail buyers (USA, UK, New Zealand, Australia) | Find specific products and pack sizes, check the rate, order a known quantity |
| Repeat buyers                                                 | Re-find a product quickly, adjust packet counts, reuse saved delivery details |
| Buyers on slow or mobile connections                          | Load a small page and a ~200 KB catalog, search offline once loaded           |
| The tipind team                                               | Receive a complete, structured order without retyping it                      |

They arrive from a referral or messenger, usually already knowing roughly what
they want. They are price-sensitive and cautious: clarity about product, pack,
rate and shipping beats flashy marketing.

## What it does

1. **Browse and search** ~8,500 products by name, active ingredient,
   manufacturer, packaging and price range.
2. **Filter** with three-state facets: click a manufacturer once to include it,
   twice to exclude it, a third time to clear it.
3. **Build a cart** of packets, with per-product quantities, prices per packet
   and line totals. The cart survives reloads and tabs.
4. **Check out without an account**: country-aware address form (state lists,
   postal-code formats), optional crypto payment preference, delivery notes.
5. **Send the order** as a copyable plain-text message addressed to the team's
   email or Telegram handle. Nothing is charged on the site.
6. **Read the policy** — shipping regions, timelines, reshipment terms, payment
   methods, medical disclaimer.

## What it deliberately is not

- Not a pharmacy checkout: **no payment is taken online**, no prescription
  upload, no order-status tracking.
- Not an account system: identity is just a locally saved address.
- Not an API-driven app: there is no backend at all, so there is nothing to
  breach, rate-limit or scale.
- Not a CMS: marketing copy lives in typed TypeScript files and is reviewed like
  code.

## How it is made

| Layer           | Choice                                                             | Why it fits                                                     |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Framework       | Next.js 16 App Router, `output: "export"`                          | One React codebase, but the deployable is plain HTML/CSS/JS     |
| Hosting         | Cloudflare Workers static assets (`wrangler`)                      | Global CDN, near-zero cost, no server to maintain               |
| UI              | React 19 + Tailwind CSS v4 + Base UI primitives                    | Accessible components without a heavy component library runtime |
| Content         | Typed TS modules (`config/content.ts`, feature `content.ts`)       | Copy reviewed in PRs, no runtime fetch, no CMS bill             |
| Catalog data    | A versioned, gzipped, XOR-masked binary file built at deploy time  | ~200 KB for 8,500 rows; one immutable cacheable URL per release |
| Source of truth | A Google Sheet read through an Apps Script web app                 | The team updates prices in a spreadsheet, not in code           |
| Search          | Purpose-built in-memory index (~200 lines)                         | Exact control over ranking, highlighting and payload size       |
| State           | Zustand + `localStorage` with validating parsers                   | Cart and address survive reloads without a database             |
| Validation      | Zod, `country-region-data`, `postcode-validator`                   | Country-aware forms that fail politely                          |
| Motion          | Motion (formerly Framer Motion), gated on `prefers-reduced-motion` | Small, purposeful transitions only                              |

## Key numbers (current build)

| Metric                           | Value                                                |
| -------------------------------- | ---------------------------------------------------- |
| Products in the shipped catalog  | 8,522                                                |
| Manufacturers                    | 700                                                  |
| Catalog artifact                 | ~204 KB (gzipped, masked), one immutable URL         |
| Price range in the current sheet | $0.009 – $1,557.30 per packet                        |
| Fonts                            | 2 local WOFF2 files (~60 KB), zero external requests |
| Backend services                 | none                                                 |
| JavaScript (all chunks, gzipped) | ~460 KB total; routes load a subset                  |

## Lifecycle in one line

> Edit the **Google Sheet** → run `npm run catalog:build` → commit the new
> `catalog.<hash>.dat` → `npm run deploy` → the CDN serves the same URL as
> before, pointing at a new immutable artifact.

## Status

Live. The catalog, cart, checkout hand-off, theming, offline notice and
accessibility baseline are implemented. The main known gaps are: no automated
test suite, shipping fees are confirmed manually rather than computed, and there
is no analytics. See the [roadmap](./roadmap.md).

## Short description you can reuse

> tipind is a static, searchable catalog of generic and ethical-brand medicines
> shipped from India. Buyers can find products by ingredient, brand, maker or
> pack size, build a cart, and send a structured order to our team by email or
> Telegram — no account and no online payment. It is built with Next.js as a
> static export on Cloudflare and fed by a Google Sheet pipeline, so it stays
> fast and cheap to run.
