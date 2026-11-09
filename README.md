# tipind

A fully static pharmaceutical catalog and order-request site. Visitors search
~8,500 products, build a cart, fill in delivery details, and send the finished
order to the team by email or Telegram. There is no server, database, account
system or online payment: `next build` produces plain files that are served from
Cloudflare Workers static assets.

- **Live site:** https://tipind.mahiralamtohan.workers.dev
- **Stack:** Next.js 16 (static export) · React 19 · TypeScript · Tailwind CSS v4 · Base UI · Zustand · Zod
- **Docs:** [`docs/`](./docs/README.md) — start with the [product brief](./docs/product/brief.md)

## Quick start

```bash
npm install          # or: bun install
npm run dev          # http://localhost:3000
```

The repository already ships a built catalog (`public/data/catalog.d50350bf.dat`)
and public environment values in `.env.production`, so a fresh clone renders the
full catalog without any extra setup. For local overrides copy `.env.example`
to `.env.local`.

| Script                  | What it does                                            |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev`           | Next.js dev server                                      |
| `npm run build`         | Static export into `out/`                               |
| `npm run preview`       | Serve `out/` with Wrangler (closest to production)      |
| `npm run deploy`        | Build, then `wrangler deploy` to Cloudflare             |
| `npm run typecheck`     | `tsc --noEmit`                                          |
| `npm run lint`          | ESLint (full project)                                   |
| `npm run format`        | Prettier over the repo                                  |
| `npm run catalog:build` | Rebuild the catalog artifact from the live Google Sheet |

A ready-to-use CI pipeline (typecheck, full lint, formatting, static build and a
catalog-integrity check) ships as
[`docs/engineering/ci-workflow.yml.example`](./docs/engineering/ci-workflow.yml.example).
Copy it to `.github/workflows/ci.yml` to enable it — that file needs the
`workflows` permission when pushed.

## How it is put together

```
src/
  app/            routes: / (landing + catalog), /checkout, generated icons & OG image
  components/
    layout/       header, top strip, floating actions, offline banner, logo
    sections/     hero, FAQ, about, contact, footer (content-driven, no data)
    ui/           design-system primitives (button, card, combobox, slider, …)
    providers/    next-themes wrapper
  config/         site.ts (env-driven identity) + content.ts (all site copy)
  features/
    catalog/      dataset loader, search index, filters, store, table & filter UI
    cart/         persisted cart store, sidebar, line items, summaries
    checkout/     persisted form store, validation, totals, order message, dialog
  lib/            formatting, scroll helpers, guards, brand artwork, CN helper
  styles/         main.css: palette → semantic tokens → Tailwind theme
scripts/          build-catalog.mjs (Google Sheet → versioned binary artifact)
docs/             product, engineering and decision documentation
```

Nothing in `src/` talks to a backend. The only network request is a `GET` of the
versioned catalog file, which is XOR-unmasked, gunzipped and validated in the
browser.

## Documentation

| Read this                                                  | If you want to know                                                   |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| [Product brief](./docs/product/brief.md)                   | What the site is, who it is for, and the one-paragraph pitch          |
| [Requirements & scope](./docs/product/requirements.md)     | Goals, user stories, scope, non-goals, success measures               |
| [User flows](./docs/product/user-flows.md)                 | How someone goes from landing page to a sent order                    |
| [Roadmap](./docs/product/roadmap.md)                       | What shipped, what is next, what is deliberately out                  |
| [Architecture](./docs/engineering/architecture.md)         | Rendering model, folder layout, runtime flow                          |
| [Catalog pipeline](./docs/engineering/catalog-pipeline.md) | Google Sheet → Apps Script → binary artifact → browser                |
| [Data & state](./docs/engineering/data-and-state.md)       | Zustand stores, localStorage contracts, validation                    |
| [Design system](./docs/engineering/design-system.md)       | Color tokens, typography, motion, component rules                     |
| [Operations](./docs/engineering/operations.md)             | Environment variables, build/deploy, catalog refresh, troubleshooting |
| [Decisions](./docs/decisions/README.md)                    | Why the site is static, obfuscated, custom-search, messenger-first    |
| [Cleanup log](./docs/changelog/cleanup-2026-11.md)         | Everything removed, fixed and modernised in this pass                 |

## Deploying a catalog update

```bash
npm run catalog:build     # pulls the sheet, writes public/data/catalog.<hash>.dat,
                          # points NEXT_PUBLIC_CATALOG_DATA_URL at it, prunes old files
npm run deploy            # rebuilds and publishes to Cloudflare
```

`./deploy.ps1` is a Windows helper that does the catalog rebuild, commit and push
in one interactive step.

## Notes

- Every `NEXT_PUBLIC_*` value is baked into the static bundle and is public. The
  catalog XOR key is obfuscation, not encryption.
- The site takes no payments. Prices in the catalog are per packet; the team
  confirms availability, VAT and shipping after the order arrives.
- This project has a medical-information disclaimer in the footer. It is a storefront
  and product directory, not a source of medical advice.
