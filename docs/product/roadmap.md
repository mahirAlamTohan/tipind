# Roadmap

A plan that fits the actual size of the project: one static site, one maintainer,
a catalog that changes a few times a week.

## Shipped (v1.0.0)

- Static export on Cloudflare Workers, immutable asset caching, security headers.
- Catalog pipeline: Google Sheet → Apps Script → hashed, masked, gzipped artifact.
- Catalog explorer: weighted search, tri-state facets, price range, infinite
  scroll, highlighting, 8,522 products.
- Cart: persisted, tab-synced, resizable docked sidebar, packet-aware summaries.
- Checkout: review → country-aware delivery form → order dialog with a copyable
  plain-text order.
- Theming: system/light/dark with a circular reveal, token-driven, reduced-motion
  aware, local fonts, generated icons and OG image.
- Accessibility baseline: keyboard paths, live regions, focus management,
  labelled controls.
- Documentation set (this folder) and a cleaned-up dependency/config surface.

## Next — high value, small effort

| Item                   | Why                                                              | Sketch                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Real shipping fees** | The summary always says “To be confirmed”                        | Fill `SHIPPING_MILLS` per country (or per weight band), show it in the summary, include it in the order message; keep “confirmed by the team” for parcel splits |
| **Catalog retry**      | A transient network failure currently requires a reload          | Add `retry()` to the catalog store and a “Try again” button in the error state                                                                                  |
| **Offline story**      | The offline banner promises more than the browser cache delivers | Either add a small service worker that caches the app shell and the catalog file, or reword the notice to describe browser caching honestly                     |
| **Tests**              | Search, parsing and cart maths have no regression net            | Vitest for `parseCatalog`, `searchProducts`, `parseItems`, `validateDetails`, `buildOrderMessage`; one Playwright smoke flow                                    |
| **Error boundary**     | A render error blanks the route                                  | Route-level error component with a “reload” and a contact link (static export ⇒ client boundary only)                                                           |
| **Analytics**          | Zero data on where people drop off                               | Privacy-friendly page/event tracking (search, add-to-cart, checkout step, copy message) with a consent-free, cookieless provider                                |

## Next — worth planning

- **CSP**: the only inline script is `next-themes`' theme bootstrap. A hash-based
  CSP (or a nonce with a small serverless edge function) would let us drop the
  permissive `script-src`.
- **Order message polish**: include an explicit parcel-count estimate, a
  `shipping` line that matches the computed value, and a cleaner template
  (the current copy has a few awkward phrases).
- **Direct crypto details**: once a payment method is chosen, show the network
  and wallet address (or a QR) in the dialog instead of a free-text preference.
- **Quantity entry**: allow typing a quantity in the cart, not just stepping.
- **Catalog health report**: publish the build report (invalid rows, needs-review
  count) somewhere the team sees it, so sheet problems are fixed at the source.
- **PWA install**: the manifest and icons already exist; add a service worker and
  an install prompt if offline use matters.

## Later / explicitly out of scope

- Online card payments, full checkout, tax calculation.
- User accounts, order history, server-side order storage.
- Live inventory or real-time price sync (the sheet is the source; deploys are
  the sync).
- Prescription upload and pharmacist workflow.
- Multi-language UI, multi-currency pricing.
- A public API.

## Known limitations (current)

| Area     | Limitation                                                              | Impact                                                                             |
| -------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Catalog  | Prices refresh only on deploy                                           | Low — team confirms final amount                                                   |
| Catalog  | No fuzzy/typo tolerance in search                                       | Low — spacing/punctuation is handled                                               |
| Catalog  | One bad row is dropped silently (counted in the report only)            | Low — review the build report                                                      |
| Checkout | Shipping always “to be confirmed”                                       | Medium — more back-and-forth per order                                             |
| Checkout | Address is saved in plain `localStorage`                                | Accepted — device-local, no server copy                                            |
| Checkout | No order receipt/confirmation screen                                    | Low — the copied message is the receipt                                            |
| UI       | Tri-state facets use `aria-pressed` (binary semantics) for three states | Low — the label describes the state, but a screen-reader user may need the tooltip |
| Ops      | No automated tests, analytics or client error reporting                 | Medium — regressions are found by hand                                             |
| Ops      | No lockfile pins for Bun users (npm lock is committed)                  | Low — versions are pinned or range-limited                                         |
| Content  | Copy is English-only and reviewed by developers                         | Low                                                                                |

## Suggested sequence

1. Shipping fees + order message polish (directly reduces back-and-forth).
2. Tests around the pure functions (cheap, protects the riskiest code).
3. Catalog retry + error boundary (robustness on flaky mobile networks).
4. Analytics, then decide the next UX work from data.
5. Service worker or a more honest offline message — whichever matches how
   buyers actually use the site.
