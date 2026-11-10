# Remediation plan

A sequenced work list for the findings in
[the November 2026 review](./review-2026-11.md). **Nothing here has been
implemented** — the review was assessment-only by request. Each item says what
to change, which finding it closes, roughly how long it takes, and how you will
know it worked.

Effort is calendar-realistic for one person who knows the codebase:
**S** ≈ under 1 hour, **M** ≈ an afternoon, **L** ≈ a day or more.

## Status (2026-11-09)

Applied in code after the assessment, before any of the repository work below:

| Finding | Change                                                                                                                                       | Where                                                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| F-03    | Saved checkout details are cleared when an order finishes                                                                                    | `checkout-page.tsx` `finish()`                                 |
| F-03    | Form input capped so a long field is no longer dropped on reload; sanitiser truncates instead                                                | `details.ts`, `details-form.tsx`                               |
| F-06    | Notes became "delivery instructions": 240 chars, no control characters, single line at compose, structural markers stripped from every value | `constants.ts`, `details.ts`, `order-message.ts`, `content.ts` |
| F-09    | `robots.txt` + `X-Robots-Tag` on `/checkout/*`                                                                                               | `public/robots.txt`, `public/_headers`                         |
| B-01    | Zero and negative prices rejected by the cart **and** by the catalog parser (rows outside the artifact's own `priceBounds` fail closed)      | `line-items.ts`, `load-catalog.ts`                             |
| B-02    | Error boundaries: root, route, checkout, 404, catalog island, cart, order dialog                                                             | `src/app/*`, `src/components/error-*`, `cart-fallback.tsx`     |

Still open and owned by the team: F-01 (endpoint rotation and history purge),
F-02 (CSP), F-05 (integrity + cache policy), F-04 (privacy page), F-07/F-08/F-10
(repository and CI posture), F-11, F-12, F-13. Item 1.9 (`deploy.ps1`) is now
superseded by [ADR 0008](../decisions/0008-split-catalog-pipeline-from-site-repo.md),
which removes the local push path entirely.

---

## Phase 0 — this week (do not skip)

| #   | Item                                                                                                                                                                                                  | Closes     | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 0.1 | **Archive the Apps Script deployment and create a new one.** Put the new URL in your local `.env.production` only.                                                                                    | F-01       | S      |
| 0.2 | **Untrack `.env.production`**: `git rm --cached .env.production`, remove the `!.env.production` exception from `.gitignore`, replace the live values in `.env.example` with placeholders.             | F-01       | S      |
| 0.3 | **Restrict the Google Sheet** to named people; confirm no "anyone with the link" access.                                                                                                              | F-01       | S      |
| 0.4 | **Purge the URL from history** (`git filter-repo --path .env.production --invert-paths`), force-push, ask GitHub Support to expire cached views. Accept that forks keep a copy — 0.1 is the real fix. | F-01       | M      |
| 0.5 | **Clear saved details when an order finishes**: call `clearDetails()` in `finish()` in `checkout-page.tsx`.                                                                                           | F-03       | S      |
| 0.6 | **Reject non-positive prices**: `price <= 0` fails in `toDetails` _and_ in `parseCatalog`.                                                                                                            | B-01       | S      |
| 0.7 | **Turn on secret scanning + push protection and Dependabot alerts**; make the repository private if nothing needs it public.                                                                          | F-07, F-10 | S      |
| 0.8 | **Confirm the two forks are yours.** If not, treat 0.1 as already overdue.                                                                                                                            | F-01, F-07 | S      |

Phase 0 closes the only finding rated High, and the two privacy items a buyer
would notice first. Everything after this is hardening.

---

## Phase 1 — next two weeks

| #   | Item                                                                                                                                                                                                                                                                                                 | Closes     | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1.1 | **Post-build CSP generator.** Parse `out/**/*.html`, hash the 4 inline scripts per page, emit per-path `Content-Security-Policy` into `_headers`. Start in report-only, watch for violations, then enforce. `style-src` needs `'unsafe-inline'` (18 inline style attributes); `script-src` must not. | F-02       | M      |
| 1.2 | **Verify the catalogue hash** at runtime against an env var written by `catalog:build`; fail closed into the existing error state.                                                                                                                                                                   | F-05       | S–M    |
| 1.3 | **Fix cache policy** for `/data/*.dat`: `immutable` only for the exact hashed filename, `must-revalidate` otherwise, `no-store` on errors.                                                                                                                                                           | F-05, B-04 | S      |
| 1.4 | **Write `/privacy`** (controller, fields, purpose, messengers named, retention, deletion contact) and link it from the footer and above the checkout form.                                                                                                                                           | F-04       | M      |
| 1.5 | **Change the notes field**: 200-character cap, placeholder warning against medical details, and a line explaining the messenger hand-off.                                                                                                                                                            | F-04       | S      |
| 1.6 | **Neutralise message fields**: strip newlines and marker lines from `notes` before composing the order; add an order reference and UTC timestamp.                                                                                                                                                    | F-06       | S      |
| 1.7 | **Add `robots.txt` and `X-Robots-Tag: noindex` for `/checkout/*`.**                                                                                                                                                                                                                                  | F-09       | S      |
| 1.8 | **Dependency bump** for `eslint-plugin-react-compiler` and an audit gate in CI (`npm audit --omit=dev --audit-level=high`).                                                                                                                                                                          | F-10       | S      |
| 1.9 | **Harden the deploy path**: replace `git add -A` with explicit paths, print and confirm `git status`, run lint/typecheck/build/audit before committing.                                                                                                                                              | F-08       | S–M    |

---

## Phase 2 — this quarter

| #    | Item                                                                                                                                                                   | Closes     | Effort |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 2.1  | **Precompute the search index at build time** (or move it to a Web Worker) so the first keystroke does not block for 415 ms; measure on a mid-range Android.           | F-11       | M      |
| 2.2  | **Cap decompression** (content-length check + byte budget in the stream) and reject implausible row counts.                                                            | F-11       | S      |
| 2.3  | **Complete the header set**: CORP, COEP, `browsing-topics=()`, `interest-cohort=()`; scope cache rules away from 4xx.                                                  | F-13       | S      |
| 2.4  | **Message-field retention**: opt-in "remember my details" with a 30-day expiry; write on blur rather than on each keystroke; add "Forget me".                          | F-03       | M      |
| 2.5  | **Impersonation countermeasures**: order code required in the first message, a canonical-handle warning in the dialog and email footer, squat obvious handle variants. | F-12       | S–M    |
| 2.6  | **`SECURITY.md` + a monitored contact**; a 72-hour acknowledgement promise.                                                                                            | F-07       | S      |
| 2.7  | **Header and artifact monitoring**: a scheduled check that `/` still returns the expected headers and that `/data/*.dat` matches the expected hash; alert on drift.    | F-05, F-13 | M      |
| 2.8  | **CI as the only deployer**: Cloudflare token in repository secrets, `wrangler versions upload` + gradual rollout, no laptop with a token.                             | F-08       | M      |
| 2.9  | **Delete closed order messages on a 90-day schedule** and note it in the privacy page.                                                                                 | F-04       | S      |
| 2.10 | **Retire the XOR framing** in any copy that implies security; keep it documented as obfuscation only.                                                                  | F-14       | S      |

---

## Retest checklist

Copy-paste checks for each phase. All of these work without the review sandbox.

### F-01 — endpoint no longer public

```bash
# 1. Should NOT return sheet rows (expect a Google sign-in page or an error).
curl -sL "https://script.google.com/macros/s/<OLD_ID>/exec" | head -c 300

# 2. Nothing on the default branch or in history.
git grep -I "AKfycb" && echo "STILL PRESENT"
git log -S AKfycb --oneline && echo "STILL IN HISTORY"

# 3. The file is no longer tracked.
git ls-files | grep -c "^\.env\.production$"   # expect 0
```

### F-02 — CSP

```bash
curl -sI https://tipind.mahiralamtohan.workers.dev/ \
  | tr -d '\r' | grep -i "content-security-policy"
curl -sI https://tipind.mahiralamtohan.workers.dev/checkout/ \
  | tr -d '\r' | grep -i "content-security-policy"
```

Then open `/`, `/checkout/` and `/nope` in a fresh profile with DevTools open:
**zero CSP violations**, the theme is correct before first paint, the cart
resizes, and the catalogue search works.

### F-03 — PII cleared

1. Fill the form, add an item, complete the order, click **Clear cart and finish**.
2. Return to `/checkout/`.
3. In the console: `localStorage.getItem("tipind:checkout:v1")` → `null` right
   after finishing (an empty `{ details: { … } }` on a later visit is also fine —
   what must not survive is the name, address or email), and the form is empty.

### F-04 — privacy notice

`curl -s https://…/privacy | grep -iE "telegram|whatsapp|retention|delete"` →
each appears. The footer and the checkout form both link to it.

### F-05 — catalogue integrity

1. Flip one byte in `out/data/catalog.<hash>.dat`, serve it locally, reload:
   the page must show the "catalogue could not be decoded" state, not prices.
2. `curl -I https://…/data/catalog.<hash>.dat` → `cache-control` present and
   scoped; `curl -I https://…/data/missing.dat` → `no-store` (or at least not
   `immutable`).

### F-06 — message cannot be forged

Run the harness in [evidence §4](./evidence.md#4-grey-box-fuzzing-of-parsers-and-sanitisers)
with the injection payload. The output must contain **one** `ORDER------` and
one `NOTES` block, and the forged subtotal must appear only as quoted text (or
not at all).

### F-07 / F-08 — repo and deploy

GitHub → Settings → Code security: secret scanning, push protection and
Dependabot all **on**. `main` requires a PR and a passing check. A test commit
containing `AKfycbAAAA…` is rejected by push protection. `deploy.ps1` refuses to
run with an unexpected staged file.

### F-09 — crawling

```bash
curl -s  https://…/robots.txt
curl -sI https://…/checkout/ | grep -i x-robots-tag
```

### F-10 — dependencies

```bash
npm audit --omit=dev --audit-level=high   # expect 0
npm audit                                 # record the dev-only remainder
```

### F-11 — performance

Re-run the benchmark in [evidence §5](./evidence.md#5-load-and-cpu-baseline) on
a mid-range phone (Chrome remote debugging): first keystroke should stay under
~100 ms of main-thread work, and the page should never show a long task over
200 ms while typing.

### F-13 — headers

```bash
curl -sI https://…/ | tr -d '\r' | sort
```

Expect the original seven **plus** CSP, CORP, COEP and `X-Robots-Tag` on
checkout; no `x-powered-by`; HSTS present; nothing cacheable beyond intent.

---

## How to report back

For each item you attempt, send: the finding ID, what you changed, the
check output, and what still looks wrong. If a recommended fix does not resolve
the symptom, that usually means one of:

- a **second path** serves the same thing (`_headers` not applying to a path, a
  cached copy, or the `out/` folder not regenerated),
- the **deployment** did not pick up the change (`wrangler` cache, wrong
  environment, `.env.production` still read from the tracked file),
- the **hashes in the CSP** are from the previous build,
- the **browser** is holding an old service worker or a cached HTML document.

Include the response headers and the browser console for the failing page, and
the retest will be quick.
