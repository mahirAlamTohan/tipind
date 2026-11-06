# tipind

A fully static pharmaceutical catalog. Next.js 16 (`output: "export"`) builds
to `out/`, and Cloudflare Workers serves those files as static assets — there is
no server, no runtime, and no API.

**Live:** https://tipind.mahiralamtohan.workers.dev

---

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # static export into out/
npm run verify         # post-build gate: catalog, headers, budget
```

Node 22+.

---

## Deploying

Everything goes out as static files. There are two ways to ship, and they do
the same thing.

### Option A — one command (recommended)

```bash
npm run catalog:build   # pull the sheet, rebuild public/data/catalog.<hash>.json
npm run deploy          # catalog:build + build + verify + wrangler deploy
```

`npm run deploy` stops before uploading if any check in `npm run verify` fails.

You need to be logged in to Cloudflare once:

```bash
npx wrangler login
```

### Option B — CI (push to `main`)

`.github/workflows/ci.yml` runs typecheck → lint → build → verify on every push
and pull request, and deploys `main` to Workers. CI uses the catalog artifact
already committed in the repo, so it never depends on Google Sheets being
reachable.

Add these repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → *Edit Cloudflare Workers* template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right sidebar |

### Option C — no CLI at all (drag and drop)

If Wrangler and GitHub Actions are both too much, you can still ship by hand:

1. `npm run build`
2. Open [Cloudflare dashboard → Workers & Pages](https://dash.cloudflare.com) → `tipind`
3. **Create deployment** → drag the whole `out/` folder in

The catch: you must drag `out/` *after* a successful `npm run build`, and you
must not rename the folder. Option A is the same thing without the mouse.

---

## Refreshing the catalog

The product data lives in a Google Sheet behind an Apps Script web app. The
build script downloads it, validates it, and writes a versioned artifact.

```bash
npm run catalog:build
```

That command:

1. asks the Apps Script how many rows the tab has, then downloads exactly that
   many in chunks (so it can't miss rows or pull thousands of blank ones),
2. drops rows marked `needs review`, invalid rows and duplicates,
3. sorts by product name, converts prices to integer mills (1/1000 USD),
4. writes `public/data/catalog.<sha256-8>.json`,
5. deletes the previous catalog file,
6. rewrites `NEXT_PUBLIC_CATALOG_DATA_URL` in `.env.production`.

Commit the new `.json` **and** `.env.production` together. The old artifact is
fingerprinted by content hash, so it is safe to keep cached forever — but only
one copy should ship.

If something goes wrong, `npm run verify` tells you exactly which of these
steps is out of sync.

### Offline / from a JSON file

```bash
node scripts/build-catalog.mjs -i ./source.json --clean --write-env
```

The file is a plain array of row objects. Column headers are aliased: `Product
Name`, `Active Ingredient`, `Manufacturer`, `Packaging`, `Type`, `Rate (USD)`,
`Status` all resolve from the variations listed at the top of
`scripts/build-catalog.mjs`.

### Format

Format **5**: plain JSON, no compression wrapper, no obfuscation.

```jsonc
{
  "format": 5,
  "priceBounds": [9, 1557300],           // mills, [min, max]
  "manufacturers": ["…"],                 // dictionary
  "packaging": ["…"],
  "types": ["…"],
  "products": [
    // [name, ingredient, manufacturerIdx, packagingIdx, typeIdx, priceMills]
    ["1 MUST SACHET 5GM", "L-Taurine 500mg, …", 62, 36, 9, 446]
  ]
}
```

`-1` means "no value". `CATALOG_FORMAT` in
`src/features/catalog/constants.ts` must match `FORMAT` in
`scripts/build-catalog.mjs`; `npm run verify` fails the build if it drifts.

> **Why plain JSON and not the old `.dat`?** The previous format was
> `MAGIC + XOR(gzip(JSON))`. Pre-compressing made the file opaque, so
> Cloudflare could not re-compress it and it was stuck at gzip's ratio forever.
> Plain JSON is the same size over gzip and ~26% smaller over Brotli, removes a
> build secret, and lets the browser decode with `response.json()` instead of a
> hand-built `DecompressionStream`. Inspect it with `jq . catalog.*.json`.

---

## Configuration

All configuration is build-time. There are no runtime environment variables.

| File | Purpose |
|---|---|
| `.env.production` | Production values, committed on purpose. These end up in the browser bundle. |
| `.env.example` | Template for a fresh checkout. |
| `wrangler.jsonc` | Worker name, assets directory, observability. **No `vars` block** — see below. |

`NEXT_PUBLIC_*` values are inlined into the JS at build time and are visible to
everyone. Never put a secret there.

**The catalog URL lives in exactly one place:** `NEXT_PUBLIC_CATALOG_DATA_URL`
in `.env.production`, written by `catalog:build`. Do not re-add it to
`wrangler.jsonc` `vars` — that is how this project previously shipped a site
pointing at a catalog file that did not exist.

---

## Cloudflare edge setup

The deployment is an **assets-only Worker**: `wrangler.jsonc` has no `main`, so
every request is answered by a file in `out/` and no script ever runs. That
matters more than it sounds:

| | Assets-only | With a Worker (`main` / `run_worker_first`) |
|---|---|---|
| Requests | **free and unlimited** | 100,000/day on Free, then 429 |
| CPU per request | n/a | 10 ms on Free |
| DDoS | automatic | automatic |

Keep it assets-only unless you have a specific reason not to.

### Response headers

`public/_headers` ships in the export and is applied by Cloudflare. It sets:

- `immutable, 1 year` on `/_next/static/*` and `/data/catalog.*.json`
- `must-revalidate` on `/`, `/index.html`, `/checkout/*`, `/404.html`
- a strict `Content-Security-Policy`, `X-Frame-Options: DENY`, HSTS with
  `includeSubDomains`, `Referrer-Policy`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`,
  `X-DNS-Prefetch-Control: off`

`npm run verify` fails if any of those go missing. Rules match the **request**
path, not the file that answers it, and a header set by two matching rules is
comma-joined — so the catch-all block deliberately sets no `Cache-Control`.

### ⚠️ Manual setup — dashboard, not code

These live in the Cloudflare dashboard and cannot be committed to the repo.
Do them once.

#### 1. Connect the custom domain (do this first)

`*.workers.dev` is a shared domain with no WAF zone attached, so **most of the
security rules below cannot be applied until the Worker is on your own domain**
(Cloudflare treats `*.workers.dev` traffic as outside your zone).

Workers & Pages → `tipind` → **Settings → Domains & Routes → Add → Custom
domain**, e.g. `tipind.com` (the domain must be in the same Cloudflare account).

Then update `NEXT_PUBLIC_SITE_URL` in `.env.production` and rebuild.

#### 2. Basic settings to turn on

Cloudflare dashboard → your domain:

- **SSL/TLS → Overview** → encryption mode **Full** (or Full (strict)).
- **SSL/TLS → Edge Certificates** →
  - *Always Use HTTPS*: **On**
  - *Automatic HTTPS Rewrites*: **On**
  - *Minimum TLS Version*: **TLS 1.2**
  - *TLS 1.3*: **On**
- **Speed → Optimization** → *Brotli*: **On** (default). This is what shrinks
  the catalog; with Brotli on it is ~127 KB instead of ~192 KB.
- **Security → Bots** → *Bot Fight Mode*: **leave Off** unless you are being
  scraped. It challenges legitimate crawlers and uptime monitors too.

#### 3. WAF rules (Free plan: 5 custom rules + 1 rate-limit rule)

Security → Security rules → **Custom rules** → *Create rule* → action **Block**
unless noted. Paste the expression into the "Edit expression" box.

| # | Name | Expression |
|---|---|---|
| 1 | Block non-GET | `http.request.method not in {"GET" "HEAD" "OPTIONS"}` |
| 2 | Block catalog scrapers | `(http.request.uri.path matches "^/data/") and (http.user_agent contains "python" or http.user_agent contains "curl" or http.user_agent contains "wget" or http.user_agent contains "scrapy" or http.user_agent contains "go-http-client")` |
| 3 | Hotlink protection | `(http.request.uri.path matches "^/_next/static/media/") and http.referer ne "" and not http.referer contains "tipind"` |
| 4 | Threat score | `cf.threat_score gt 10` → action **Managed Challenge** (not Block) |
| 5 | Spare — keep it for a real incident | e.g. `(ip.src eq 1.2.3.4)` → **Block** |

Rule 1 is the single highest-value one on a static site: it removes almost all
scanner and exploit-probe traffic for free.

#### 4. Rate limiting (the one rule the Free plan gives you)

Security → Security rules → **Rate limiting rules** → *Create rule*.

- **If incoming requests match:** `(http.request.uri.path matches "^/data/")`
- **With the same:** IP address
- **Rate:** 10 requests per **10 seconds** (Free plan is locked to a 10-second
  period and a 10-second block)
- **Then:** Block for 10 seconds

This is the anti-scrape/bandwidth rule. Scope it to `/data/` rather than `/*`,
because it counts *all* requests from an IP — a shared connection could
otherwise get blocked while browsing normally.

#### 5. Cache rules (optional but cheap)

Caching → Cache Rules → *Create rule*, twice:

- **Catalog:** `(http.request.uri.path matches "^/data/.*")` → *Eligible for
  cache*, Edge TTL **1 year**, Browser TTL **1 year**, and under *Cache key* →
  **Ignore query string**.
- **Framework assets:** `(http.request.uri.path matches "^/_next/static/.*")` →
  *Eligible for cache*, Edge TTL **1 year**.

Without rule 1, a `Set-Cookie` or `Authorization` header anywhere in the chain
silently turns every catalog fetch into `cf-cache-status: BYPASS`.

#### 6. Verify it took effect

```bash
curl -sI https://tipind.com/data/catalog.c9720ce3.json | grep -iE 'cache-control|cf-cache-status|content-encoding'
curl -sI https://tipind.com/ | grep -i 'content-security-policy'
curl -sI https://tipind.com/icon | grep -iE 'cache-control|content-type'
```

Expect `content-encoding: br`, an `immutable` cache-control on the catalog, and
a `content-security-policy` header on the HTML. If the CSP is missing, the
`_headers` file did not reach the export — run `npm run verify`.

### Not set up, and why

- **Persistent IP bans.** A Worker isolate has no memory between requests, so
  "ban this IP for 24 h" needs KV or D1 plus a real Worker in front — which
  reintroduces the 100k/day limit. The five WAF rules plus the rate limit cover
  the realistic threats (scraping, hotlinking, scanners) without that cost.
- **Service worker / offline mode.** `_headers` used to reference `/sw.js` and
  `/precache-manifest.json`; neither existed. Removed. If you add one later,
  serve it with `no-store`.
- **`robots.txt` blocking the catalog.** Deliberate: this is a catalogue site,
  being found is the point.

---

## Load testing

`scripts/loadtest.mjs` is a dependency-free stress harness.

```bash
# The only run that means anything: against the deployment
npm run loadtest -- --target https://tipind.com --scenario cold

# Find the cliff
npm run loadtest -- --scenario burst --requests 10000 --concurrency 200 \
  --max-error-rate 0.01 --max-p95 800

# Sustained load
npm run loadtest -- --scenario soak --duration 120 --rate 100

# The biggest single asset, repeatedly
npm run loadtest -- --scenario catalog --requests 500
```

Scenarios: `cold` (every resource a first visit fetches, discovered from the
HTML and the JS bundle), `catalog`, `burst`, `soak`. Exit codes: `0` pass, `1`
threshold breached, `2` usage error. `--json` for CI.

> **A localhost run is a smoke test, not a benchmark.** No TLS, no DNS, no
> geographic RTT, no CDN, no cold cache — it reports single-digit milliseconds
> and passes everything. The harness prints a warning when you point it at
> localhost for exactly this reason. Use it locally only to check that the
> server answers; use the deployed URL for real numbers.
>
> And even then: this is an assets-only Worker, so the ceiling is Cloudflare's
> and the visitor's connection, not yours. Use the numbers to catch a
> cache-header regression or a broken route, not to estimate capacity.

---

## Checks before you ship

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint, strict + type-aware
npm run build       # static export
npm run verify      # catalog / headers / budget / SEO gate
```

`npm run verify` (source: `scripts/verify-export.mjs`) fails the build when:

- the catalog URL baked into the JS does not exist in `out/`
- the artifact's `format` does not match `CATALOG_FORMAT`
- any required `Cache-Control` or security header is missing from `_headers`
- first-load JS > 420 KB gz, requests > 24, or total transfer > 900 KB gz
- `robots.txt`, `sitemap.xml`, the manifest, JSON-LD or the skip link is gone

---

## Repo map

```
src/app/                 routes; layout.tsx is the only shell
src/components/layout/   header, logo, top strip, floating actions
src/components/sections/ home page sections (all server components)
src/components/ui/       primitives (button, tooltip, slider, combobox…)
src/features/catalog/    data loading, search, filters, table
src/features/cart/       cart store (localStorage, re-validated on read)
src/features/checkout/   form, validation, order message
src/styles/main.css      Tailwind theme + the handful of custom classes
scripts/build-catalog.mjs  sheet → catalog.json
scripts/verify-export.mjs  post-build gate
scripts/loadtest.mjs       load/stress harness
public/_headers          Cloudflare response headers
public/data/             the committed catalog artifact
```

## Trade-offs worth knowing

- **No animation library on the home page.** `motion` is only used by
  `/checkout` (step transitions, dialog). Header, hero, logo, filters and
  floating actions use CSS — including scroll-driven animations, which degrade
  to the static layout in browsers that lack them.
- **The catalog loads when you get near it**, not on page load. It is the
  largest transfer and sits below the fold.
- **Prices ship in the browser.** The catalog is public by design, so anyone can
  extract it with `curl`. Edge rate limiting raises the cost; it does not
  prevent it. Keep that in mind if the price list is commercially sensitive.
- **`localStorage` is treated as hostile input** on every read and rewritten
  through a validator. Do not "optimise" that away.
