# Where configuration lives

One rule decides the file: **is it a fact about the business, or is it words on
the page?** Facts go in `site.ts`, words go in a `content.ts`.

```
src/config/site.ts            facts + switches  ← start here
src/config/links.ts           URLs derived from contact details
src/config/content.ts         site-wide copy
src/features/*/content.ts     copy for one feature
src/features/*/constants.ts   implementation tunables (storage keys, limits)
```

Everything is build-time. The site is a static export, so nothing here is a
runtime variable — values are compiled into the HTML and JS.

---

## `site.ts` — what the business *is*

| Group | Keys | Set by |
|---|---|---|
| identity | `name`, `url`, `founded` | `.env` (`NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_FOUNDED_YEAR`) |
| SEO | `tagline`, `description` | code — copy, but structural |
| navigation | `navigation[]` (`id`, `label`, `mobileLabel`, `footerLabel`) | code |
| contact | `phone`, `whatsappNumber`, `email`, `telegramUsername`, `supportHours` | `.env` |
| shipping | `shipping.countries` + derived `countriesProse`, `countriesCompact`, `regionRequired` | `.env` (`NEXT_PUBLIC_DELIVERY_COUNTRIES`) or code |
| payments | `payments[]` (`id`, `label`) | `.env`-less; code |
| catalog | `dataUrl`, `xorKey` | `.env` |

**Where we ship is defined once.** `shipping.countries` is the source; the prose
and compact forms are derived from it. If you find a hardcoded country name in a
component or a content file, that is a bug — reach for
`siteConfig.shipping.countriesProse` instead. Five copies of this list had
already drifted before it was centralised.

## `links.ts` — derived, never stored

`contactLinks.phone()`, `.whatsapp()`, `.email()`, `.telegram()` and
`sectionHref(id)` build URLs from `site.ts`. They return `#contact` when a
channel is not configured, so a missing env value degrades instead of breaking.

Do not add `phoneHref: \`tel:...\`` next to `phone`. That is how the same fact
ends up stored twice.

## `content.ts` — the words

Ordered like the page: `ui` → `hero` → `catalog` → `faq` → `about` → `contact`
→ `footer`.

- Site facts are interpolated at build time: `` `${siteConfig.name} has …` ``.
  Never retype the name, year or country list.
- `{placeholders}` are for **runtime** values only — counts, product names,
  filter labels. They are replaced at render time by the component that owns
  them.
- Anything resolved at build time leaves this file final, so no component has to
  remember to run a replace step. (One did forget, and shipped a literal
  `{name}`.)

## `features/*/constants.ts` — implementation tunables

Storage keys, cache versions, field length limits, form ids. If a **client**
would ever want to change it, it does not belong here — it belongs in `site.ts`
or a `content.ts`.

---

## Changing something: look-up table

| I want to change… | Edit |
|---|---|
| phone / WhatsApp / email / Telegram | `.env.production` → `site.ts` reads it |
| support hours | `NEXT_PUBLIC_SUPPORT_HOURS` |
| founding year | `NEXT_PUBLIC_FOUNDED_YEAR` |
| countries we ship to | `NEXT_PUBLIC_DELIVERY_COUNTRIES` (everything else derives) |
| payment methods | `PAYMENTS` in `site.ts` |
| nav labels | `navigation` in `site.ts` |
| hero headline / body | `content.ts` → `hero` |
| FAQ questions and answers | `content.ts` → `faq.items` |
| footer legal notice | `content.ts` → `footer.notice` |
| checkout wording | `features/checkout/content.ts` |
| cart wording | `features/cart/content.ts` |
| catalog copy | `content.ts` → `catalog` |
| SEO description / social text | `site.ts` → `description`, `tagline` |
| field length limits, storage keys | `features/*/constants.ts` |

## Guardrails

`npm run content:audit` reports content keys that nothing reads, and a country
list that has drifted from `shipping.countries`. Run it with the other checks in
`./scripts/ci.sh`.
