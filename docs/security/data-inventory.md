# Data inventory

What the site touches, where it lives, how long it lives, and who else can see
it. Written for the privacy half of the November 2026 review (findings F-03 and
F-04) and for whoever has to answer a customer or a regulator.

Legend for **sensitivity**: `PII` = identifies a person; `Health-adjacent` =
reveals or implies a condition even without a diagnosis; `Public` = safe to
publish; `Operational` = no personal data.

## 1. Collected in the checkout form

Stored in `localStorage` under `tipind:checkout:v1` — **one entry, unencrypted,
no expiry** — and then copied into an email or Telegram message by the buyer.

| Field            | Source              | Sensitivity         | Purpose               | Lifetime today            | Lifetime it should have                      |
| ---------------- | ------------------- | ------------------- | --------------------- | ------------------------- | -------------------------------------------- |
| `firstName`      | typed               | PII                 | Addressing the parcel | Until the buyer clears it | Session, or 30 days if opted in              |
| `lastName`       | typed               | PII                 | Addressing the parcel | Same                      | Same                                         |
| `email`          | typed               | PII                 | Reply with a quote    | Same                      | Session, or 30 days if opted in              |
| `company`        | typed (optional)    | PII (indirect)      | Business orders       | Same                      | Session                                      |
| `addressLine1/2` | typed               | PII                 | Delivery              | Same                      | Session                                      |
| `city`           | typed               | PII                 | Delivery              | Same                      | Session                                      |
| `region`         | select              | PII                 | Delivery / tax        | Same                      | Session                                      |
| `postalCode`     | typed               | PII                 | Delivery              | Same                      | Session                                      |
| `country`        | select (4 options)  | PII (coarse)        | Shipping rules        | Same                      | Session                                      |
| `paymentMethod`  | select              | Preference          | Payment instructions  | Same                      | Session                                      |
| `notes`          | typed, ≤1,000 chars | **Health-adjacent** | Delivery instructions | Same                      | Drop the field, or 200 chars, with a warning |

Two things make this more sensitive than a normal address form:

- **The order itself is health data.** A cart containing `Telmisartan 40 mg` or
  `Metformin` reveals a condition. The cart is persisted too, under
  `tipind:order-cart:v3`, so the _combination_ of name, address and product list
  sits in `localStorage` until the cart is cleared (which does happen in
  `finish()`, but not if the buyer abandons the flow).
- **The notes field invites diagnosis.** Whatever the placeholder says, buyers
  will explain why they are ordering. That is special-category data under GDPR
  Art. 9 if the buyer is in the EU/UK.

## 2. Stored for convenience, not identity

| Key                     | Contents                              | Sensitivity     | Lifetime                                                                |
| ----------------------- | ------------------------------------- | --------------- | ----------------------------------------------------------------------- |
| `tipind:order-cart:v3`  | Product rows + quantities             | Health-adjacent | Until cleared or the order completes (persists across visits otherwise) |
| `tipind:cart-width`     | Panel width in pixels                 | Operational     | Until cleared                                                           |
| `theme` / `next-themes` | Light/dark preference                 | Operational     | Until cleared                                                           |
| CSP / service worker    | none — no service worker is installed | —               | —                                                                       |

No cookies are set. No `sessionStorage`, IndexedDB or Cache Storage is used by
application code. Nothing is sent anywhere except the catalogue download.

## 3. Data that leaves the device

| Destination                | Data                                                        | Trigger                 | Notes                                                                                                 |
| -------------------------- | ----------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Cloudflare (`workers.dev`) | IP, user agent, requested path — standard access logs       | Every request           | Retention is Cloudflare's; check the zone's log settings. No cookies, no fingerprinting, no analytics |
| Google Apps Script         | **Nothing from visitors** — only the build machine calls it | `npm run catalog:build` | See F-01: the endpoint is nonetheless reachable by anyone                                             |
| Gmail / Google Workspace   | The full order message once the buyer sends it              | Buyer action            | Third country depending on Workspace region; no DPA in place for this flow                            |
| Telegram                   | The full order message                                      | Buyer action            | Telegram's servers; no end-to-end encryption for cloud chats (only "secret chats", which this is not) |
| WhatsApp (Meta)            | The full order message, if the buyer uses the WhatsApp link | Buyer action            | Meta's servers                                                                                        |
| GitHub                     | Source code and, today, the refresh endpoint                | Build/deploy            | Public repository; two forks contain the same file                                                    |

The critical sentence for a privacy notice: **the order is not submitted to
tipind over HTTPS. It is handed to a third-party messenger by the buyer.** That
is a design choice (ADR 0004) with a privacy consequence that has to be stated,
not implied.

## 4. Retention, as it should be written down

| Data                                    | Where the team keeps it | Proposed retention                                               |
| --------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| Order message (name, address, products) | Gmail / Telegram inbox  | 90 days after the order closes, then delete                      |
| Quotes and invoices                     | as above                | As long as required for tax/accounting, then delete              |
| Catalogue source sheet                  | Google Drive            | Business record, not personal data — but restrict sharing (F-01) |
| Browser `localStorage`                  | Buyer's device          | Cleared at order completion; 30 days maximum if opted in         |
| Cloudflare access logs                  | Cloudflare              | Shortest available (typically days)                              |

## 5. Rights the site currently cannot honour

| Right (GDPR / UK GDPR / DPDP / CCPA) | Can it be honoured today?            | What is missing                                                    |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------------------------ |
| Know what is collected               | No                                   | No privacy notice                                                  |
| Access a copy                        | In theory (search the inbox)         | No stated contact or process                                       |
| Correct                              | In theory                            | Same                                                               |
| Erase                                | In theory                            | No stated process; `localStorage` copy is outside the team's reach |
| Object / restrict                    | No                                   | No notice, no basis stated                                         |
| Withdraw consent                     | Not applicable — no consent is asked | Which is itself the gap: there is no lawful basis recorded         |
| Data portability                     | Not applicable at this scale         | —                                                                  |

The minimum viable answer for a shop this size is a **one-page notice plus a
monitored deletion address** (`shop@tipind.ru` is fine), and a habit of deleting
closed orders. That covers Art. 13 (notice), Art. 17 (erasure) and the DPDP
notice requirement without a lawyer or a DPO.

## 6. Two things not to add later without re-reading this

1. **Analytics.** Any third-party tag converts a zero-cookie site into one that
   needs consent, a processor list and a cookie banner. If you need numbers, use
   Cloudflare's server-side analytics, which needs no client-side script.
2. **A "save my prescription" upload.** That turns health data into an uploaded
   file with no encryption, no retention control and no lawful basis. Hold the
   line at "send it in the email thread".
