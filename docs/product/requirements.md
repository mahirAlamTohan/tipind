# Requirements & scope

This is the reconstructed product plan for the site as it exists. It is written
the way the project should have been scoped, and it doubles as the checklist for
any future change.

## Problem

The team sells medicines from a Google Sheet. Sharing that sheet is leaky and
unusable on a phone: no search, no pack awareness, no way to collect a clean
order. Buyers need to answer four questions quickly — _do you have it, what pack
is it, what does it cost, and where do you ship_ — and then tell the team what
they want without retyping a long list.

## Goals

1. **Find a product in seconds.** Search must tolerate partial words, accents,
   punctuation variations ("A. S Life" vs "as life") and typos of spacing.
2. **Show a trustworthy rate.** Every row shows pack, manufacturer and a USD
   price with three decimals, straight from the sheet the team maintains.
3. **Turn a cart into a complete order.** Name, address, country, optional
   payment preference and notes, validated before the visitor leaves.
4. **Cost almost nothing to run and nothing to break.** No server, no database,
   no credentials in the client beyond public contact details.
5. **Be usable on a mid-range phone on a slow connection**, including the
   ability to keep browsing after the first load with no network.

## Non-goals

- Online payment or card handling.
- User accounts, order history, or server-side order storage.
- Inventory counts or real-time stock.
- Prescription upload / pharmacist review workflow.
- Multi-language UI (English only for now).
- A public API.

## Personas

| Persona                       | Context                                         | Needs                                                          | Friction to avoid                            |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- |
| **Repeat buyer** (Rafiq)      | Knows the products, orders monthly from a phone | Fast lookup, saved address, quantity nudging                   | Re-typing the address every time             |
| **New buyer** (Dana)          | Sent a link by a friend, cautious               | Clear shipping regions, payment options, proof of legitimacy   | Feeling pushed to pay online                 |
| **Wholesale-ish buyer** (Sam) | Wants many packets of a few products            | Pack sizes, line totals, a message they can forward internally | Losing the cart on refresh                   |
| **The team**                  | Reads orders in email/Telegram                  | Structured, complete, unambiguous messages                     | Orders missing address or payment preference |

## User stories (acceptance criteria)

- **Search** — typing "amox" surfaces amoxicillin products; matches are
  highlighted in name, ingredient, manufacturer and pack; multi-word queries also
  match when spaces are removed.
- **Filter** — a manufacturer chip cycles include → exclude → off; the active
  filter count updates; "Clear filters" removes facets but leaves the search text.
- **Price filter** — the range slider is bounded by the catalog's real min/max;
  dragging to the extremes removes the filter instead of storing a redundant one.
- **Cart** — adding the same product twice increments quantity; quantity is
  clamped 1…9,999; removing all items shows an empty state; a bad/edited
  `localStorage` payload never crashes the page and never resurrects an invalid
  price.
- **Persistence** — reloading keeps the cart and the address; a second tab sees
  the latest cart (storage event rehydration).
- **Checkout** — the visitor cannot reach the order dialog with an invalid
  email, missing name/street/city, or an out-of-format postal code for the
  selected country; the country determines which region list and postal rules apply.
- **Order message** — contains subtotal, address block, every item as
  "N tablets of <product>", notes, email, and the preferred payment label.
- **Accessibility** — keyboard reachable everywhere; the sidebar takes focus when
  opened and returns it when closed; status changes are announced; motion is
  suppressed under `prefers-reduced-motion`.
- **Performance** — the landing page is static HTML; the catalog is one
  immutable ~200 KB request; subsequent filtering is in-memory and stays
  responsive while typing (deferred values + 25-row pages).

## Constraints

- **Everything public.** Any value compiled into the bundle is visible; assume
  the catalog and keys are public.
- **No secret in the client.** Contact details only.
- **Sheet hygiene matters.** Rows marked `needs review` are excluded; blank or
  duplicate rows are dropped; prices with more than three decimals are rounded
  half-up and reported.
- **Region scope.** Shipping to USA, UK, New Zealand and Australia. The checkout
  country list and the FAQ answer must stay in sync.

## Success measures (proposed, not yet instrumented)

| Signal                            | Why it matters                           |
| --------------------------------- | ---------------------------------------- |
| Search → add-to-cart rate         | Does the catalog answer real questions   |
| Cart → checkout-page rate         | Is the cart trustworthy enough to act on |
| Details → order-message copy rate | Is the hand-off easy enough              |
| Median time to first result       | Is search fast enough on mobile          |
| Support messages asking "price?"  | Should fall as the catalog gets used     |

Instrumentation is a roadmap item; until then, treat these as review questions.

## Definition of done for a change

1. `npm run typecheck`, `npm run lint`, `npm run build` pass.
2. New copy lives in a `content.ts` module, not inline JSX.
3. No new runtime dependency without a decision note explaining why the platform
   or existing packages cannot do it.
4. Mobile layout and dark theme checked by hand.
5. If catalog data shape changed, the format version and the build script were
   updated together.
