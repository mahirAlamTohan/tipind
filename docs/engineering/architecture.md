# Architecture

## Rendering model

The site is a **fully static export**. `next build` writes `out/`, which is
uploaded as Cloudflare Workers static assets. There is no Node runtime in
production, no API routes, no server actions and no middleware.

```
Browser ──GET /──────────────▶ out/index.html (prerendered shell)
        ──GET /_next/*───────▶ hashed JS/CSS/fonts (immutable, 1 year)
        ──GET /data/catalog.<hash>.dat ─▶ XOR → gunzip → validate → Zustand store
        ──localStorage───────▶ cart, checkout form
        ──mailto/telegram────▶ the human hand-off
```

Implications that shape the code:

- **No runtime environment variables.** `NEXT_PUBLIC_*` values are inlined at
  build time; changing them requires a rebuild.
- **No request-time personalisation.** Theme is resolved on the client by
  `next-themes`; the cart and form hydrate after mount (`skipHydration: true`)
  so server and client markup match.
- **No image optimisation service.** `images.unoptimized` is on and the hero is
  a 20 KB WebP with a build-time blur placeholder.
- **Trailing slashes** (`trailingSlash: true`) so `/checkout/` maps to
  `checkout/index.html` and the CDN's 404 handling stays simple.

## Directory layout

```
src/app/                 Route segments and file conventions only.
  layout.tsx             Fonts, metadata, providers, header, cart root, toaster.
  page.tsx               Landing page composition (client, because sections animate).
  checkout/page.tsx      Metadata + <CheckoutPage />.
  icon.tsx               Generated favicon (next/og).
  apple-icon.tsx         Generated touch icon.
  opengraph-image.tsx    Generated 1200×630 social card.
  manifest.ts            Web app manifest.

src/components/
  layout/                Chrome: header, top strip, nav, logo, theme toggle,
                         floating actions, offline banner, section links.
  sections/              Marketing sections. Pure presentational, content-driven.
  ui/                    Design-system primitives (button, card, container,
                         combobox, accordion, slider, tooltip, search field,
                         virtual list, reveal, sonner).
  providers/             Client provider wrappers (theme).

src/config/
  site.ts                Identity + contact + navigation, derived from env.
  content.ts             Every user-visible string for the marketing site.

src/features/<feature>/  Vertical slices. Each owns components, hooks, lib, store,
                         types and constants for one business capability.
  catalog/               Dataset parsing, search, filters, results, table, facets.
  cart/                  Persisted cart, sidebar, line maths, summaries.
  checkout/              Persisted form, validation, totals, message, dialog.

src/lib/                 Cross-feature helpers (formatting, guards, scroll,
                         brand artwork, cn).
src/hooks/               Cross-feature React hooks.
src/styles/main.css      Palette → semantic tokens → Tailwind theme.
src/types/               Shared type modules (site, content, tooltip).
scripts/                 Build-time tooling, not shipped.
docs/                    This documentation set.
```

### Rules the code follows

1. **Route files stay thin.** `app/` only composes; behaviour lives in features.
2. **Features do not import each other's components.** Checkout may use cart
   _lib/types_ (`cartLineSummary`, `CartLineItem`), never cart UI.
3. **All copy is typed content.** `satisfies SiteContent` / `CartContent` /
   `CheckoutContent` means a missing key fails `npm run typecheck`.
4. **One source for a value.** Delivery countries live in `config/site.ts`;
   checkout derives from them. Catalog format constants exist once in
   `features/catalog/constants.ts` and are mirrored (by hand) in
   `scripts/build-catalog.mjs`.
5. **No barrel files.** Imports are explicit so bundles stay predictable.
6. **`"use client"` only where needed**: pages that animate, stores, browser APIs.

## Runtime flow: the landing page

1. `app/layout.tsx` prerenders the shell: two local fonts, metadata (canonical,
   OG, Twitter), theme script, header, offline banner, tooltip provider,
   cart root and toaster. `CartRoot` hydrates the cart and applies the sidebar
   width/offset to `<html>`.
2. `app/page.tsx` renders hero → catalog → FAQ → about → contact → footer →
   floating actions.
3. `CatalogExplorer` calls `useCatalogLoader(siteConfig.catalog.dataUrl)`:
   - loads once per session (skips if the dataset is already in the store),
   - aborts on unmount,
   - reports `unconfigured | loading | ready | error`.
4. On success the raw artifact goes through `fetchCatalog`:
   magic check → XOR with the public key → `DecompressionStream("gzip")` →
   `JSON.parse` → `parseCatalog` (format version, dictionary, tuple and bounds
   validation) → `{ products, manufacturers, packaging, types, priceBounds }`.
5. `useCatalogResults` derives the visible rows:
   - `useDeferredValue` for query and price range (typing stays responsive),
   - `parseQuery` → `searchProducts` (custom weighted index),
   - `filterProducts` (facets + price),
   - slice to `loadedCount` (25-row pages, "load more" via IntersectionObserver).
6. Search highlighting maps folded match positions back to the original string
   (`findRanges`), so accents and punctuation survive in the rendered text.

## Runtime flow: cart and checkout

- `useCartStore` is a Zustand `persist` store with a **custom storage adapter**
  that parses and validates every read and merges duplicates on every write.
  Hydration is manual (`skipHydration`) and guarded by `isHydrated`, so the
  first paint never shows a guessed cart.
- `useCheckoutStore` persists only the shipping details, sanitised through a
  lenient Zod schema on read; the step and hydration flag stay in memory.
- `/checkout/` hydrates the form, computes totals (`computeTotals`), then drives
  a two-step form plus a dialog. Submitting a valid form opens the dialog; the
  message is built once with `useMemo` from trimmed details, items and totals.
- Finishing clears the cart, resets the step and navigates home.

## Error handling philosophy

- **Data that can be edited by hand is never trusted**: localStorage goes through
  normalisers (`parseItems`, `sanitizeDetails`); the catalog artifact is fully
  validated before use.
- **Fail visibly, not silently**: catalog errors surface the reason and an
  actionable hint; storage failures downgrade to session-only with a banner.
- **No error boundary yet.** A render error would blank the route; see the
  roadmap.

## Dependency rules

| Package                                     | Role                                                                                  | Guardrail                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `next`, `react`, `react-dom`                | Framework                                                                             | Keep React/Next majors aligned                         |
| `@base-ui/react`                            | Accessible headless primitives (button, dialog, combobox, slider, tooltip, accordion) | Style via our `ui/` wrappers only                      |
| `motion`                                    | Animation                                                                             | Always honour `useReducedMotion`                       |
| `zustand`                                   | State                                                                                 | One store per feature; no cross-store reads in actions |
| `zod`                                       | Validation                                                                            | Schemas stay in feature `lib/`                         |
| `clsx` + `tailwind-merge`                   | `cn()` class merging                                                                  | One helper: `@/lib/utils`                              |
| `class-variance-authority`                  | Variant maps                                                                          | Keep variants in the component that owns them          |
| `lucide-react`                              | Icons                                                                                 | Decorative icons are `aria-hidden`                     |
| `country-region-data`, `postcode-validator` | Address intelligence                                                                  | Country list is filtered by `SERVICED_COUNTRIES`       |
| `sonner`                                    | Toasts                                                                                | Copy comes from content modules                        |
| `next-themes`                               | Theme                                                                                 | Wrapped once in `components/providers`                 |

Build-time only: `scripts/build-catalog.mjs` (Node, no runtime dependency).

## Performance notes (measured on the current build)

- Landing HTML ≈ 17 KB gzipped; fonts ≈ 60 KB; hero image ≈ 20 KB.
- Catalog artifact ≈ 204 KB for 8,522 products (dictionary + tuple encoding).
- All JS chunks together ≈ 1.5 MB raw / ≈ 460 KB gzipped; a route loads a
  subset. The largest contributors are React, Motion and Base UI.
- The catalog request is a single immutable URL, `Cache-Control: immutable`, so
  repeat visits hit the CDN/browser cache.

## What is intentionally missing

Server rendering of personal state, API endpoints, a database, auth, a CMS,
tests, analytics, and a service worker. Each is either a deliberate product
decision or a roadmap item — see [decisions](../decisions/README.md) and
[roadmap](../product/roadmap.md).
