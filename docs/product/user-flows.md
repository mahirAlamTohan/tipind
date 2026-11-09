# User flows

## Site map

```
/                     landing page (single scroll)
├── #home             hero
├── #catalog          catalog explorer + cart trigger
├── #faq              policy and shipping questions
├── #about            company credibility
├── #contact          WhatsApp / email / phone / hours
└── #footer           navigation, service pillars, disclaimer

/checkout/            review → delivery details → send order
```

The header is a floating bar with section links, a WhatsApp shortcut, the cart
trigger (home page only) and the theme toggle. On mobile the top strip compresses
to phone/email and the nav drops the FAQ entry so five sections fit without
horizontal scrolling. A floating action stack (contact options, WhatsApp, cart)
sits bottom-right on the landing page.

## Flow A — find a product and add it (first-time buyer)

1. Land on the hero. Primary CTA is "Talk to our team" (WhatsApp); the secondary
   CTA scrolls to the catalog.
2. The catalog card loads the versioned artifact once (~200 KB). While loading it
   shows a spinner and a status line; if the file is missing or the key is wrong
   it shows an actionable error instead of an empty table.
3. Type a query. The first 25 results render immediately; the rest stream in as
   the sentinel at the end of the list enters the scroll container.
4. Optionally open **Filters**:
   - Manufacturer list (virtualised, searchable, 700 entries).
   - Packaging pills.
   - Price range slider.
   - The include/exclude summary chips show what is active.
5. Press **+** on a row. The quantity badge appears on the button, the cart
   trigger badge increments and a success toast confirms the product and rate.
6. If a row has no usable price the button is disabled and its tooltip explains
   that the team must quote it.

**Failure/edge cases**

- No results → "No matches" with advice to try another ingredient/brand/pack.
- Catalog fetch fails → status error, retry requires a reload (documented).
- Prices are per packet; the cart repeats that notice so nobody assumes a box.

## Flow B — cart and quantity editing

1. Open the cart from the header trigger, the floating cart button, or the
   keyboard. The panel docks on the right on `lg+` and shrinks the page; below
   `lg` it covers the screen. It is not a modal: the page stays interactive.
2. Each line shows product, manufacturer/pack, price per packet, a quantity
   stepper and the line total.
3. Change quantity in place; line totals and the cart subtotal update instantly.
   Quantity is clamped between 1 and 9,999; removing a line is explicit.
4. Clearing the cart asks nothing but is announced with a toast and an empty
   state; the choice is a single click, and the cart is cheap to rebuild.
5. Drag the left edge (or use arrow keys / Home / End / Enter / double-click) to
   resize the docked panel on desktop. The width is remembered locally.
6. "Proceed to checkout" navigates to `/checkout/`; the panel closes.

**Edge cases**

- Storage unavailable (private mode/quota) → a warning banner appears and the
  cart works for the session only.
- A cart saved by an older schema version is discarded rather than migrated.
- Opening checkout closes the cart and removes the page offset, so no layout
  gap remains.

## Flow C — checkout

```
Review ──Continue──▶ Your details ──Checkout──▶ Send order (dialog)
   ▲                      │
   └──────Back to items───┘
```

1. **Review.** Line cards are editable exactly like the sidebar. The summary
   card shows subtotal, shipping ("To be confirmed") and estimated total.
2. **Your details.** Three cards: Contact, Shipping address, Preferences.
   - Country drives the region list (US states, AU states/territories, NZ
     regions, GB counties) and the postal-code label/rules.
   - Fields validate on blur and on submit; the first invalid field receives
     focus after a failed submit.
   - The form is saved locally as the visitor types; "Clear saved details"
     resets it.
3. **Send order.** The dialog builds a plain-text order (subtotal, address,
   itemised list, notes, email, preferred payment) and offers:
   - **Copy message**, then paste into email or Telegram, whose handles are
     shown with a warning about impersonator accounts.
   - **Edit details** to go back, or **Clear cart and finish** to complete the
     hand-off and return home.

**Ordering is asynchronous.** The site never claims the order is placed: copy
says the team confirms availability, VAT and cargo, and no payment happens on
the site. That gap is intentional and must remain visible in the UI.

## Flow D — policy questions only

A visitor who is not ready to buy can read the FAQ first: payment methods,
dispatch origin, reshipment policy, shipping regions, processing time, minimum
quantity, signature and naming requirements. The FAQ links to the contact
section, and the footer always exposes phone, email, hours and the medical
disclaimer.

## Navigation behaviour

- Section links scroll smoothly, offset for the fixed header, and update the URL
  hash with `history.replaceState` (no full navigation).
- Clicking a link locks the active state until scrolling settles, then the
  scroll-spy takes over again; wheel/touch/keyboard input releases the lock
  immediately.
- On `/checkout/`, hash links navigate back to the landing page instead of trying
  to scroll a missing section.
- The brand logo returns to the top of the landing page.

## Accessibility path

- Every interactive control is reachable by keyboard.
- The cart sidebar receives focus on open, closes on Escape and returns focus to
  the previous element.
- Status changes (catalog load, filters, errors, item added) are `aria-live`
  regions.
- Color contrast relies on semantic tokens rather than raw palette classes.
- All motion is reduced to opacity/no-op under `prefers-reduced-motion`.
