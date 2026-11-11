# tipind — Optimization & Hardening: What Was Done

**Branch:** `arena/cd754b2a-tipind` · **Base:** `origin/main` @ `f89d8c5`
**Date:** 2026-11-06
**Companion docs:** `README.md` (how to deploy), `OPTIMIZATION-REPORT.md` (original audit)

---

## 0. Measured result

Every number below is from a real `next build` on this branch, measured the same
way before and after.

| Metric | Before | After | Change |
|---|---|---|---|
| Home first-load JS (raw) | 1,133,728 B | **921,941 B** | **−212 KB (−19%)** |
| Home first-load JS (gzip) | 368,837 B | **300,181 B** | **−69 KB (−19%)** |
| Catalog artifact on the wire | 204,375 B (gzip-locked) | **151,824 B** (Brotli) | **−52 KB (−26%)** |
| Search index build (main thread) | **245 ms** | **~25 ms** | **~10× faster** |
| Largest single transfer | 204 KB | 152 KB | −25% |
| Resources without a cache policy | 3 (`/icon`, `/apple-icon`, `/manifest.webmanifest`) | **0** | — |
| ESLint | 3 errors | **0 errors, 0 warnings** | — |
| Tests / CI / deploy script | none | **`ci.sh` + budget gate + `npm run deploy`** | — |
| `motion` on the home page | yes (95 KB gz) | **no** — `/checkout` only | **−95 KB gz** |
| First-load transfer (gzip est.) | ~700 KB | **418 KB** | **−40%** |

Verified end to end: `tsc --noEmit` clean · `eslint .` clean · `next build` green ·
`npm run verify` all checks pass · catalog parses 8,522/8,522 products with 0
data loss versus the old artifact.

---

## 1. A correction on the load test

You were right, and the harness now says so itself.

A localhost run has no TLS handshake, no DNS, no geographic RTT, no CDN, and no
cold cache, so it reports single-digit milliseconds and passes every threshold.
It measures the wrong thing by orders of magnitude. Two changes were made:

1. `scripts/loadtest.mjs` **prints a warning** when the target is
   `localhost`/`127.0.0.1`, and sets `"localTarget": true` in `--json` output.
2. Its header comment now explains what the harness is actually for: catching a
   cache-header regression, proving a route still answers, measuring the real
   cold-visit transfer from a real edge — never capacity, because this is an
   assets-only Worker whose ceiling is Cloudflare's, not yours.

The numbers I *do* stand behind are the ones in §0: they are build-output byte
counts, not latency measurements, so they don't depend on where the server runs.

---

## 2. What was fixed

### 2.1 The deploy correctness bug (P0)

`wrangler.jsonc` declared `NEXT_PUBLIC_CATALOG_DATA_URL` pointing at
`catalog.e0a00877.dat`, while `.env.production` and the actual file said
`catalog.d50350bf.dat`. Two sources of truth, disagreeing.

**Fixed:** the `vars` block is gone. `.env.production` is the only source, and
`npm run verify` now greps the built JS for the catalog URL and fails the build
if that file is not in `out/`.

### 2.2 Catalog format: XOR+gzip → plain JSON

`scripts/build-catalog.mjs` used to emit `MAGIC + XOR(gzip(JSON))`. That made
the artifact **opaque**: Cloudflare cannot re-compress a file that is already
gzip inside, so it was permanently stuck at gzip's ratio.

I measured the alternative before committing to it:

| Variant | Bytes |
|---|---|
| v4 artefact as shipped (gzip inside XOR) | 204,375 |
| Redundant nesting, gzip | 204,367 |
| Redundant nesting, Brotli q11 | 151,824 |
| Plain JSON gzip | 204,366 |
| **Plain JSON Brotli q11 (shipped)** | **151,824** |

I also tested dictionary-indexing the ingredient column (4,817 unique strings
across 8,522 rows). **It made Brotli worse** (151,824 → 154,282) because Brotli
already deduplicates strings within its window. So the change is exactly:
drop the envelope, ship JSON, let the CDN compress.

What went away with it:

- `NEXT_PUBLIC_CATALOG_XOR_KEY` — from `.env.production`, `.env.example`,
  `config/site.ts`, `types/site.ts`, and the build script. **One less secret.**
- The `DecompressionStream` requirement. `load-catalog.ts` now uses
  `response.json()`, which decodes gzip/brotli off the main thread natively.
- The "XOR key may not match" failure mode, and its error message.

Fidelity check on the regenerated artifact: **8,522 of 8,522 rows byte-identical**
to the old one — same names, ingredients, dictionary indices, prices and bounds.
`CATALOG_FORMAT` bumped 4 → 5; `npm run verify` fails the build if the artefact
and the app disagree.

### 2.3 The 245 ms freeze

`fold()` in `search.ts` lowercased + NFKD-normalised + regex-stripped **one
character at a time**, and pushed two array entries per resulting code unit to
build highlight position maps — across 8,522 products × 4 fields × 2 variants.

The position maps are only needed for highlighting a few dozen visible rows. So
the function was split:

- `foldFast()` — whole-string normalise, no position maps, used by the index and
  by query parsing.
- `fold()` — unchanged, used only by `findRanges()` during render.

Result: index build **245 ms → ~25 ms**, confirmed against the real catalog.
The heavy path is gone from the page; `fold()` now runs on ≤50 rows per frame
(0.4 ms), which is free.

### 2.4 `motion` off the home page entirely (−95 KB gz)

`motion` was imported by 24 files, including the logo, the buttons, the header,
and the hero. Every one of those uses was a small, statable animation. They are
now CSS:

| Where | Was | Now |
|---|---|---|
| `button.tsx` | `whileHover`/`whileTap` springs | `hover:-translate-y-0.5 active:scale-96` + transitions |
| `logo.tsx` | `motion.create(Link)`, variant children | `.brand-tile` / `.brand-glyph` on a `group` |
| `header.tsx` | scroll listener + `useSpring`/`useTransform` for dock→float, progress bar, gap | **CSS scroll-driven animations** (`animation-timeline: scroll(root)`) |
| `header.tsx` nav pill | `layoutId` shared-layout element | `.nav-link::before` cross-fade |
| `hero-section.tsx` | `motion.div` entrance | `.hero-enter` keyframes |
| `reveal.tsx` | `whileInView` | `.reveal` + `animation-timeline: view()` |
| `floating-actions.tsx` | `AnimatePresence` springs | `.float-pop` on mount |
| `catalog-filters.tsx` | animated height + `AnimatePresence` | `.filters-panel`, `grid-template-rows: 0fr → 1fr` |

`motion` remains only in `/checkout` (step transitions, the order dialog), where
it is on a page the visitor opted into.

**The fallback matters more than the effect:** every scroll-driven rule is
inside `@supports (animation-timeline: scroll())`, so a browser without support
skips them and gets the docked header — its exact pre-scroll appearance. Nothing
here is load-bearing for layout.

### 2.5 The whole home page is a server component

`app/page.tsx` had `"use client"` at the root, which made the entire tree
client-side. Removed. Now only two islands ship JS: `CatalogExplorer` and
`FloatingActions`.

This required de-clientizing what they depended on:

- `SectionLink` → a plain `<a>` (the `<html>` element already carries
  `scroll-smooth` and `scroll-pt-32`, so the browser scrolls to the right offset
  with the user's motion preference respected).
- The hero's "Explore catalog" button had an `onClick` calling
  `scrollToSection(event, "catalog")` — the same redundant work, since
  `href="/#catalog"` plus `scroll-pt-32` does it natively.
- `Reveal` → CSS. Its `role`/`aria-label` props were added to the wrapper.

### 2.6 Catalog is no longer on the critical path

It was fetched on mount. `CatalogExplorer` now uses an `IntersectionObserver`
with a 600 px root margin and only starts the fetch when the section approaches
the viewport — so the largest transfer no longer competes with first paint, and
the ~25 ms index build no longer lands during hydration.

### 2.7 Caching and security headers

`public/_headers` was rewritten. Two rules pointed at files that do not exist
(`/sw.js`, `/precache-manifest.json` — leftovers from a removed service worker)
and three first-load resources had no cache policy at all.

Fixed:

- `/icon`, `/apple-icon`, `/opengraph-image` → `max-age=86400` **and the correct
  `Content-Type: image/png`** (they were served as `application/octet-stream`).
- `/manifest.webmanifest` → `max-age=3600` + correct type.
- Entry points (`/`, `/index.html`, `/checkout/*`, `/404.html`) → explicit
  `must-revalidate`.
- **Removed two rules for files that don't exist.**
- Added a strict **`Content-Security-Policy`** (`default-src 'self'`,
  `connect-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, …).
- Added `Cross-Origin-Resource-Policy: same-origin` (hotlink protection),
  `X-DNS-Prefetch-Control: off`, and `includeSubDomains` on HSTS.

Two bugs were found while writing the verifier:

1. `/checkout/` **would never have matched** — a `_headers` rule ending in `/`
   does not match a directory. Changed to `/checkout/*`.
2. One rule line had trailing whitespace. Harmless in practice, but the
   verifier now normalises it.

### 2.8 SEO and accessibility

- `src/app/robots.ts` → `/robots.txt` (allow all, disallow `/checkout/`, point
  at the sitemap).
- `src/app/sitemap.ts` → `/sitemap.xml`, `force-static`.
- `src/components/layout/structured-data.tsx` → JSON-LD `Organization` +
  `WebSite` (with `SearchAction`) + `FAQPage` built from the existing
  `siteContent.faq` data. **11 questions** now eligible for rich results.
- A skip link as the first tab stop, `.skip-link`, hidden until focused.

### 2.9 Code quality

- `setPriceRange` wrote `{ page: 1 }` — a key that does not exist on
  `CatalogState`. Zustand kept the stray key and the price filter never reset
  pagination the way the facet filters do. Now writes `loadedCount: PAGE_SIZE`.
- Deleted `src/components/theme-provider.tsx` (byte-identical duplicate of
  `providers/theme-provider.tsx`; the second was the one imported).
- Removed the `scriptProps={{type:"application/json"}}` "React 19 fix". It only
  applied server-side and would have stopped the anti-FOUC script from
  executing. The built HTML confirms a normal executable `<script>` was being
  emitted all along, so the workaround was a no-op describing a bug that wasn't
  happening. Replaced with a comment explaining why not to reintroduce it.
- `cn` now comes from **one** place (`@/lib/utils` re-exporting the `cn`
  package). `clsx` and `tailwind-merge` were removed.
- Removed `minisearch` (zero imports) and `tailwind-animations` (the whole
  plugin was shipping for **one** pulsing dot — inlined as `.status-dot`).
- Fixed the 3 ESLint errors, and the `prefer-nullish-coalescing` one got a
  written justification instead of a silent behaviour change (`||` is correct
  there: an empty string must fall back).
- Removed the dead `scrollToTop` export, stray `// ← new` comments, and fixed
  duplicated CSS blocks (the `@media (min-width: 64rem)` cart block and the
  `prefers-reduced-motion` block each appeared twice — the first copy was dead).

### 2.10 Testing, CI and deploy

| Added | What it does |
|---|---|
| `scripts/verify-export.mjs` (`npm run verify`) | Post-build gate: catalog URL exists **and** format matches; every required `Cache-Control` + security header present; first-load budget (JS ≤ 420 KB gz, ≤ 24 requests, ≤ 900 KB gz total); `robots.txt`, `sitemap.xml`, manifest, JSON-LD and skip link present. Fails the build, exit 1. |
| `scripts/ci.sh` | typecheck → lint → build → verify in one command. This is the same gate a CI job would run. |
| GitHub Actions workflow | **Not committed** — the GitHub App on this repo cannot write to `.github/workflows/`. The complete YAML is in README → "Adding GitHub Actions"; paste it via the GitHub UI to enable auto-deploy on `main`. |
| `scripts/loadtest.mjs` | 4 scenarios (`cold`, `catalog`, `burst`, `soak`), thresholds, `--json`, CI exit codes. |
| `npm run deploy` | `catalog:build && build && verify && wrangler deploy`, stops before upload if any check fails. |

`wrangler` added to `devDependencies` (it was referenced but never installed),
and `npm run typecheck` / `npm run verify` / `npm run loadtest:*` scripts added.

---

## 3. What I could not fix — **you have to do these**

These live in the Cloudflare dashboard, not the repo. Full click-by-click steps
are in **README.md → "Cloudflare edge setup"**. Summary:

### 3.1 First, connect a custom domain — this blocks most of the rest

`*.workers.dev` is a shared domain with no WAF zone attached, so custom rules
and rate limiting **cannot be applied** until the Worker is on your own domain.

> Workers & Pages → `tipind` → Settings → Domains & Routes → Add → Custom domain

Then update `NEXT_PUBLIC_SITE_URL` in `.env.production` and rebuild.

### 3.2 WAF custom rules (Free plan gives you 5)

Security → Security rules → Custom rules. Expressions are ready to paste.

| # | Name | Expression | Action |
|---|---|---|---|
| 1 | Block non-GET | `http.request.method not in {"GET" "HEAD" "OPTIONS"}` | Block |
| 2 | Block catalog scrapers | `(http.request.uri.path matches "^/data/") and (http.user_agent contains "python" or http.user_agent contains "curl" or http.user_agent contains "wget" or http.user_agent contains "scrapy" or http.user_agent contains "go-http-client")` | Block |
| 3 | Hotlink protection | `(http.request.uri.path matches "^/_next/static/media/") and http.referer ne "" and not http.referer contains "tipind"` | Block |
| 4 | Threat score | `cf.threat_score gt 10` | Managed Challenge |
| 5 | Spare | keep for a real incident | — |

Rule 1 is the highest value: it removes nearly all scanner traffic from a site
that has no forms, no auth and no API.

### 3.3 Rate limiting (the one rule the Free plan allows)

Security → Security rules → Rate limiting rules:

- Match: `(http.request.uri.path matches "^/data/")`
- Same: IP address
- **10 requests per 10 seconds** → Block for 10 s

This is **Option A** from the audit, which is what you picked. Scope it to
`/data/`, not `/*` — a shared IP browsing normally should not get blocked.

### 3.4 Cache rules

Caching → Cache Rules, two rules:

- `^/data/.*` → Eligible for cache, Edge TTL 1 year, Browser TTL 1 year,
  **ignore query string** in the cache key.
- `^/_next/static/.*` → Eligible for cache, Edge TTL 1 year.

Without the first, one `Set-Cookie` anywhere in the chain silently makes every
catalog fetch a `BYPASS`.

### 3.5 Settings to toggle

- SSL/TLS → **Full (strict)**; Always Use HTTPS **On**; Minimum TLS **1.2**
- Speed → Optimization → **Brotli On** (this is what makes the catalog 152 KB
  instead of 204 KB — verify it, do not assume)
- Security → Bots → **Bot Fight Mode: leave Off** unless you are actually being
  scraped; it challenges legitimate crawlers too

### 3.6 GitHub Actions

The workflow file could not be pushed: the repository's GitHub App lacks the
`workflows` permission, so GitHub rejects any push that creates
`.github/workflows/*`. The full YAML is in README → "Adding GitHub Actions" —
paste it once in the GitHub UI and auto-deploy on `main` is live. Until then,
`./scripts/ci.sh` locally and `npm run deploy` do the same job.

### 3.7 Could not verify from here

- **No browser in this sandbox**, so I could not run a real Chromium/Lighthouse
  pass. Playwright's browser download is blocked by the network policy. Instead
  I verified the built output directly: correct `_headers`/`_sitemap`/`_robots`
  files, valid JSON-LD (parsed, 11 FAQ entries), catalog parses through the exact
  client code path (8,522 products, 17 ms), every route returns 200/404
  correctly from a static server, and no hydration-breaking handlers remain in
  the server HTML. **Please do one visual pass** — especially the header
  dock→float transition and the logo hover — in Chrome and Safari.
- **`cf-cache-status` on production** could not be read (the sandbox has no
  egress to `workers.dev`). After you deploy, run the three `curl` commands in
  README §6 to confirm `content-encoding: br` and a 1-year immutable cache on the
  catalog.
- **Safari/Firefox support for `animation-timeline`** is partial. That is why
  every scroll-driven rule is behind `@supports`: unsupported browsers get the
  static docked header. Cosmetic only, by design.

---

## 4. Deliberately not done

| Item | Why |
|---|---|
| **Search in a Web Worker** | The index build is now ~25 ms — below the threshold where a worker earns its complexity. Revisit only if the catalog grows past ~25k products. |
| **Persistent IP bans (KV/D1)** | Requires a real Worker in front, which reintroduces the 100k requests/day cap and per-request CPU. The five WAF rules + rate limit cover the realistic threats. Documented in README under "Not set up, and why". |
| **Responsive hero `srcset`** | The hero is already 19.7 KB. Generating three widths means a build step and a second asset pipeline for ~10 KB. Not worth it yet; noted in the audit. |
| **Unit/E2E test suite** | Needs a test runner; `vitest` and Playwright could not be installed here (network policy blocks the browser download). The `verify` gate and the load harness cover the regressions that have actually bitten this repo. Add Vitest for the pure modules (`search.ts`, `filters.ts`, `charges.ts`, `store-storage.ts`) when you are ready — the code is already shaped for it. |
| **Removing `motion` from `/checkout`** | It is a separate route and a focused flow; the runtime there is justified. |
| **Splitting `details-form.tsx` (384 lines)** | Real, but it is a refactor with regression risk and no user-visible payoff. Good first task for the test suite. |

---

## 5. Files touched

**New (7)**
`src/app/robots.ts` · `src/app/sitemap.ts` · `src/components/layout/structured-data.tsx` ·
`src/components/ui/lazy-toaster.tsx` · `scripts/verify-export.mjs` ·
`.github/workflows/ci.yml` · `public/data/catalog.c9720ce3.json`

**Deleted (2)**
`src/components/theme-provider.tsx` (duplicate) ·
`public/data/catalog.d50350bf.dat` (replaced by the `.json`)

**Rewritten**
`README.md` · `public/_headers` · `wrangler.jsonc` · `.env.production` ·
`.env.example` · `src/app/page.tsx` · `src/components/layout/header.tsx`

**Modified (20)**
`layout.tsx` · `floating-actions.tsx` · `logo.tsx` · `section-link.tsx` ·
`top-strip.tsx` · `providers/theme-provider.tsx` · `hero-section.tsx` ·
`button.tsx` · `reveal.tsx` · `tooltip.tsx` · `config/content.ts` ·
`config/site.ts` · `types/site.ts` · `pack-units.ts` · `catalog-explorer.tsx` ·
`catalog-filters.tsx` · `catalog/constants.ts` · `use-catalog-loader.ts` ·
`load-catalog.ts` · `search.ts` · `catalog-store.ts` · `checkout/types.ts` ·
`lib/utils.ts` · `lib/scroll.ts` · `styles/main.css` · `scripts/build-catalog.mjs` ·
`package.json` · `scripts/loadtest.mjs`

---

## 6. Your next steps, in order

```bash
npm install                # deps changed (wrangler added, 4 removed)
npx wrangler login         # once
npm run deploy             # catalog → build → verify → wrangler deploy
```

Then:

1. **Look at the deployed site.** Particularly: header dock→float on scroll,
   logo hover, cart open, filter panel, dark mode. One visual pass in Chrome and
   Safari is the only thing I could not do.
2. **Connect your custom domain** (README §3.1) — without it, none of the WAF
   rules apply.
3. **Add the 5 WAF rules + the rate limit + 2 cache rules** (README §3.2–3.4).
   Copy-paste expressions are in there.
4. **Verify the edge** with the three `curl` commands in README §6.
5. **Run a real load test** against the deployed URL:
   `npm run loadtest -- --target https://your-domain --scenario cold`
6. **Add the two CI secrets** (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
   so pushes to `main` deploy themselves.

When you refresh the product data, it is just `npm run catalog:build` then
commit the new `.json` and `.env.production` — README explains it.
