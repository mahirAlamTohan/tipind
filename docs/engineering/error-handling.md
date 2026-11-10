# Error handling

Where a failure is caught, what the buyer sees, and what deliberately has no
boundary. Companion to the [security review](../security/review-2026-11.md)
(B-02, F-06) and to
[ADR 0001](../decisions/0001-static-export-on-cloudflare.md): with no server,
every recovery path is client-side.

## Principles

1. **One boundary per failure domain.** A crash in the catalog should not blank
   the checkout, and a crash in the cart should not blank the catalog.
2. **A fallback must not depend on the thing that broke.** `global-error.tsx`
   therefore uses inline styles and no providers; route fallbacks avoid the
   theme provider and the router.
3. **Fail closed on data, fail open on chrome.** Bad data must stop the feature
   (a corrupt catalog shows an error, not prices). Decorative chrome may
   disappear rather than take the page with it.
4. **Never catch and hide.** Every boundary logs once to the console with a
   label; there is no telemetry, so the console is the only trace.
5. **Boundaries are for render errors.** Promises, timers and event handlers
   are handled where they happen (see §4).

## 1. Surfaces and their handlers

| #   | Surface                            | What can fail                                                                                    | Handler                                           | What the visitor sees                                                       |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Root layout (`src/app/layout.tsx`) | `new URL(siteConfig.url)` with a bad env value, font loading, theme provider, header, cart mount | `src/app/global-error.tsx`                        | Full-page message, inline CSS, retry + home                                 |
| 2   | Any page segment (`/`)             | Hero, FAQ, about, contact, footer, floating actions                                              | `src/app/error.tsx`                               | Route-level panel, retry + home                                             |
| 3   | `/checkout` segment                | Stepper, review step, summary, form                                                              | `src/app/checkout/error.tsx`                      | Checkout-specific copy: "your cart is safe"                                 |
| 4   | Unknown path                       | No route                                                                                         | `src/app/not-found.tsx` → `404.html`              | "This page doesn't exist" + catalog link                                    |
| 5   | Catalog island (`app/page.tsx`)    | Search/toolbar/table render                                                                      | `<ErrorBoundary label="catalog">` + `ErrorPanel`  | In-page panel where the catalog sits; the rest of the home page still works |
| 6   | Cart sidebar (`cart-root.tsx`)     | Sidebar, line items, quantity controls                                                           | `<ErrorBoundary label="cart">` + `CartFallback`   | Small fixed notice + reload; layout offset reset                            |
| 7   | Order dialog (`checkout-page.tsx`) | Message building, clipboard, modal                                                               | `<ErrorBoundary label="order-dialog">` + overlay  | Dialog-shaped panel with retry and close; the form stays filled             |
| 8   | Catalog download/parse             | Network, 404, wrong key, corrupt artifact, price outside bounds                                  | `useCatalogLoader` → store `error`                | Existing status bar + empty state (no boundary needed)                      |
| 9   | `localStorage` read/write          | Disabled storage, quota, corrupt JSON, version mismatch                                          | `try/catch` in both stores, `isStorageWritable()` | Cart/checkout work for the visit; a banner explains persistence is off      |
| 10  | Clipboard                          | Permission denied, insecure context                                                              | `useCopy` catch → `failed` state                  | "Couldn't copy. Select the text and copy it manually."                      |
| 11  | `localStorage` contents            | Hand-edited or hostile values                                                                    | `sanitizeDetails`, `parseItems`, `normalizeItems` | Safe defaults; no throw                                                     |
| 12  | Hydration                          | Server/client markup mismatch                                                                    | `skipHydration`, `suppressHydrationWarning`       | No flash, no duplicate render                                               |

Files added for 1–7:

```
src/components/error-boundary.tsx     reusable class boundary (label + reset)
src/components/error-fallback.tsx     ErrorPanel (in-page), ErrorScreen (route)
src/app/global-error.tsx              last resort, replaces <html>
src/app/error.tsx                     route segment
src/app/checkout/error.tsx            checkout segment
src/app/not-found.tsx                 static 404
src/features/cart/components/cart-fallback.tsx
```

## 2. Why not a boundary everywhere

Wrapping every section in its own boundary turns a systemic failure (a broken
config, a bad deploy) into a page of unrelated panels, and makes real bugs
quieter. The rule used here:

- **Boundary** where the failure is plausible and local: third-party-ish data
  (catalog), user-owned state (cart), a modal that builds a big string (order
  dialog).
- **Route boundary** for everything else. If the hero or the footer crashes, the
  page is broken anyway and a single honest panel is better than six.
- **Layout chrome** (header, footer) has no separate boundary: a crash there is
  almost always a data/config bug that the route or global boundary should
  surface.

If a section later becomes independently failure-prone (a new payment widget, an
embedded map), wrap it with `ErrorBoundary` and give it a panel, not a page.

## 3. The notes field

The checkout's free-text notes were the only field that accepted newlines, and
the message builder pasted them verbatim into the order — which allowed a forged
`ORDER------` block, a fake subtotal and a second address. The field is now
treated as **delivery instructions**, not as correspondence:

| Control                           | Where                                                                                                     | Effect                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Label + placeholder + hint        | `checkout/content.ts`                                                                                     | "Delivery instructions", "no medical or prescription details" |
| 240-character cap                 | `constants.ts`, `maxLength` in the form, sanitiser truncates instead of dropping                          | Bounded message size; a paste cannot erase the field          |
| Control characters stripped       | `sanitizeDetails` (all fields)                                                                            | No `\r`, `\0`, bidi or line separators from a tampered store  |
| Short fields forced onto one line | `sanitizeDetails`                                                                                         | A hand-edited `firstName` cannot inject a heading             |
| Newlines flattened on compose     | `buildOrderMessage`                                                                                       | Notes always land on one line after `NOTES`                   |
| Structural words removed          | `buildOrderMessage` (separator, `SHIPPING ADDRESS`, `ITEMS`, `NOTES`, `order subtotal`, `order+shipping`) | No value can imitate a section heading                        |
| Item lines scrubbed               | `buildOrderMessage`                                                                                       | A catalog product name cannot forge structure either          |

What is deliberately **not** done:

- **No word blocklist.** "cancer", "prescription" and similar are legitimate in
  a delivery note ("ring the bell at the oncology ward") and impossible to
  police reliably without a server. The control is the copy, the cap and the
  human check.
- **No required checkbox.** It adds friction at the moment of highest intent and
  does not prevent the harm it pretends to prevent. A visible hint is better.
- **No client-side "validation" that blocks sending.** With no server, a
  determined buyer can always edit the copied text; the defence is that the team
  re-prices and confirms every order (documented in
  [operations](./operations.md)).

The remaining, unavoidable limitation: **the buyer can edit the message after
copying it.** No static site can prevent that. Adding an order reference and a
timestamp to the message, and asking buyers to quote the reference in a separate
message, is the next step if forged orders ever appear.

## 4. What boundaries do not catch

React error boundaries only catch errors during rendering, in lifecycle methods
and in constructors. They do **not** catch:

| Source                        | Handled where today                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `fetch` / promises            | `useCatalogLoader` `.catch`, `useCopy` `try/catch`                                               |
| `setTimeout` / `setInterval`  | None currently; keep timers trivial and synchronous                                              |
| Event handlers (`onClick`, …) | Not caught. Keep handlers small; wrap anything that can throw in `try/catch` and surface a toast |
| `localStorage` access         | `try/catch` in both stores                                                                       |
| Errors inside a fallback      | Nothing — that is why `global-error` is dependency-free                                          |

If a handler ever does real work (a future API call), wrap it:

```ts
try {
  await doTheThing()
} catch (error) {
  console.error("[tipind] doTheThing", error)
  toast.error("That didn't work. Please try again.")
}
```

## 5. Testing a boundary

Boundaries are cheap to verify and easy to get wrong (a fallback that imports
the theme provider will crash inside the crash). To check one:

1. **Catalog panel:** add `throw new Error("boundary test")` at the top of
   `CatalogTable` (`src/features/catalog/components/catalog-table.tsx`), run
   `npm run dev`, load `/`. Expect the panel in place of the table, the hero and
   FAQ still rendered, and one `[tipind] catalog failed to render` log. Revert.
2. **Route panel:** throw at the top of `Home`. Expect `error.tsx` — header,
   footer and cart still present.
3. **Checkout panel:** throw inside `OrderSummary`. Expect
   `checkout/error.tsx`, not the home page.
4. **Global panel:** run `NEXT_PUBLIC_SITE_URL="not a url" npm run dev` (the
   `new URL` in `metadataBase` throws during layout render). Expect the unstyled
   global page with working retry and home links. Revert the env var.
5. **404:** visit `/does-not-exist`. In the static export this is `404.html`;
   check it contains the custom copy, not Next's default.
6. **Cart notice:** throw inside `CartSidebar`. Expect the bottom notice, and
   `document.documentElement.dataset.cart === "closed"` (no phantom page offset).

Run `npm run build` afterwards: a boundary that imports something unavailable in
a static export fails at build time, which is the cheapest place to find out.
