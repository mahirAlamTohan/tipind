# Threat model

A one-page model of what tipind protects, from whom, and where the trust
boundaries sit. It exists so the findings in
[the November 2026 review](./review-2026-11.md) can be read as consequences of a
specific design rather than as a bag of unrelated warnings.

## 1. What the system is

A **static catalogue with a messenger hand-off**. There is no server-side
logic of our own: Cloudflare serves files from `./out`, the browser downloads a
204 KB masked artifact, decodes it in memory, and all search, cart and checkout
work happens on the visitor's device. An "order" is a pre-formatted block of
text that the buyer copies and sends to the team over email or Telegram. Nothing
is written back.

```
 Google Sheet ──► Apps Script ──► build machine ──► GitHub ──► Cloudflare ──► browser ──► Gmail / Telegram ──► team
 (source of truth)  (JSON endpoint)  (catalog:build)   (public repo)  (static files)   (localStorage)      (human copy-paste)
```

## 2. Assets, ranked by what would actually hurt

| #   | Asset                                                        | Why it matters                                                                                | Where it lives                           |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| A1  | Price list integrity                                         | A wrong price shown as authoritative costs money and trust; bait pricing is the classic abuse | `.dat` artifact → browser memory         |
| A2  | Buyer PII (name, address, email, notes)                      | Harm to a customer, and a legal obligation once it is collected                               | `localStorage`, then Gmail/Telegram      |
| A3  | The contact channels (`shop@tipind.ru`, `@tipind`, WhatsApp) | Whoever controls the channel receives orders and money                                        | `src/config/site.ts`, rendered HTML      |
| A4  | Source sheet + refresh endpoint                              | Raw rows may include columns never shipped; the endpoint is the only secret in the system     | `.env.production`, git history, GitHub   |
| A5  | Build and deploy credentials                                 | Whoever holds them can change A1 and A3                                                       | developer machines, GitHub, Cloudflare   |
| A6  | Reputation / search presence                                 | A defaced or spoofed shop is worse than a down shop                                           | DNS, GitHub org, `workers.dev` subdomain |

## 3. Actors

| Actor                            | Capability                                             | Motivation                                  |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Casual visitor                   | Reads everything shipped to the browser                | None — but sees whatever is public          |
| Price scraper / competitor       | Same, plus the source endpoint if it is reachable      | Undercut, monitor margins, resell the list  |
| Fraudster impersonating the shop | Registers a lookalike Telegram handle, messages buyers | Divert payment                              |
| Buyer with intent                | Edits the order text before sending it                 | Pay less, split shipments, confuse the team |
| Network attacker                 | On-path on hostile Wi-Fi, or DNS/BGP mischief          | Inject content, downgrade                   |
| Supply-chain attacker            | Publishes a malicious npm package, or compromises CI   | Run script in every visitor's browser       |
| Compromised-account attacker     | GitHub or Cloudflare token                             | Replace the site or the artifact            |
| Insider / future maintainer      | Legitimate access                                      | Mistake, not malice                         |

Out of scope by construction: credential stuffing, session hijacking, SQL
injection, IDOR, SSRF, privilege escalation, payment fraud, account takeover.
There are no accounts, sessions, cookies, database or payment flow to attack.
Anyone who reports one of those has not read the architecture.

## 4. Trust boundaries

1. **Google Sheet → build machine.** The sheet is trusted; the Apps Script
   response is trusted once fetched. This is the boundary that F-01 punctures,
   because the endpoint is reachable by anyone.
2. **Build machine → GitHub → Cloudflare.** Three places where an artifact can
   be replaced without touching application code. Nothing in the app verifies
   what it downloaded (F-05).
3. **Cloudflare → browser.** The browser trusts the origin completely. Any
   script that runs there can rewrite prices and contact details, and read A2
   (F-02 explains why there is no second line of defence).
4. **Browser → messenger.** `localStorage` holds PII until the visitor clears
   it (F-03); the copied text is fully editable and unauthenticated (F-06); the
   receiving human has no way to tell a genuine message from a forged one
   (F-06, F-12).
5. **Messenger → team.** Telegram and email are third parties. Whatever the
   buyer sends is stored on their infrastructure, outside any agreement we
   control (F-04).

## 5. Threats, STRIDE-style

| Threat                     | Concrete version here                                                                                                | Finding          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **Spoofing**               | Lookalike `@tipind` handle collects orders and payment                                                               | F-12             |
| **Tampering**              | Artifact or deploy replaced; buyer edits the order text                                                              | F-05, F-06       |
| **Repudiation**            | No order reference, no timestamp, no record that a message was sent                                                  | F-06             |
| **Information disclosure** | Refresh endpoint public; PII left in `localStorage`; whole catalogue indexable                                       | F-01, F-03, F-09 |
| **Denial of service**      | Apps Script quota burned by a stranger; year-long immutable cache of a bad build; 415 ms index build on cheap phones | F-01, F-05, F-11 |
| **Elevation of privilege** | Any script on the page inherits the ability to rewrite contact details and prices                                    | F-02             |
| **Privacy / compliance**   | Address and possibly health data collected with no notice, no retention rule                                         | F-04             |

## 6. Assumptions this model makes

- The repository is public, the site is on `*.workers.dev`, and one person
  operates both.
- The sheet contains at least one column that is **not** in the published
  artifact; if it does not, F-01 drops from High to Medium.
- Traffic is small (tens to low hundreds of visits a day), so server-side
  rate-limiting is neither available nor necessary.
- The team always re-checks a pasted order before quoting or shipping. F-06's
  impact depends on this; if the team ever ships straight from the pasted text,
  F-06 becomes High.

If any assumption changes, re-read the affected finding rather than the whole
document.
