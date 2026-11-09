# Security & privacy

The assessment of the site as it ships today: what could go wrong, who could
cause it, what to do about it, and how to prove the fix worked.

**Status: assessment only.** No application code, header, configuration or
deployment was changed as part of this review. Every recommendation is for the
team to apply and then retest.

## Read in this order

| #   | Document                                     | Question it answers                                                    |
| --- | -------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | [Review, November 2026](./review-2026-11.md) | What is wrong, how would someone exploit it, and what should we do?    |
| 2   | [Threat model](./threat-model.md)            | What are we protecting, from whom, and where are the trust boundaries? |
| 3   | [Data inventory](./data-inventory.md)        | What personal data exists, where does it live, and how long should it? |
| 4   | [Remediation plan](./remediation-plan.md)    | In what order do we fix it, and how do we verify each fix?             |
| 5   | [Evidence log](./evidence.md)                | What exactly was run, and what did it print?                           |

## The short version

The application code is not the problem. There are no injection sinks, no
`eval`, no third-party scripts, no cookies, and one same-origin network call
with `credentials: "omit"`. Fuzzing the cart, checkout and catalogue parsers
with hostile input produced no crash and no prototype pollution.

The risk sits at the edges of the repository and the deploy chain:

| ID   | Severity | Finding                                                                                                                                                                     |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | **High** | A live, unauthenticated Apps Script endpoint that returns the source price sheet is committed to a **public** repository — present in two forks and every historical commit |
| F-02 | Medium   | No Content-Security-Policy, and four inline scripts per page                                                                                                                |
| F-03 | Medium   | Checkout PII (name, address, email, notes) stays in `localStorage` indefinitely after an order                                                                              |
| F-04 | Medium   | No privacy notice or consent while collecting an address and free-text notes that invite health data                                                                        |
| F-05 | Medium   | The catalogue artifact is not integrity-checked, and is cached `immutable` for a year                                                                                       |
| F-06 | Medium   | The order message can be forged with newlines in the notes field, or edited after copying                                                                                   |
| F-07 | Low      | Public repo with forks, no branch protection or secret scanning, no `SECURITY.md`                                                                                           |
| F-08 | Low      | `deploy.ps1` stages everything (`git add -A`) and pushes without a gate                                                                                                     |
| F-09 | Low      | No `robots.txt`; `/checkout/` protected only by a meta tag                                                                                                                  |
| F-10 | Low      | Three high dev-dependency advisories, with no CI gate (production dependencies are clean)                                                                                   |
| F-11 | Low      | 415 ms main-thread index build; unbounded decompression of the artifact                                                                                                     |
| F-12 | Low      | Messenger impersonation is the most likely fraud route and nothing counters it                                                                                              |
| F-13 | Low      | Missing defence-in-depth headers; `_headers` rules also apply to 404s                                                                                                       |
| F-14 | Info     | The XOR "masking" is obfuscation, not encryption — the catalogue is public by design                                                                                        |
| F-15 | Info     | Contact details are intentionally public, and will be scraped                                                                                                               |
| F-16 | Info     | Deployment posture that this environment could not verify (list of manual checks)                                                                                           |

Plus six non-security bugs (B-01…B-06), including **negative prices accepted
into the cart** and a missing error boundary.

### Three things to do first

1. Rotate the Apps Script deployment and untrack `.env.production` (F-01).
2. Generate a CSP from the real inline-script hashes, and verify the catalogue
   digest at runtime (F-02, F-05).
3. Clear saved checkout details on order completion and publish a one-page
   privacy notice (F-03, F-04).

## Scope boundary

This is a static site: **there are no accounts, no authentication, no sessions,
no cookies, no database, no payment flow, no upload and no server-side code of
ours to attack.** A review that reports SQL injection, IDOR or session fixation
here is reviewing an application that does not exist. What does exist — the
build pipeline, the public repository, the CDN, the browser storage and the
messenger hand-off — is what this folder covers.

Absolute security is not a reachable state for a shop that publishes its price
list and asks buyers to send their address over Telegram. The realistic goal is
that the remaining risks are **known, small and owned**; that is what the
findings and the remediation plan are for.
