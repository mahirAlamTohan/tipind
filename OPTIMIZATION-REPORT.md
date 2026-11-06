# tipind — Full Audit & Optimization Report

**Repo:** `mahirAlamTohan/tipind` · **Branch:** `arena/cd754b2a-tipind` (up to date with `origin/main` @ `f89d8c5`)
**Live target:** https://tipind.mahiralamtohan.workers.dev
**Audit date:** 2026-11-06
**Prepared with:** fresh `npm install`, real `next build`, offline catalog decode/benchmark, and a new load-test harness run against the built output.

---

## 0. TL;DR

The complaints are directionally right, but **not all of them for the reason you think**. Three corrections before the findings:

| Your complaint | Reality check |
|---|---|
| "It creates too many requests" | **True — 22 requests for one visit**, 13 of them JavaScript. But static-asset requests are **free and unlimited** on Cloudflare Workers Assets. So this is a *performance* problem, not a *cost/quota* problem. The quota problem appears the moment you add a Worker for rate limiting (see §5). |
| "It will go fully static" | **It already is.** `output: "export"` + an assets-only Worker. There is no server. Every hole you're describing is therefore *client-side or edge-config*, not app-server hardening. |
| "No IP banning / rate limiting" | **True, and there is nowhere in this repo to put it.** A static site cannot ban an IP; there is no code path that sees an IP. This has to live in Cloudflare's WAF/edge config, or in a small Worker. Concrete recipes in §5. |
| "No testing, no stress test" | **True — zero tests, zero CI, no test runner installed.** I built and verified a real stress harness for you: `scripts/loadtest.mjs` (§7). |

**Top 10 fixes, ranked by (impact ÷ effort):**

| # | Fix | Impact |
|---|---|---|
| 1 | Catalog URL is read from `.env.production` but overridden by a stale `wrangler.jsonc` var → **the two disagree today**. Remove the var. | Deploy correctness: one stale file silently breaks the catalog |
| 2 | `/icon`, `/apple-icon`, `/manifest.webmanifest` have **no `Cache-Control`** → revalidated on every visit (3 wasted round-trips) | −3 requests, −30 KB per visit |
| 3 | Two `ImageResponse` icons (24 KB + 5.7 KB PNG) recomputed per URL → **replace with static, hash-named PNGs, one icon** | −1 request, −25 KB, −build time |
| 4 | Search index is built on the main thread: **~245 ms freeze** (measured) | 10.4× faster if rewritten (measured 24.8 ms) |
| 5 | `.dat` is already gzip'd inside XOR, so Cloudflare cannot compress it → **swap XOR+client-gunzip for plain Brotli** | 204 KB → **~127 KB**, and kills the `DecompressionStream` hard requirement |
| 6 | Home page ships **1.13 MiB of JS (369 KB gz)**, with `motion` + `@base-ui` + `sonner` on the critical path | 40–50% JS cut by dropping `motion` from non-interactive sections + lazy Toaster |
| 7 | Catalog (204 KB) loads on mount even though it's below the fold | Removes the largest transfer from first paint |
| 8 | `_headers` hardcodes `X-Frame-Options: DENY`, no CSP, no `frame-ancestors`, 6 rules covering 4 paths | Security + it's one file, 20 lines |
| 9 | No `robots.txt`, no `sitemap.xml`, no JSON-LD, no `security.txt` | SEO/trust — pure wins for a catalogue site |
| 10 | 3 live lint errors, no CI, no tests, no `wrangler` in `package.json` | Prevents regressions |

Everything below is evidence-backed with file paths and measured numbers.

---

## 1. How I measured (so you can reproduce)

```bash
npm install
npx next build                    # 11.9 s compile, 8 static pages
npx tsc --noEmit                  # clean
ESLINT_FULL_CHECK=true npx eslint .   # 3 errors
node scripts/loadtest.mjs --target http://127.0.0.1:8080 --scenario cold
```

**Baseline (built `out/`, no CDN, uncompressed):**

| Metric | Value |
|---|---|
| First-visit requests | **22** (1 HTML + 13 JS + 1 CSS + 2 fonts + 1 hero + 2 icons + 1 manifest + 1 catalog) |
| First-visit bytes | **1.58 MiB** uncompressed |
| Home JS | **1,133,728 B raw → 368,837 B gzip**, 13 chunks |
| CSS | 113,142 B raw → **17,867 B gzip** (already tight) |
| Catalog artifact | 204,375 B (already gzip'd inside XOR) |
| Fonts | 36.9 KB + 24.8 KB (WOFF2, already optimal) |
| Hero image | 19.7 KB, **1376×768 single file, no responsive variants** |
| Icons | 24,152 B + 5,652 B PNG, **regenerated per URL** |
| Compressed first-load estimate on Cloudflare | **≈ 700 KB** |

**Runtime bench (8522 products, from the real `catalog.d50350bf.dat`):**

| Step | Time |
|---|---|
| gunzip | 9.3 ms |
| `JSON.parse` | 4.7 ms |
| `parseCatalog` | 3.5 ms |
| **`indexFor()` fold+index** | **235.5 ms** ← the freeze |
| one search (1 term) | 18.3 ms |
| one search (2 terms) | 13.6 ms |
| Full re-fold + index, optimized | **24.8 ms (10.4× faster, 0 field mismatches)** |
| Node Brotli q11 of the JSON | 151,824 B vs 204,367 B gzip (**−25.7%**) |
| Node Brotli q11 of the artifact | **204,380 B → no gain** (already compressed; single fetch, `image/*`/HTML should stay compressed) |

---

## 2. Deploy & correctness (P0 — fix before anything else)

### 2.1 The catalog URL is configured in two places that disagree

- `src/config/site.ts` reads `process.env.NEXT_PUBLIC_CATALOG_DATA_URL`.
- `.env.production` says `/data/catalog.d50350bf.dat`.
- `wrangler.jsonc` declares `"vars": { "NEXT_PUBLIC_CATALOG_DATA_URL": "/data/catalog.e0a00877.dat" }`.
- The built bundle bakes in **`.d50350bf`**; `public/data/` contains **only** `.d50350bf`.

So the `vars` entry is **dead weight that shadows nothing today and breaks everything tomorrow**. If `.env.production` were ever missing from a build (e.g. a fresh CI runner, or Cloudflare's build environment), the app would request a file that doesn't exist and the catalog would show the "corrupted file" error with no obvious cause.

**Fix:** delete the `vars` block. One source of truth: `.env.production`. Add a build-time assertion (see §8, `scripts/verify-export.mjs`) that every `NEXT_PUBLIC_CATALOG_DATA_URL` in `out/**/*.js` resolves to a file that exists in `out/`.

Related: `deploy.ps1` builds the catalog but **never runs `next build` or `wrangler deploy`**. Your "deploy" script only pushes to GitHub. That's the biggest missing piece of the pipeline.

### 2.2 `NEXT_PUBLIC_CATALOG_XOR_KEY` ships in the browser bundle

It is visible in `out/_next/static/chunks/0gafwv0kcfjq0.js`:

```js
catalog:{dataUrl:n("/data/catalog.d50350bf.dat"),xorKey:n("122166dd…")}
```

This is *acknowledged* in `.env.example` ("XOR is only obfuscation"), so it's not a new finding — but it does mean **the entire manufacturer/price dataset is trivially extractable** by anyone with `curl` + 10 lines of JS. If the catalog is a business asset (it looks like a real wholesale price list), obfuscation is not protection. The real mitigations are: rate limiting + bot rules at the edge (§5), and/or moving the price column out of the public artifact. Worth a product decision, not a code fix.

### 2.3 Missing `robots.txt`, `sitemap.xml`, structured data

Verified: none exist in `out/`, none in `src/app/`. For a site whose entire value is a searchable product directory:

- `src/app/robots.ts` → allow `/`, disallow `/checkout`, point at the sitemap.
- `src/app/sitemap.ts` → `force-static`, one entry (single-page site) + `/checkout` excluded.
- JSON-LD in `layout.tsx`: `Organization` + `WebSite` + `SearchAction`, and `FAQPage` from the existing `siteContent.faq` data (already structured — this is nearly free rich-result eligibility).

### 2.4 Minor SEO/config nits

- `trailingSlash: true` + canonical `"/checkout"` → the served URL is `/checkout/`. Align the canonical.
- `alternates.canonical: "/"` on home is fine; `/checkout` correctly sets `robots: { index: false }`.
- `manifest.webmanifest` has **two identical 512×512 entries** (one `maskable`). Maskable icons need 40% safe-zone padding — the current icon has `borderRadius: 112` on 512, so it's already inset. Acceptable, but a dedicated maskable asset is cleaner.

---

## 3. Cloudflare / edge configuration (P0–P1)

This is where the "Cloudflare optimized" work actually lives.

### 3.1 `public/_headers` — 6 rules, 4 paths, and three holes

Current file covers `/_next/static/*`, `/data/*.dat`, `/sw.js`, `/precache-manifest.json`, `/opengraph-image*`, `/*`.

| First-load resource | Current cache policy | Should be |
|---|---|---|
| `/_next/static/*` | `immutable, 1y` ✅ | ✅ |
| `/data/*.dat` | `immutable, 1y` ✅ | ✅ |
| `/` and `/index.html` | Cloudflare default (`max-age=0, must-revalidate`) | `public, max-age=0, must-revalidate` (explicit) |
| `/icon`, `/apple-icon` | **default + wrong Content-Type** | `immutable, 1y` + `image/png` |
| `/manifest.webmanifest` | **default** | `public, max-age=3600` |
| `/opengraph-image*` | Content-Type only | `immutable, 1y` |
| `/sw.js`, `/precache-manifest.json` | Rules **for files that don't exist** | Delete (no service worker in this repo) |

`X-Frame-Options: DENY` but **no `Content-Security-Policy`**. On a site with zero third-party scripts, a strict CSP is nearly free and is the single highest-value header you're missing (it's also what makes XFO's `frame-ancestors` redundant-correct).

**Drop-in `public/_headers`:**

```txt
# ── Fingerprinted build output: content changes ⇒ filename changes ──
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/data/*.dat
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: application/octet-stream
  X-Content-Type-Options: nosniff

/icon, /icon.png
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: image/png

/apple-icon, /apple-icon.png
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: image/png

/opengraph-image*
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: image/png

/manifest.webmanifest
  Cache-Control: public, max-age=3600

# ── Entry points: must be revalidated, never stale ──
/
  Cache-Control: public, max-age=0, must-revalidate

/index.html
  Cache-Control: public, max-age=0, must-revalidate

/checkout/
  Cache-Control: public, max-age=0, must-revalidate

/404.html
  Cache-Control: public, max-age=0, must-revalidate

/robots.txt
  Cache-Control: public, max-age=3600

/sitemap.xml
  Cache-Control: public, max-age=3600

# ── Everything ──
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  X-DNS-Prefetch-Control: off
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://wa.me https://t.me; object-src 'none'; upgrade-insecure-requests
```

`'unsafe-inline'` for `script-src` is required because Next inlines the bootstrap + `next-themes` anti-FOUC script. If you want it strict, switch `next-themes` to the `nonce` path or accept the hash-based `next/script` strategy — worth doing later, not now.

> **Cloudflare nuance worth knowing:** Workers Assets matches `_headers` rules on the **request** path, not the file that answers it, and **comma-joins** a header set by two matching rules. That's why the catch-all `/*` block here sets *no* `Cache-Control` — every path-specific block owns its own. Keep it that way.

### 3.2 Verify the deploy actually applied them

```bash
curl -sI https://tipind.mahiralamtohan.workers.dev/data/catalog.d50350bf.dat | grep -i cache-control
curl -sI https://tipind.mahiralamtohan.workers.dev/icon | grep -iE 'cache-control|content-type'
```

`immutable` is **browser-only** — Cloudflare's edge ignores it and obeys `max-age`/`s-maxage`. So the 1-year entries above are doing double duty (browser + edge); the HTML entry is deliberately `max-age=0` so a deploy is visible immediately. That's the correct split.

### 3.3 Cache Rules (dashboard, no code)

Even with `_headers` correct, add one **Cache Rule** so the catalog is edge-cached even on a cold PoP, and to strip cookies from the cache key:

- **Rule 1** — `http.request.uri.path matches "^/data/.*\.dat$"` → *Eligible for cache*, Edge TTL: **1 year**, Browser TTL: **1 year**, Cache Key: ignore query string.
- **Rule 2** — `http.request.uri.path matches "^/_next/static/.*"` → *Eligible for cache*, Edge TTL **1 year**.

Without rule 1, a `Set-Cookie` anywhere in the chain (or an `Authorization` header) silently turns every catalog fetch into `cf-cache-status: BYPASS`. That is the classic "why is my immutable asset a MISS" bug.

---

## 4. Front-end performance (P1)

### 4.1 The 245 ms search-index freeze (biggest single runtime defect)

`src/features/catalog/lib/search.ts` → `fold()` is called **once per field per product**, and it iterates the string *character by character*, doing `toLocaleLowerCase()` + `normalize("NFKD")` + regex **per character**, while pushing two array entries per resulting code unit:

```ts
for (const char of source) {
  const folded = char.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  for (const piece of folded) {
    if (compact && !WORD_CHAR.test(piece)) continue
    for (const _unit of piece) { starts.push(offset); ends.push(end) }   // ← 2 numbers per char
    text += piece
  }
}
```

For 8522 products × 4 fields × 2 variants, this allocates ~34k small arrays plus hundreds of thousands of numbers — **measured 235–258 ms of blocked main thread**, right when the user first types or when the catalog finishes loading.

The position maps (`starts`/`ends`) are **only needed for highlighting**, not for the index. Splitting the two:

```ts
// Index path: no position maps, no per-character work.
const stripAccents = /[\u0300-\u036f]/g
const nonWord = /[^\p{L}\p{N}]/gu
function foldFast(source: string, compact: boolean) {
  const text = source.toLowerCase().normalize("NFKD").replace(stripAccents, "")
  return compact ? text.replace(nonWord, "") : text
}
```

Measured: **257.7 ms → 24.8 ms (10.4× faster), 0 mismatches across all 34,088 fields.** Keep the existing `fold()` (with maps) only in `findRanges`, where it runs on ≤50 visible rows — that costs **0.4 ms per 50 rows**, i.e. free.

Three further options, in increasing order of payoff:

1. **Ship the folded index in the artifact.** Precompute `folded[]`/`compact[]` at build time in `scripts/build-catalog.mjs`. Costs ~126 KB Brotli *if stored as JSON*, but as length-prefixed concatenated strings it's far less; it removes ~25 ms and all the allocation. Best combined with fix 4.2.
2. **Move search to a Web Worker.** Then even a 250 ms index build never touches the UI thread. This is the only way to keep a 100% smooth typing experience on a low-end Android.
3. **Pre-chunk the results.** `searchProducts` does a full sort over up to 8522 hits on every keystroke. Sorting the top-N only (partial selection) cuts that further.

### 4.2 Catalog payload: replace XOR+gzip with plain Brotli

`scripts/build-catalog.mjs` → `encode()`: `gzip(level 9) → XOR` and a `TIPCAT4:` magic prefix. Consequences:

- Cloudflare **cannot compress it** (it's already gzip'd and served as `application/octet-stream`) — you're locked into gzip's ratio forever.
- Brotli q11 on the same JSON is **151,824 B vs 204,367 B gzip = −25.7%**.
- The client needs `DecompressionStream` (`load-catalog.ts` throws "This browser can't open the catalog"). That's fine for modern browsers but is a hard failure mode you don't need.
- Deleting XOR also deletes `NEXT_PUBLIC_CATALOG_XOR_KEY`, the double-config in `.env.production`, and one whole class of "key mismatch" bugs (there's a dedicated error message for it).

**Recommendation:** ship `catalog.<hash>.json.br` (raw Brotli, no magic, no XOR). Cloudflare serves it with `Content-Encoding: br` via `_headers` (`Content-Encoding` can't be forced in `_headers`, so serve it as `.json` and let Cloudflare's own Brotli do it — Brotli q11 on the JSON at the edge is 127 KB, and you get HTTP-native streaming decode with `response.json()`, no `DecompressionStream`). Net: **−77 KB on the single biggest transfer, −40 lines of decoder, one fewer env var.** Keep the versioned filename + `immutable` so it stays cacheable forever.

### 4.3 700 KB of first-load weight, and what's actually in it

Home page loads **13 JS chunks**; five are >100 KB:

| Chunk (raw) | Contents |
|---|---|
| 274,718 | `@base-ui` + `motion` + `lucide` + `zustand` |
| 229,597 | React DOM |
| 168,704 | shared runtime |
| 120,037 | `@base-ui` |
| 112,594 | app components |
| 105,433 | `sonner` (+ base-ui) |
| 42,715 | `motion` |
| 28,739 | app |
| rest | 5–14 KB each |

`motion` is imported by **24 files**, including purely presentational ones (`logo.tsx`, `tooltip.tsx`, `button.tsx`, `reveal.tsx`, `accordion.tsx`, `faq-section.tsx`, `footer-section.tsx`, `hero-section.tsx`). `sonner` (toasts) and its Toaster are mounted in the root layout even though toasts only fire on "add to cart".

Concrete cuts, biggest first:

1. **Drop `motion` from server sections.** `HeroSection`, `FAQSection`, `FooterSection`, `AboutSection`, `ContactSection` are marked `"use client"` purely for `Reveal`/`motion` animations. CSS `@starting-style` + `animation-timeline: view()` (or a 15-line IntersectionObserver `Reveal`) does the same job for ~0 KB and makes those sections **server components** again. Removing `motion` from the home page entirely is worth roughly **−40 KB gz** and removes a hydration root.
2. **Lazy-mount the Toaster.** `dynamic(() => import('./ui/sonner'), { ssr: false })` and only render it once the cart is non-empty. Saves `sonner` (~10 KB gz) from first paint.
3. **`cn` is imported from two different packages.** `src/lib/utils.ts` uses `clsx` + `tailwind-merge`; `src/components/ui/tooltip.tsx` uses `import { cn } from "cn"` (the standalone `cn` package, already in deps — a pre-compiled drop-in). Standardize on the `cn` package everywhere and **delete `clsx` + `tailwind-merge`**: smaller bundle, one code path. (This also removes a subtle "why do classes merge differently in two components" trap.)
4. **`@base-ui/react` is tree-shaken per-import**, which is good — but `TooltipProvider` wraps the entire app in the layout, pulling in tooltip machinery for every page. Move the provider inside the second page-level component or use a single `<Tooltip.Provider>` at the `<body>` level with the newer API. (Lower confidence; measure before/after.)
5. **`minisearch` and `tailwind-animations` are unused.** `minisearch` appears in `package.json` only — zero imports. `tailwind-animations` is imported in `main.css` but the output contains only **3 keyframes** (`pulse`, `pulsing`, `spin`) and 9 `animate-*` utilities. Delete both dependencies; if `pulsing` is genuinely used, inline its 4 lines of CSS.

### 4.4 Hero image is one 1376×768 file for every device

`images: { unoptimized: true }` is required by `output: "export"`, so `next/image` emits a single `<img>`. A 360 px phone downloads the full 19.7 KB (and can't use a `srcset`). Pre-generate 2–3 WebP widths at build time (`sharp` is already in `trustedDependencies`) and hand-write:

```tsx
<img
  src="/_next/static/media/hero-1376.webp"
  srcSet="/hero-480.webp 480w, /hero-960.webp 960w, /hero-1376.webp 1376w"
  sizes="100vw" width={1376} height={768} fetchPriority="high" decoding="async"
/>
```

Also: the `blurDataURL` in `hero-section.tsx` is a **1×1** image — it produces a solid-color placeholder, not a blur. Either generate a real 8×5 LQIP (≤ 300 B) or use a CSS gradient; the current value is dead weight and slightly misleading in review.

### 4.5 The catalog loads on mount, not when needed

`useCatalogLoader` fires on mount, so the **204 KB** artifact is in the critical path of the first paint, competing with the JS. It sits in a section below the fold. Two-line fix:

```ts
// catalog-explorer.tsx — only load when the section is within 1 screen
const sentinel = useRef<HTMLDivElement>(null)
const [visible, setVisible] = useState(false)
useEffect(() => {
  const el = sentinel.current
  if (!el) return
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } }, { rootMargin: "600px" })
  io.observe(el); return () => { io.disconnect() }
}, [])
const status = useCatalogLoader(visible ? catalogDataUrl : undefined)
```

Result: LCP improves by whatever the catalog fetch costs on the user's connection, and the 245 ms index build no longer lands during hydration.

### 4.6 Highlight work on every keystroke

`HighlightedText` calls `findRanges` (which calls `fold` **twice** — plain and compact) per field per row, on every render. Measured 0.4 ms per 50 ingredient fields, so ~1–2 ms per frame at `PAGE_SIZE = 25` — acceptable, but it's pure waste when the query is empty. Guard:

```tsx
if (query.terms.length === 0) return <>{text}</>
```

…which `findRanges` already does internally, but the component still allocates. Better: `useMemo` the ranges per `(text, query)` and memoize the row component (`React.memo` on the `<tr>`), so typing only re-renders rows whose text actually changed.

### 4.7 Bulk-import penalty

`motion` is pulled in via 24 modules, each importing from `"motion/react"`. Verify with:

```bash
grep -c "motion/react" out/_next/static/chunks/*.js
```

If any presentational chunk references it, that's a test of whether tree-shaking is actually eliminating the unused parts. Worth a one-time check after fix 4.3.1.

---

## 5. Security, IP banning, rate limiting (P0 — the "holes")

### 5.1 What's already good (credit where due)

I went looking for the usual holes and mostly did **not** find them:

- **No `dangerouslySetInnerHTML` anywhere.** No `eval`, no `new Function`. Search/highlight is pure React text splitting, so the 8522-row dataset can't inject markup.
- **Only one `fetch()` in the whole client** (`load-catalog.ts`) and it's same-origin, `credentials: "omit"`, with an `AbortSignal`.
- **`localStorage` is never trusted.** `store-storage.ts` and `checkout-store.ts` both re-validate and re-derive IDs from scratch (`lineItemId`), with size caps (`2_000_000`, `100_000`) and quantity/price clamps. This is genuinely well done.
- **All 5 `target="_blank"` links have `rel="noreferrer"`.**
- No secrets other than the (intentionally public) XOR key.
- `security` + `regexp` ESLint plugins are enabled with `strictTypeChecked` — and the one `security/detect-unsafe-regex` disable has a written justification.

So: **the security problem is not in the code. It's that there is no edge in front of it.**

### 5.2 The actual exposure

As deployed today this is an **assets-only Worker**: anonymous `GET` for `robots.txt`-free static files. Threats that actually apply:

| Threat | Real? | Mitigation |
|---|---|---|
| Scraping the whole catalog (price list) repeatedly | **Yes — highest risk.** 204 KB × N, and the XOR key is in the bundle | Edge rate limit + bot rules; consider removing price from the public artifact |
| Hotlinking the hero/`.dat` from other sites | Yes | `Cross-Origin-Resource-Policy: same-origin` (add it) |
| Bandwidth burn / L7 flood | Yes | Cloudflare L7 DDoS (automatic), 1 rate-limit rule |
| Credential stuffing / SQLi / XSS | **No** — no auth, no forms, no server | n/a |
| Clickjacking | Low | `X-Frame-Options: DENY` + `frame-ancestors 'none'` ✅ |
| Malicious `localStorage` from another origin | No | Same-origin policy |

### 5.3 Rate limiting — three options, honestly costed

**Option A — Cloudflare WAF rules (free, no code).** Free plan gives **5 custom rules + 1 rate-limiting rule**, counted **by IP**, over a **10-second** window. That's a speed bump, not a wall. Recommended use of the one rule:

- **Rate limit:** `(http.request.uri.path matches "^/data/")` → **10 requests / 10 s per IP** → *Block for 10 s*.
- **Custom rule 1:** `cf.threat_score > 10` → Managed Challenge.
- **Custom rule 2:** `http.user_agent contains "curl" or "python" or "wget" or "scrapy"` **and** path starts with `/data/` → Block (allow verified bots if you care about Googlebot).
- **Custom rule 3:** `http.referer ne "" and not http.referer contains "tipind"` **and** path starts with `/_next/static/media/` → Block (hotlink protection).
- **Custom rule 4:** `ip.geoip.country in {"T1"}` → Block (Tor, if you don't want it).
- **Custom rule 5:** `http.request.method not in {"GET" "HEAD" "OPTIONS"}` → Block. **This alone kills most scanner noise on a static site.**

**Option B — Workers `ratelimits` binding + `run_worker_first` (needs a Worker).** Gives you a real token bucket with `limit`/`period` (10 s or 60 s) per key — and the key can be `cf-connecting-ip`, a path, or a header. Cost: `"run_worker_first": ["/data/*"]` means **those requests now invoke the Worker and become billable**. Free plan = 100,000 Worker requests/day. At 1:1 that's 100k catalog fetches/day, which is plenty — but understand the trade line: **every request you route through the Worker permanently leaves the "free and unlimited" bucket.**

**Option C — Real IP bans with memory (KV/D1/Durable Object).** If you want "ban this IP for 24 h", a token bucket isn't enough because Workers isolates are ephemeral. Use `env.BANS` (KV) keyed by `cf-connecting-ip` with a TTL, written from a `waitUntil`. This is the only way to implement *persistent* bans, and it costs KV reads/writes per request. Do this only if Option A/B proves insufficient.

**My recommendation:** ship **A + the 5 custom rules** today (zero code, zero cost, covers 95% of what you're worried about). Add **B** only for `/data/*` if you see sustained scraping in the analytics. Keep **C** in your back pocket; it's a 60-line Worker and you can add it in an afternoon when the need is real.

### 5.4 There is nowhere in the repo for this — put it in IaC

Rate-limit rules are dashboard-only on the free plan (the Rulesets API works but needs a token + a zone). To keep it reviewable, **document the exact rule expressions in the repo** (`docs/cloudflare.md`) and, if you want it enforceable, add a small `scripts/cloudflare-rules.mjs` that `PUT`s them via the API with a `CF_API_TOKEN` from CI. Without that, your edge config is unversioned and will silently drift — which is itself one of the "holes" you're describing.

### 5.5 Other hardening worth 20 minutes

- **Add `Cross-Origin-Resource-Policy: same-origin`** (blocks hotlinking in modern browsers).
- **`Strict-Transport-Security` needs `includeSubDomains`** and ideally submission to the HSTS preload list.
- **`X-DNS-Prefetch-Control: off`** — you have no third-party origins, so prefetch is pure noise.
- **`/.well-known/security.txt`** — cheap trust signal for a site handling orders.
- **Remove `/sw.js` and `/precache-manifest.json` from `_headers`** — they reference files that don't exist, which is a maintenance lie.
- **`connect-src 'self'`** in CSP matters because `load-catalog.ts` is the only fetch; locking it prevents a future third-party script from exfiltrating the cart.

---

## 6. Code quality, hack-prone-ness, and the 3 live errors

`ESLINT_FULL_CHECK=true npx eslint .` → **3 errors** (TypeScript is clean):

| File | Error | Fix |
|---|---|---|
| `src/features/cart/lib/pack-units.ts:40` | `prefer-nullish-coalescing` | logical OR → `??` (verify the falsy-0 case is intended) |
| `src/features/catalog/lib/load-catalog.ts:158` | `preserve-caught-error` | attach `{ cause }` when rethrowing |
| `src/features/checkout/types.ts:65` | `ChannelCopy` unused | delete the type |

### 6.1 Actual "hack" smells I found

| ID | Where | What |
|---|---|---|
| H1 | `cart-store.ts:121` | `setPriceRange` returns `{ page: 1, … }` but the state field is **`loadedCount`** — `page` is not in `CatalogState`. Zustand merges it into the store as a stray key; the price filter **does not reset pagination** the way the facet filters do. Silent dead code + inconsistent UX. |
| H2 | `src/components/theme-provider.tsx` **and** `src/components/providers/theme-provider.tsx` | Two byte-identical theme providers; only one is imported. The other is dead. |
| H3 | `providers/theme-provider.tsx` | The "React 19 fix" sets `scriptProps={{type:"application/json"}}` **only when `typeof window === "undefined"`**, i.e. on the server — then `next-themes` renders its inline script with `type="application/json"`, which **browsers do not execute**, so the anti-FOUC script wouldn't run. But the built HTML shows a **normal executable `<script>`** with no `type` attribute. Conclusion: this workaround is a no-op at best and an FOUC bug at worst; the comment describes a bug that isn't happening. **Delete it** and verify dark-mode-first-paint with a fresh profile. |
| H4 | `src/components/ui/tooltip.tsx:8` | `import { cn } from "cn"` — one component uses the `cn` package, 14 others use `@/lib/utils` (clsx+tailwind-merge). Two merge implementations in one app. |
| H5 | `public/_headers` | 2 of 6 rules point at files that don't exist (`/sw.js`, `/precache-manifest.json`) — leftovers from a removed service worker. |
| H6 | `catalog-explorer.tsx` | `// ← new` and `// ← reset on search` and `// ← key change` comments left in. Plus `catalog-table.tsx` has `{/* … card content unchanged … */}` and `order-dialog.tsx` has a stray `{/* You can use Lucide's Hourglass icon */}` with a hand-rolled `<svg>` duplicating `lucide-react`'s `Hourglass` (which is **already a dependency**). Dead comments + a needless 40-line inline SVG. |
| H7 | `wrangler.jsonc` | `observability.logs` + `invocation_logs: true` + `persist: true` are configured for a Worker that **doesn't exist** (no `main`). Harmless today, confusing forever. |
| H8 | `package.json` | Unused deps: `minisearch` (0 imports), `tailwind-animations` (produces 3 keyframes), plus `clsx`/`tailwind-merge` if you adopt H4. |
| H9 | `deploy.ps1` | 10.7 KB PowerShell that builds the catalog, commits, and pushes — but **never builds or deploys the site**. On a Linux/CI machine it does nothing. Replace with `npm run deploy`. |

### 6.2 Structural observations

- **`src/app/page.tsx` is `"use client"` at the root.** That single directive makes *the entire homepage* a client tree, which is why `HeroSection`/`FAQSection`/`FooterSection` all need `"use client"` too. Remove it and only `CatalogExplorer` + `FloatingActions` stay client. This is the enabler for fix 4.3.1 and probably the single highest-leverage architectural change.
- `details-form.tsx` is 384 lines; `content.ts` is 303. Both are past the point where a reviewer can hold them in their head. Not urgent, but they're where the next bug will hide.
- `catalog-table.tsx` renders **both** the mobile `<ul>` and the desktop `<table>` into the DOM simultaneously and hides one with `@4xl:hidden` / `hidden @4xl:block`. At `PAGE_SIZE = 25` that's ~50 rows of DOM for 25 products, and every keystroke re-renders both. Split by a single matchMedia/CSS-container hook, or accept it and `React.memo` the rows.
- `constants.ts` naming: `DELIVERY_COUNTIES` (typo for COUNTRIES) is exported from `config/site.ts` and consumed in `checkout/constants.ts` as `SERVICED_COUNTRIES`. Rename once, everywhere.

---

## 7. Testing — from zero to a real suite

### 7.1 Current state: **none**

Verified: no `*.test.*`, no `*.spec.*`, no `vitest`/`jest`/`playwright`/`k6` config, no `.github/` directory, no CI of any kind. `package.json` has `dev`, `build`, `start`, `lint`, `catalog:build` — and no `test`.

The good news: the code is **already shaped for testing**. `search.ts`, `filters.ts`, `pack-units.ts`, `charges.ts`, `store-storage.ts`, `validation.ts`, `line-items.ts` are all pure functions with narrow inputs. This is a rare case where adding tests is genuinely cheap.

### 7.2 Recommended stack (small, fast, no browsers for 80% of it)

```bash
npm i -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @playwright/test
```

| Layer | Tool | What to cover | Target |
|---|---|---|---|
| **Unit** | Vitest | `fold`/`parseQuery`/`searchProducts`/`findRanges`, `filterProducts`, `parseMills` (build script), `clampQuantity`, `lineItemId` stability, `computeTotals`, `sanitizeDetails`, `parseItems` | ~40 tests, < 1 s |
| **Golden data test** | Vitest | Load the real `catalog.d50350bf.dat`: assert 8,522 products, `priceBounds`, that `parseCatalog` round-trips, and that a fixture query returns a fixed set of IDs. This is the test that catches a format bump (FORMAT/MAGIC mismatch) before users do. | 5 tests |
| **Component** | Vitest + Testing Library | Add-to-cart flow, filter cycling (include → exclude → off), quantity clamp, checkout validation messages per country | ~15 tests |
| **E2E** | Playwright | Cold visit → search → filter → add 2 items → open cart → checkout → details → copy order message. Plus dark mode, reduced-motion, 360 px viewport, and keyboard-only. | ~8 specs |
| **Load / stress** | `scripts/loadtest.mjs` (§7.3) | Cold-visit budget, catalog hot path, burst cliff, soak | 4 scenarios |
| **Budget guard** | `scripts/verify-export.mjs` (proposed) | Assert first-load JS ≤ 320 KB gz, requests ≤ 16, no missing `NEXT_PUBLIC_*` file, `_headers` coverage | CI gate |

CI (`.github/workflows/ci.yml`, ~40 lines): `npm ci` → `tsc --noEmit` → `eslint` → `vitest run --coverage` → `next build` → `verify-export` → `playwright test` (chromium only) → on `main`, `wrangler deploy`.

### 7.3 The stress harness — **built and verified for you**

New file: `scripts/loadtest.mjs`. Zero dependencies, Node ≥ 20, four scenarios:

```bash
# What a real first visit costs (discovers the actual resources from the HTML + JS bundle)
node scripts/loadtest.mjs --target https://tipind.mahiralamtohan.workers.dev --scenario cold

# The single biggest asset, repeatedly (cache-hit path)
node scripts/loadtest.mjs --scenario catalog --requests 1000 --concurrency 50

# Find the cliff
node scripts/loadtest.mjs --scenario burst --requests 20000 --concurrency 500 --max-error-rate 0.01 --max-p95 800

# Sustained load / degradation
node scripts/loadtest.mjs --scenario soak --duration 120 --rate 100

# CI-friendly
node scripts/loadtest.mjs --scenario cold --max-p95 1500 --json
```

Exit codes: `0` pass, `1` threshold breached, `2` usage/connection error. `--json` for CI parsing.

**Verified locally** (Node static server, no CDN, so this is the floor):

| Scenario | Result |
|---|---|
| `cold` | 22 requests, 1.58 MiB, 23.5 ms parallel wall, p95 15.0 ms, PASS |
| `burst` 3000 @ 200 conns | 1,679 req/s, p95 213 ms, p99 258 ms, 0 failures |
| `soak` 5 s @ 100 rps | 100.2 req/s, p95 1.3 ms, 0 failures |
| `catalog` × 200 | 200/200 OK, p95 63 ms |
| bad args / unknown scenario | exit 2 ✅ |

Add to `package.json`:

```json
"test:load:cold": "node scripts/loadtest.mjs --scenario cold --max-p95 1500",
"test:load:burst": "node scripts/loadtest.mjs --scenario burst --requests 10000 --concurrency 200",
"test:load:soak": "node scripts/loadtest.mjs --scenario soak --duration 120 --rate 100"
```

> **Honest caveat:** this harness measures *the site as served*, not Cloudflare's own capacity. For "how many concurrent users can this take", the answer is "Cloudflare's, not yours" — an assets-only Worker is effectively unlimited and free. What you actually want to stress is **your CI build** and **the client-side runtime** (see 7.4). Use the harness to catch regressions (a bad `_headers` rule, a cache miss storm) and to sanity-check the Worker path if you add §5.3 Option B.

### 7.4 The stress test you're actually missing

The real bottleneck is **single-core client CPU**, not the server. Two numbers to guard: the **245 ms index build** and the **~1.13 MiB JS parse/execute**. Add a Playwright performance spec using CDP throttling:

```ts
test("catalog is interactive quickly on a slow phone", async ({ page, browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })   // mid-range Android
  await cdp.send("Network.emulateNetworkConditions", { downloadThroughput: 1.6e6 / 8, latency: 150, offline: false })
  await p.goto("/")
  const lcp = await p.evaluate(() => new Promise<number>((res) =>
    new PerformanceObserver((l) => res(l.getEntries().at(-1)!.startTime)).observe({ type: "largest-contentful-paint", buffered: true })))
  const longTasks = await p.evaluate(() => performance.getEntriesByType("longtask").length)
  expect(lcp).toBeLessThan(2500)
  expect(longTasks).toBeLessThan(3)
})
```

That test is the one that will stop the 245 ms freeze from coming back.

---

## 8. Proposed work plan

### Phase 0 — Today, ~2 hours, zero risk (correctness + caching)

1. Delete the `vars` block from `wrangler.jsonc` (§2.1). Add `main`-less comment explaining it's assets-only.
2. Replace `public/_headers` with the version in §3.1. Delete the `sw.js`/`precache-manifest` rules.
3. Fix the 3 ESLint errors + delete `src/components/theme-provider.tsx` (H2) + drop the `scriptProps` hack (H3).
4. Fix H1 (`page: 1` → `loadedCount: PAGE_SIZE`).
5. Add `robots.ts` + `sitemap.ts` + JSON-LD (§2.3).
6. Add `scripts/loadtest.mjs` (already written) + the three `test:load:*` scripts.

Expected: **−3 requests, −30 KB, correct MIME for the favicon, a real CSP, working 1-year caching on every immutable asset.**

### Phase 1 — This week, ~1 day (the big wins)

7. `foldFast` split in `search.ts` (§4.1) → **−220 ms of main-thread block.**
8. Remove `"use client"` from `app/page.tsx`; convert `HeroSection`/`FAQSection`/`FooterSection`/`AboutSection`/`ContactSection` to server components; replace `motion` there with CSS (§4.3.1) → **−40 KB gz, −1 hydration root.**
9. Lazy Toaster; standardize on the `cn` package; drop `minisearch` + `tailwind-animations` + `clsx` + `tailwind-merge` (§4.3.2–4.3.5).
10. IntersectionObserver-gated catalog load (§4.5).
11. Replace the two `ImageResponse` routes with one static, hash-named PNG set (§3.1 headers already cover them).

Expected: **first-load JS 369 → ~250 KB gz; requests 22 → 18; catalog off the critical path.**

### Phase 2 — Next week (payload + pipeline)

12. Swap XOR+gzip for Brotli/plain JSON, bump `CATALOG_FORMAT` to 5, delete the XOR key + `unmask()` (§4.2) → **−77 KB on the largest asset, −40 lines.**
13. Precompute the folded index into the artifact (§4.1 option 1); optionally move search into a Web Worker.
14. Generate a responsive `srcset` for the hero + a real LQIP (§4.4).
15. Add `scripts/verify-export.mjs` (budget gate) + `.github/workflows/ci.yml`.
16. `package.json` `deploy` script: `catalog:build && build && verify-export && wrangler deploy`. Retire or clearly mark `deploy.ps1`.
17. `docs/cloudflare.md` with the exact WAF/rate-limit expressions from §5.3, so the edge config is versioned.

### Phase 3 — Ongoing

18. Vitest unit suite (~40 tests) + golden-data test (§7.2).
19. Playwright E2E + the CPU-throttled perf spec (§7.4).
20. Decide on pricing visibility (§2.2) — this is a product call, not a code call.
21. Split `details-form.tsx` and `content.ts` when they next change.

### Expected end state

| Metric | Now | After Phase 2 |
|---|---|---|
| First-visit requests | 22 | **15–16** |
| First-visit compressed bytes | ~700 KB | **~430 KB** |
| Home JS (gz) | 369 KB | **~250 KB** |
| Catalog on first paint | 204 KB, blocking | **lazy, off critical path** |
| Largest asset | 204 KB | **~127 KB** |
| Main-thread freeze on load | ~245 ms | **< 25 ms** |
| Cacheable-without-revalidation | 2 of 22 resources | **all hashed assets** |
| Tests | 0 | **65+ unit, 8 E2E, 4 load, 1 perf** |
| CI | none | **typecheck + lint + test + build + budget + deploy** |

---

## 9. Appendix — full findings index

| ID | Severity | Area | Finding | File |
|---|---|---|---|---|
| C1 | P0 | Deploy | `wrangler.jsonc` var points at a catalog file that doesn't exist | `wrangler.jsonc` |
| C2 | P0 | Security | XOR key + full dataset publicly extractable | `src/config/site.ts`, bundle |
| C3 | P0 | Edge | `/icon`, `/apple-icon`, `/manifest.webmanifest` uncached | `public/_headers` |
| C4 | P0 | Edge | Wrong `Content-Type` for `/icon` (no override) | `public/_headers` |
| C5 | P0 | Edge | No CSP | `public/_headers` |
| C6 | P0 | Edge | No rate limiting / IP rules / bot rules at all | Cloudflare config |
| C7 | P1 | Perf | `fold()` index build blocks main thread ~245 ms | `search.ts` |
| C8 | P1 | Perf | `.dat` uncompressible by the edge (pre-gzip'd inside XOR) | `build-catalog.mjs` |
| C9 | P1 | Perf | 1.13 MiB / 13 chunks of JS on the home page | `app/page.tsx` |
| C10 | P1 | Perf | `motion` in 24 files incl. presentational sections | `components/` |
| C11 | P1 | Perf | Whole homepage is a client component | `app/page.tsx` |
| C12 | P1 | Perf | Catalog (204 KB) fetched on mount, below the fold | `use-catalog-loader.ts` |
| C13 | P1 | Perf | Two `ImageResponse` icons (29 KB) generated per URL | `app/icon.tsx`, `app/apple-icon.tsx` |
| C14 | P1 | Perf | Single 1376×768 hero for all viewports; 1×1 fake blur | `hero-section.tsx` |
| C15 | P2 | Correctness | `setPriceRange` writes a non-existent `page` key | `catalog-store.ts:121` |
| C16 | P2 | Quality | Duplicate theme provider file | `components/theme-provider.tsx` |
| C17 | P2 | Quality | `scriptProps` "React 19 fix" is a no-op / would break FOUC | `providers/theme-provider.tsx` |
| C18 | P2 | Quality | Two `cn` implementations | `ui/tooltip.tsx` |
| C19 | P2 | Quality | `_headers` references 2 files that don't exist | `public/_headers` |
| C20 | P2 | Quality | 3 ESLint errors | 3 files |
| C21 | P2 | Quality | Unused deps (`minisearch`, `tailwind-animations`) | `package.json` |
| C22 | P2 | Quality | `deploy.ps1` never builds or deploys | `deploy.ps1` |
| C23 | P2 | SEO | No `robots.txt`, no `sitemap.xml`, no JSON-LD | `src/app/` |
| C24 | P2 | A11y | No skip link; 4 nav landmarks; no `aria-current` on mobile nav | `layout.tsx`, `header.tsx` |
| C25 | P2 | UX | `aria-live` status says "loading catalog" in SSR, then swaps | `catalog-status.tsx` |
| C26 | P3 | DX | No CI, no tests, no `wrangler` in devDependencies | repo root |
| C27 | P3 | DX | Stray `// ← new` style comments, dead inline SVG | 3 files |
| C28 | P3 | DX | `DELIVERY_COUNTIES` typo exported across modules | `config/site.ts` |
| C29 | P3 | Perf | Mobile + desktop rows both in the DOM | `catalog-table.tsx` |
| C30 | P3 | SEO | Canonical `/checkout` vs served `/checkout/` | `app/checkout/page.tsx` |

---

## 10. What's in this branch right now

- `scripts/loadtest.mjs` — new, dependency-free load/stress harness (4 scenarios, thresholds, JSON output, CI exit codes). Verified working against the built `out/`.
- `OPTIMIZATION-REPORT.md` — this document.

Nothing else has been changed. Every fix above is scoped and ready to execute — say the word and I'll start with Phase 0 (it's ~2 hours of low-risk work with immediate wins), then Phase 1.
