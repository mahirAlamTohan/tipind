# 0004 — Orders leave through email/Telegram, not a checkout API

Date: 2026-11-09
Status: Accepted

## Context

Payment is taken in crypto (BTC, USDT, ETH, USDC) _after_ a human confirms
availability, shipping cost, VAT and parcel count. Card checkout is not used.
The team already works in email and Telegram, and the buyer usually wants a
message they can forward or archive.

## Decision

The cart and the delivery form are a **composer**, not a transaction. On submit,
the site builds a plain-text order (subtotal, address, itemised lines, notes,
email, preferred payment) and puts it on the clipboard. The visitor sends it via
the contact channels shown in the dialog; the team replies with payment details.

## Consequences

- No payment integration, PCI scope, refund flow or webhook to maintain.
- The UI must never imply the order is placed: copy says the team confirms
  availability, VAT and cargo, and no money is taken on the site.
- Orders are not stored anywhere by the site, so there is no server-side history,
  no duplicate detection and no fraud tooling. The messenger thread is the record.
- The pre-filled template does the work of a checkout API: it removes retyping
  and produces consistent, complete messages.
- A copy failure is handled explicitly ("select the text and copy manually"),
  since `navigator.clipboard` can be blocked.

## Alternatives considered

- **Stripe/PayPal + order database** — impossible for this payment model and
  would add a server, a webhook secret and reconciliation work.
- **A form endpoint (Formspree, a Worker API)** — stores PII we then have to
  protect and delete, for a workflow that already runs in messaging apps.
- **Mailto-only** — too fragile for long orders and no attachment of the
  formatted summary; clipboard + messenger works better on mobile.
