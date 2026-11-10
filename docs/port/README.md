# Porting the hardening fixes to `arena/cd754b2a-tipind`

Two branches diverged after the review: this one (`arena/c093ba64-tipind`, the
review + remediation work) and `arena/cd754b2a-tipind` (the branch that is
actually deployed). They are not mergeable — `git merge-tree` reports 27
conflicting files, including `src/config/site.ts`, `src/features/catalog/lib/load-catalog.ts`
and `src/features/checkout/components/checkout-page.tsx`.

So the fixes are shipped as a **patch against a known commit** instead:

| | |
|---|---|
| Patch | [`security-port-2026-11.patch`](./security-port-2026-11.patch) |
| Applies to | `80f3c46` — tip of `origin/arena/cd754b2a-tipind` |
| Size | 22 files, +606 / −76 |
| Checked with | `git apply --check` in a clean worktree at `80f3c46` |

```bash
git switch arena/cd754b2a-tipind          # or a new branch off it
git apply --3way docs/port/security-port-2026-11.patch
npm run typecheck && npm run lint && npm run build && npm run verify
```

---

## 1. `DELIVERY_COUNTRIES_PROSE is not defined`

That error **cannot come from either committed branch tip**, which is why it did
not reproduce here.

* On `80f3c46` the constant is defined at `src/config/site.ts:127`
  (`export const DELIVERY_COUNTRIES_PROSE = DELIVERY_COUNTRIES.map(...)`) and used
  at line 206. A `ReferenceError` on a symbol that is defined ~80 lines above
  its use, in the same module, is not a module-level TDZ problem.
* The traceback points at **line 134**, a file ~70 lines shorter than either
  committed `site.ts`. That is a *different revision* of the file.
* This branch (`d7558b7`) does not contain the symbol at all — its `site.ts` has
  a different shape — so the error is not from here either.
* `next dev` does not typecheck. Turbopack/SWC strip types and execute; a missing
  identifier only surfaces at runtime. `npm run typecheck` (part of `verify` and
  CI) is what catches it, and it passes on both tips.

What that leaves:

1. a working copy edited by something else (another agent/session) whose
   `src/config/site.ts` is mid-edit, or
2. a stale `.next` cache whose client chunks still hold an older revision of the
   module while the server renders the new one.

Both are fixed the same way, and it costs nothing to rule out (2) first:

```bash
git status --short src/config/site.ts   # is it modified?
git stash push src/config/site.ts       # keep the edit, test the committed file
rm -rf .next && npm run dev             # stale-chunk case
```

If `git status` shows the file modified, `git diff src/config/site.ts` will show
the `countriesProse` block — check that whatever defines the constant is
exported before use and spelled identically.

**Guard worth adding to the pipeline** (not in this patch, because it needs your
decision on CI): run `npm run typecheck` in a `predev`/`prebuild` hook, or at
least in CI on every push. `next dev` alone will never tell you about this class
of error.

---

## 2. What the patch changes

### Error boundaries (the fix for "the site dies with a blank screen")

| File | Role |
|---|---|
| `src/components/error-boundary.tsx` | Class boundary; logs to console only (no third-party reporting, no PII) |
| `src/components/error-fallback.tsx` | `ErrorPanel` (in-place, for islands) and `ErrorScreen` (route-level) with retry + "Back to the catalog" |
| `src/app/error.tsx`, `src/app/checkout/error.tsx` | Route-level fallbacks |
| `src/app/global-error.tsx` | Root-layout fallback; inline styles and a plain `<a href="/">` so it renders even with CSS/module failures |
| `src/features/catalog/components/catalog-boundary.tsx` | Client wrapper so the server catalog page can pass `children` (render-prop fallbacks cannot cross the RSC boundary) |
| `src/features/cart/components/cart-fallback.tsx` | Clears `data-cart` / `--cart-width` on failure so the page offset does not stay stuck |

Wired into `src/app/page.tsx` (catalog), `src/features/cart/components/cart-root.tsx`
(cart sidebar) and `src/features/checkout/components/checkout-page.tsx` (order
dialog, with an in-dialog fallback so the dialog can be closed). Ten new strings
live under `ui.*` in `src/config/content.ts` / `src/types/content.ts`.

The failure the user actually hit (`DELIVERY_COUNTRIES_PROSE`) is a *module
evaluation* error, not a render error: no boundary can catch it, and in
production the build would fail instead. The boundaries cover the render-time
class — bad storage, a thrown child, a failed dynamic import — which is what
produced the blank pages.

### Notes field: no more impersonating the message structure

* `MAX_NOTES_LENGTH` 1 000 → **240** (`src/features/checkout/constants.ts`).
* `sanitizeDetails` **truncates instead of rejecting** (`src/features/checkout/lib/details.ts`):
  a pasted 5 000-character field used to fail validation and silently become `""`;
  now it is capped, and short fields go through `toSingleLine` so a newline
  cannot glue two words together (`Jane\nORDER------` → `Jane ORDER------`).
* `buildOrderMessage` scrubs every value it emits (`src/features/checkout/lib/order-message.ts`):
  one line, and the structural markers (`ORDER------`, `ITEMS`,
  `SHIPPING ADDRESS`, `NOTES`, `order subtotal`, `order+shipping`) are removed
  from any interpolated value — notes, names, product names from the catalog.
  Before, `details.notes` was passed through with only a blank-line squeeze, so a
  buyer (or anyone who can write to `localStorage`) could forge a
  `order subtotal: $0.001` line in the email the shop staff read.
* `bind()` now sets `maxLength` on **every** field, not just the textarea
  (`src/features/checkout/components/details-form.tsx`), so paste and
  autofill cannot exceed the cap before validation runs.
* Copy change: the field is "Delivery instructions" with a hint that
  prescription/medical details do not belong there, and the saved-on-device note
  says the data is cleared when you finish.

### Prices fail closed

* `src/features/cart/lib/line-items.ts` rejects `price <= 0` (it only had an
  upper bound).
* `src/features/catalog/lib/load-catalog.ts` validates every row against the
  artifact's own `priceBounds` and rejects non-positive prices, so a corrupt
  catalog throws at load instead of rendering a price the cart will refuse.

### Smaller items

* `public/_headers`: `/checkout/*` gets `X-Robots-Tag: noindex, nofollow, noarchive`
  (the pages already had `Cache-Control`).
* `finish()` clears the persisted checkout details (`clearDetails()` +
  `useCheckoutStore.persist.clearStorage()`) so name, address and email do not
  sit in `localStorage` for the next person on the device.

### Two changes *to* the gates (revert if you disagree)

1. `scripts/verify-export.mjs`: first-load request budget **24 → 26**. The three
   error-boundary chunks add 3 requests and ~4.5 KB gzip; the other two budgets
   are untouched (298.7 / 420 KB JS, 424.1 / 900 KB transfer).
2. `scripts/verify-export.mjs`: the budget block printed `ok …` for all three
   numbers *before* checking them, so an over-budget run showed a green line
   followed by `FAIL`. Reporting and decision now happen in one `compare()`
   helper; verified by temporarily setting the budget to 1 (prints only
   `FAIL first-load requests 25 exceed the budget of 1`).

## 3. How this was verified

Run in a worktree of `80f3c46` with the patch applied:

```
npm run typecheck   clean
npm run lint        clean (eslint --max-warnings=0, full type-aware run)
npm run build       10 static pages, export written
npm run verify      13/13 checks pass
```

Live behaviour was checked by driving the pure functions, since the sandbox has
no headless browser:

```
sanitizeDetails({ notes: "y".repeat(5000) }).notes.length       240
createLineItem({ priceMills: -500000 })                         null
buildOrderMessage({ notes: "ignore\n\nORDER------\norder subtotal: $0.001\nSHIPPING ADDRESS\n…" })
  count of "ORDER------" in the output                          1   (was 2)
  count of "SHIPPING ADDRESS"                                   1   (the real heading)
  name field rendered as                                        "Name: Jane x Doe"
```

What is **not** covered: clicking the boundaries in a browser (no headless
Chromium in this sandbox), and the deployed Worker headers (only `_headers` is
asserted, never observed through `wrangler`).

## 4. Still open, deliberately

* `persist.rehydrate()` has no `.catch` — a rejected promise on corrupt storage.
* `arena/cd754b2a-tipind` answers `/does-not-exist/` with a 308 instead of a 404
  (this branch returns the branded 404).
* Deploy-time 404 ordering for the Worker (B-04) and the "Copied" toast timer
  (B-06) are unchanged here.
* The catalog pipeline split (ADR 0008) is a separate PR and touches CI.
