# Cleanup log — November 2026

A single maintenance pass over the repository: remove what was never used,
modernise what was stale, fix the bugs found while reading, and write down how the
site is put together.

Scope of the diff: 65 files changed, 2 deleted, plus this `docs/` folder, a
committed `package-lock.json`, a CI workflow template and a repo-wide Prettier
pass.

## Verification performed

| Check               | Result                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck` | Passes (`next typegen` + `tsc --noEmit`)                                                                              |
| `npm run lint`      | Passes, 0 errors/warnings (full project)                                                                              |
| `npm run build`     | Passes; static export of `/`, `/checkout`, `/icon`, `/apple-icon`, `/opengraph-image`, `/manifest.webmanifest`, `404` |
| Catalog decode      | Format 4, **8,522 products**, 700 manufacturers, bounds `$0.009 – $1,557.300`, XOR key matches                        |
| Dev server          | `/` and `/checkout/` render; cross-origin request with an `*.e2b.app` origin returns 200 (no dev-origin block)        |
| Hero image          | Build now emits a real blur placeholder instead of a 1×1 stub                                                         |

## Removed

### Files

| File                                | Why                                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/components/theme-provider.tsx` | Byte-identical duplicate of `components/providers/theme-provider.tsx`; only the latter was imported |
| `src/components/ui/input.tsx`       | Never imported; the checkout uses its own `controlClass` inputs                                     |

### Dependencies

| Package      | Why                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `minisearch` | Installed but never imported — search is a custom index (see [ADR 0003](../decisions/0003-custom-search-index.md))             |
| `cn`         | A second class-merging implementation used in exactly one file (`ui/tooltip.tsx`); now uses the project's `@/lib/utils` helper |

`libphonenumber-js` was moved from `dependencies` to `devDependencies`: it is
imported only for the `CountryCode` type, which is erased at build time.

### Dead content keys and types

Removed (with their type fields, so `tsc` keeps them gone):

- **Catalog**: `ui.cartCountLabel`, `paginationLabel`, `priceUnit`,
  `downloadAction`, `openCatalogAction`, `status.indexing`, `status.searchError`,
  `previousPage`, `nextPage`, `previousPageAriaLabel`, `nextPageAriaLabel`,
  `sourceNote` (an empty string behind a conditional).
- **Cart**: `browseCatalogAction`, `unitPriceLabel`, `quantityLabel`,
  `continueBrowsingAction`, `copyAction`, `copiedMessage`, `copyFailureMessage`.
- **Checkout**: `details.selectPlaceholder`, `details.unservicedNotice`,
  `dialog.pasteHint`, `dialog.emailSubject`, `message.payment`.
- **Types**: `ChannelId`, `ChannelCopy`, `SERVICED_COUNTRIES_TYPE`.
- **UI**: unused `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`,
  `CardFooter` exports (only `Card` and `CardContent` are used).

### Configuration and headers

- ESLint: removed the `public/sw.js` override (there is no service worker), the
  `geist` resolver exception (no such dependency), and a duplicated
  `tailwindcss/no-custom-classname` rule.
- `public/_headers`: removed caching/type rules for `/sw.js` and
  `/precache-manifest.json` — neither file exists in the export.
- `wrangler.jsonc`: removed `vars.NEXT_PUBLIC_CATALOG_DATA_URL`. It was stale
  (`catalog.e0a00877.dat`) and Worker vars cannot influence a static bundle
  anyway; the value is baked in from `.env.production`.
- Stale dev comments (`// ← new`, `// … card content unchanged …`,
  `// ← key change`).

## Bugs fixed

1. **Price filter wrote a field that does not exist.** `setPriceRange` returned
   `{ page: 1, … }` (left over from a pagination UI) and did not reset the
   infinite-scroll count, so changing the price range could leave a short list.
   It now resets `loadedCount` like the other filters.
2. **The cart stayed “open” on the checkout page.** `CartRoot` does not render
   the sidebar on `/checkout/`, but `<html data-cart="open">` kept the body
   padding for a panel that was not there. Opening checkout now closes the cart
   and the offset ignores an open state on that route.
3. **Shipping-country mismatch.** `DELIVERY_COUNTIES` included `IN` while the FAQ
   says the site ships to the USA, UK, New Zealand and Australia only. Aligned the
   config with the published policy and fixed the typo (`COUNTIES` →
   `COUNTRIES`); the India region/postal labels went with it.
4. **Unreachable “we don't ship there” notice.** The country combobox is built
   from the serviced list, so `showNotice` could never be true. Removed the dead
   branch and its copy. (Region and postal rules still adapt per country.)
5. **Lost error cause when the catalog download failed.** The rethrow dropped the
   underlying network error; it is now attached as `cause`.
6. **Hardcoded English in components.** Moved into content modules: catalog toast
   title/description, “matching”, “All loaded ✓”, “Loading more products”,
   unavailable-price dash, cart “Cart cleared”, product/packet plurals, “listed
   pack”, “{n} total”, the combobox “Show options” label, and the entire
   ordering-instructions/safety block in the order dialog.
7. **Hero image placeholder** used a hand-written 1×1 base64 blob that discarded
   Next's generated blur; removed, plus a duplicate `fetchPriority`.
8. **Stylesheet duplication.** `main.css` had two identical
   `@media (min-width: 64rem)` cart blocks (the first always overridden), two
   identical reduced-motion blocks, `--color-danger-400/600` declared twice, and
   a global `::selection { background: yellow }` that fought the themed
   `selection:` utilities. All cleaned up; behaviour is unchanged.
9. **`unitWord`** relied on `||` for an empty string (lint error and ambiguous
   intent); now explicit.

## Updated / modernised

| Area                        | Before                                           | After                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js                     | 16.4.0                                           | **16.4.5**                                                                                                                                                             |
| React / React DOM           | 19.3.0                                           | **19.3.1**                                                                                                                                                             |
| eslint-config-next / plugin | 16.4.0                                           | **16.4.5** (kept in lockstep)                                                                                                                                          |
| `package.json` scripts      | `dev`, `build`, `start`, `lint`, `catalog:build` | Added `preview`, `deploy`, `typecheck`, `lint:diff`, `format`, `format:check`; removed `start` (invalid for `output: "export"`); `lint` is now full-project by default |
| Deploy                      | Catalog+push script only                         | `wrangler` added as a dev dependency; `npm run deploy` builds and publishes; `npm run preview` serves `out/` locally                                                   |
| Catalog source URL          | Hardcoded in `package.json`                      | `CATALOG_SHEET_URL` env var (still build-time only); `--sheet` is optional                                                                                             |
| Dev origins                 | Two hardcoded LAN IPs                            | `NEXT_ALLOWED_DEV_ORIGINS` + `*.e2b.app` for hosted previews                                                                                                           |
| TypeScript                  | `target: ES2017`                                 | `target: ES2022` (matches `replaceAll`, `Array.at`, `Object.hasOwn` usage)                                                                                             |
| Lockfile                    | None committed                                   | `package-lock.json` committed, `.gitignore` updated                                                                                                                    |
| Env examples                | Empty catalog values                             | `.env.example` now reproduces a working dev setup; `.env.production` gains `NEXT_PUBLIC_SITE_URL` and `CATALOG_SHEET_URL`                                              |
| Headers                     | Image types for OG only                          | Added `/icon`, `/apple-icon`, `/manifest.webmanifest` content types                                                                                                    |
| Editor config               | Stale spellings and a Windows-only TS path       | Correct words, portable path, Prettier on save                                                                                                                         |
| Docs                        | `README.md` was the word “tipind”                | Full README + `docs/` set (product, engineering, decisions, changelog)                                                                                                 |

## Deliberately not changed

- No tests, analytics, service worker or CSP were added — they need decisions and
  ongoing ownership, and are tracked in the [roadmap](../product/roadmap.md).
- Shipping fees stay unset (`SHIPPING_MILLS` is empty), so the summary still says
  “To be confirmed”. The mechanism is ready; the numbers are a business input.
- `deploy.ps1` still stops after pushing. It is a catalog-refresh helper, not a
  publisher; use `npm run deploy` for Cloudflare.
- The cart storage version stays at 3 and the checkout version at 1. No data
  migration was needed for any of the fixes above.
- Prices, catalog data and contact details were not modified.

## Follow-ups worth doing first

1. Fill in real shipping fees and make the order message show them.
2. Add unit tests around search, catalog parsing, cart validation and the order
   message — those are the pure functions with the most logic.
3. Add a retry path for a failed catalog download.
4. Decide whether the “offline” notice should be backed by a service worker or
   reworded.
