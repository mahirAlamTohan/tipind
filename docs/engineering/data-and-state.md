# Data & state

There is no database. Three Zustand stores hold everything, and two of them are
mirrored into `localStorage` through validating adapters.

## Store map

| Store    | File                                      | Persisted | Lifetime      | Owns                                                          |
| -------- | ----------------------------------------- | --------- | ------------- | ------------------------------------------------------------- |
| Catalog  | `features/catalog/store/catalog-store.ts` | no        | session       | dataset, query, facets, price range, filter panel, pagination |
| Cart     | `features/cart/cart-store.ts`             | yes, v3   | until cleared | line items, open state, hydration/storage flags, panel width  |
| Checkout | `features/checkout/checkout-store.ts`     | yes, v1   | until cleared | shipping details, current step, hydration flag                |

Actions live inside each store under an `actions` object, so components select
`state.actions.addProduct` (stable reference) instead of re-creating callbacks.

### Catalog store

```ts
{
  status: "loading" | "unconfigured" | "ready" | "error",
  error: string,
  dataset: CatalogDataset | null,
  query: string,
  loadedCount: number,            // 25-row pages
  filtersOpen: boolean,
  manufacturer: ReadonlyMap<string, "include" | "exclude">,
  packaging:    ReadonlyMap<string, "include" | "exclude">,
  priceRange: [number, number] | null,   // null === full range
}
```

Facet state is a **tri-state map per facet**: absent → include → exclude →
absent. Any facet or price change resets `loadedCount` so a filter never leaves
an empty-looking first page. `priceRange` collapses to `null` when the selected
range equals the dataset bounds, which keeps “is this filtered?” honest.

### Cart store

`CartLineItem` is a denormalised snapshot of the product (name, ingredient,
manufacturer, packaging, type, `unitPriceMills`, `quantity`). It is
denormalised on purpose: the cart must render and total correctly even before
(or without) the catalog download.

The id is **derived**, not stored arbitrarily:

```ts
lineItemId = JSON.stringify(
  [name, ingredient, manufacturer, packaging, type, unitPriceMills].map(
    normalizeText
  )
)
```

so a saved cart stays stable across catalog rebuilds _as long as those fields do
not change_, and two tabs adding the same product converge on the same line.
Stored ids are ignored and recomputed on load.

### Checkout store

Shipping details only: names, email, company, address lines, city, region,
postal code, country, preferred payment method, notes. The step (`review` /
`details`) is in memory so a reload always starts at the review step.

## localStorage contracts

| Key                    | Value                                   | Version | Notes                                             |
| ---------------------- | --------------------------------------- | ------- | ------------------------------------------------- |
| `tipind:order-cart:v3` | `{ version: 3, items: CartLineItem[] }` | 3       | Version bump = prices changed from cents to mills |
| `tipind:checkout:v1`   | `{ details: ShippingDetails }`          | 1       | Read through a lenient Zod schema                 |
| `tipind:cart-width`    | integer pixels (string)                 | —       | UI preference, clamped on read                    |

### Cart read path

`parseItems(raw)` → reject >2 MB → `JSON.parse` → require
`version === 3` → `normalizeItems`:

- every candidate must be an object with string fields and a safe-integer price
  in `0 … 100,000,000` mills; otherwise it is dropped,
- text is trimmed and clipped to 1,000 chars,
- quantity is clamped to `1 … 9,999`,
- duplicate ids are merged (quantities summed, then clamped),
- the list is capped at 500 lines.

The result is `[]` on any structural problem — never a crash, never a partially
valid line.

### Cart write path

`serializeItems` re-runs the normaliser before writing, so even a bug in UI code
cannot persist an invalid quantity or price. Writes are skipped when the payload
is byte-identical to the last write, and failures flip
`isStorageAvailable: false`, which surfaces a “session only” banner in the
sidebar.

### Cross-tab behaviour

`CartRoot` listens for the `storage` event and rehydrates the cart, so adding an
item in one tab updates the other. The panel width is a UI preference and is not
synced.

### Hydration

Both persisted stores use `skipHydration: true`. A component calls
`persist.rehydrate()` after mount and then sets `isHydrated`. Until then:

- the cart shows a “Loading your cart…” status instead of an empty state,
- add-to-cart buttons stay disabled (they would otherwise be ambiguous while
  `isHydrated` is false),
- `/checkout/` shows a skeleton.

This is what keeps the prerendered HTML and the first client render identical.

## Cart maths

- `unitPriceMills` is per **packet**.
- `lineTotalMills = unitPriceMills × quantity`.
- `totalMills = Σ lineTotal` (integers, no floating-point money).
- `packetCount = Σ quantity` (the badge number).
- `unitsPerPacket(packaging)` parses `1x10`, `1x10x2`, `10s` and similar; the
  cart summary turns packets into dosage units (“100 tablets of 2 B12 TAB”).
  Unparseable packaging counts as 1 unit.
- `unitWord(type, count)` pluralises with two rules (`…y → …ies`, `s/x/z/ch/sh →
…es`) and falls back to “unit” when the catalog has no type.

## Checkout validation

Two different schemas, on purpose:

- **Lenient (`sanitizeDetails`)** for reading storage: a bad field becomes `""`,
  a bad country resets the whole object. Never throws, never blocks a render.
- **Strict (`validateDetails`)** for submitting: built per country.

Strict rules:

| Field                                   | Rule                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| firstName, lastName, addressLine1, city | non-empty after trim                                                                              |
| email                                   | required + `z.email()`                                                                            |
| region                                  | required for US/AU; otherwise optional; if the country has a region list, the value must be in it |
| postalCode                              | required when `postcode-validator` knows the country; must match that country's format            |
| country                                 | must be in `SERVICED_COUNTRIES`                                                                   |
| paymentMethod                           | free text constrained to the known ids by the sanitizer                                           |
| notes, company, addressLine2            | optional, length-limited                                                                          |

Errors are **kinds** (`required`, `email`, `postal`, `region`), and the visible
string comes from `checkout/content.ts`. The form only shows an error after the
field was blurred or after a submit attempt, and focuses the first invalid
control after a failed submit.

Zod schemas are memoised per country (`schemas` map) because the region set is
rebuilt from `country-region-data`.

## Totals and shipping

`computeTotals(subtotalMills, country)` returns:

```ts
{ subtotalMills, charges: [{ id: "shipping", amountMills: number | null }],
  totalMills, isFinal }
```

`SHIPPING_MILLS` is currently an **empty map**, so shipping renders as
“To be confirmed”, `totalMills` equals the subtotal and `isFinal` is false. This
is deliberate: shipping depends on parcel count and is quoted by the team. Once
real fees exist, add them to `SHIPPING_MILLS` (mills per country) and the UI
already handles the rest.

## Order message

`buildOrderMessage` produces plain text:

```
order subtotal: $12.345
order+shipping: will be calculated at checkout …

ORDER------
Name: Jane Doe
Company: …

SHIPPING ADDRESS
12 Example Street
City, ST 12345
United States

ITEMS
100 tablets of 2 B12 TAB
…

NOTES
…

Main email: jane@example.com

Preferred payment: Bitcoin (BTC)
```

It is the only artefact that leaves the browser, and it is copied to the
clipboard by the visitor. The site never transmits it.

## Privacy

- No cookies, no analytics, no third-party requests.
- Cart and address live in the visitor's `localStorage` and can be cleared from
  the cart sidebar and the checkout form.
- Contact details (phone, email, WhatsApp, Telegram) are public by design.
- The catalog file is public and intentionally unencrypted (see
  [ADRs](../decisions/README.md)).
