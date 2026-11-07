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
npm run catalog:build   # pull the sheet, rebuild public/data/catalog.<hash>.dat
npm run deploy          # catalog:build + build + verify + wrangler deploy
```

`npm run deploy` stops before uploading if any check in `npm run verify` fails.

You need to be logged in to Cloudflare once:

```bash
npx wrangler login
```

### Option B — CI (push to `main`)

`scripts/ci.sh` is the whole gate — typecheck → lint → build → verify. Run it
locally and you get exactly what CI would run:

```bash
./scripts/ci.sh
```

#### Adding GitHub Actions

The workflow file is **not committed** (the repo's GitHub App cannot write to
`.github/workflows/`). To enable it, create
`.github/workflows/ci.yml` in the GitHub web UI (**Add file → Create new
file**, path `.github/workflows/ci.yml`) and paste:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: ./scripts/ci.sh

  deploy:
    needs: verify
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      # Builds with the catalog artifact committed to the repo, so CI never
      # depends on the Google Sheet being reachable.
      - run: npm run build
      - run: npm run verify
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --minify
```

Then add these repository secrets (**Settings → Secrets and variables →
Actions**):

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

Format **6**: a masked envelope, not a readable file.

```
catalog.<hash>.dat  =  "TIPCAT6:" + base64( xor( gzip( JSON ) ) )
```

The JSON inside is unchanged from format 5:

```jsonc
{
  "format": 6,
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
`scripts/build-catalog.mjs`; `npm run verify` fails the build if it drifts, and
it decodes the artifact to check the format inside it.

#### Why the catalog is masked

The data is scraped from public supplier sites, so it is not a secret. The
requirement is narrower: **opening a URL should not hand it over.** A plain
`.json` file is harvestable with one `curl`; a masked file is not.

The mask is repeating-key XOR with a key that ships in the JS bundle. That is
not encryption and should never be called encryption — anyone willing to read
our JavaScript can decrypt the file in about a minute. What it does change is
the cost of harvesting: from *open a URL* to *study and run the site's code*.

Verify it yourself:

```bash
curl -s https://tipind.com/data/catalog.<hash>.dat | head -c 40
# TIPCAT6:a+J4aW5kLWNjd83RhBWOp9ddkwdvuOwaydMK820h9onCT38lPwgPYPtCTcD73fRE…
```

> **Trade-off, measured.** Masking costs bandwidth. XOR removes the redundancy
> gzip and Brotli rely on, so the response size is gzip's output, not Brotli's:
> about **205 KB** instead of **148 KB** over the wire (+57 KB, +38%).
> If that ever becomes a problem, the lever is the artifact itself — dropping
> rare fields, or paging the catalog — not removing the mask, which is a product
> requirement.
>
> An earlier format (v4 and below) wrote binary `MAGIC + xor(gzip(JSON))`. That
> could not be compressed by the CDN *at all*. Format 6 keeps the mask and makes
> the payload base64 text, so Cloudflare can still apply Brotli to the envelope.

To inspect a built artifact while developing:

```bash
node -e "const z=require('zlib'),f=require('fs');const b=f.readFileSync(process.argv[1],'utf8').trim().slice(8);const k=Buffer.from('tipind-catalog-mask-v6');const x=Buffer.from(b,'base64');const p=Buffer.allocUnsafe(x.length);for(let i=0;i<x.length;i++)p[i]=x[i]^k[i%k.length];console.log(JSON.parse(z.gunzipSync(p)).products.length)" public/data/catalog.<hash>.dat
```

---

## Configuration

All configuration is build-time. There are no runtime environment variables.

**Where a value lives → [`src/config/README.md`](src/config/README.md).** That
file is the map: every string and every setting, which file owns it, and a
look-up table for "I want to change X, where do I edit?". Read it before
searching the codebase.

The rule in one line:

> **Facts** (name, contact, countries, payment methods) → `src/config/site.ts`
> **Words** (headlines, FAQ, notices) → `src/config/content.ts` or `src/features/<area>/content.ts`

| File | Purpose |
|---|---|
| `.env.production` | Production values, committed on purpose. These end up in the browser bundle. |
| `.env.example` | Template for a fresh checkout. Every `NEXT_PUBLIC_*` var must appear here. |
| `wrangler.jsonc` | Worker name, assets directory, observability. **No `vars` block** — see below. |

`NEXT_PUBLIC_*` values are inlined into the JS at build time and are visible to
everyone. Never put a secret there.

**Where we ship is defined once.** `NEXT_PUBLIC_DELIVERY_COUNTRIES` (ISO codes)
feeds the checkout dropdown, the FAQ answer, the checkout notice, the about
section and the footer. Everything else derives from it. Before this was
centralised the list existed in five places and had already drifted — the
dropdown offered India while every sentence said four countries.

**The catalog URL lives in exactly one place:** `NEXT_PUBLIC_CATALOG_DATA_URL`
in `.env.production`, written by `catalog:build`. Do not re-add it to
`wrangler.jsonc` `vars` — that is how this project previously shipped a site
pointing at a catalog file that did not exist.

`npm run content:audit` enforces the rules above: no unused copy, no hardcoded
country list, no retyped brand name, no business config leaking into a feature,
and every env var documented.

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
curl -sI https://tipind.com/data/catalog.<hash>.dat | grep -iE 'cache-control|cf-cache-status|content-encoding'
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
./scripts/ci.sh     # all of the below, in order
```

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint, type-aware, fails on any warning
npm run build       # static export
npm run verify      # catalog / headers / budget / SEO gate
npm run security    # XSS / input-handling / build-leak regressions
```

`npm run verify` (source: `scripts/verify-export.mjs`) fails the build when:

- the catalog URL baked into the JS does not exist in `out/`
- the artifact's `format` does not match `CATALOG_FORMAT`
- any required `Cache-Control` or security header is missing from `_headers`
- first-load JS > 420 KB gz, requests > 24, or total transfer > 900 KB gz
- `robots.txt`, `sitemap.xml`, the manifest, JSON-LD or the skip link is gone

`npm run security` (source: `scripts/security-check.mjs`) fails when:

- the JSON-LD serializer stops escaping `<`, `>`, `&`, or anything writes raw
  `JSON.stringify` into `dangerouslySetInnerHTML`
- a checkout field loses its length cap or the shared control-character strip
- the order message stops flattening line breaks in single-line fields
- a build ships source maps, `.ts`/`.tsx`, or `.env` files
- a `target="_blank"` link loses its `rel="noreferrer"`
- `innerHTML`, `eval`, or `new Function` appears in `src/`

### Security notes

Everything is client-side, so the threat model is different from a server app.
What was checked, and what it means:

| Area | Status |
|---|---|
| XSS via JSON-LD | Values are serialised with `<`, `>`, `&` escaped to `\u003c` etc. Without this, a `</script>` in any config string closes the element and the rest is parsed as HTML. |
| Order-message injection | Single-line fields cannot carry newlines, so a name cannot fake a `Preferred payment:` line in the WhatsApp message your team receives. `notes` keeps its paragraphs. |
| Field length | Capped in the Zod schema, not only via the HTML `maxLength` attribute, which does not apply to programmatic values or stored data. |
| Stored data | Re-read through a sanitizer on every load; a bad record is dropped rather than trusted. |
| Path traversal | Not applicable to the deployed site: Cloudflare maps URLs to asset keys and never touches the filesystem. `scripts/preview.mjs` is local-only and blocks `..` and the `_headers`, `_redirects`, `_routes.json` files that Cloudflare consumes. |
| Source leaks | The export ships no maps, no TypeScript, no `.env`. Verified by `npm run security`. |
| Dependencies | `next` is pinned to a patched 16.4.x. The three critical advisories (image-optimisation RCE, Server Actions DoS, `use cache` RCE) need a Node runtime; this is a static export with no server, no Server Actions and `images.unoptimized`, so they were not reachable — but pinning costs nothing. |
| Catalog harvesting | The artifact is masked (format 6), so a bare `GET` returns an unreadable envelope. It is **not** encrypted: the key ships in the bundle, so someone determined enough to read the site's JS can extract the data. The goal is to stop casual scraping, not to make it impossible. |
| What the site cannot protect | Prices and product data are client-side: a determined visitor can edit their own cart in devtools, and can recover the catalog by running our code. The order is a *request for a quote* that your team confirms, so the message is not a contract. Treat every incoming order as unverified. |

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
src/lib/sanitize.ts      control-char / bidi / zero-width stripping
src/config/README.md     which file owns which content/config value
src/config/site.ts       facts: identity, contact, countries, payments
src/config/content.ts    site-wide copy
src/config/links.ts      URLs derived from contact details
src/styles/main.css      Tailwind theme + the handful of custom classes
scripts/build-catalog.mjs  sheet → catalog.json
scripts/verify-export.mjs  post-build gate
scripts/security-check.mjs XSS / input / build-leak regressions
scripts/content-audit.mjs  dead copy / duplicated facts / env docs
scripts/loadtest.mjs       load/stress harness
scripts/ci.sh              typecheck + lint + build + verify + security
scripts/preview.mjs        local stand-in for the Cloudflare asset layer
scripts/build-client-questionnaire.py  regenerates the client content questionnaire
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
