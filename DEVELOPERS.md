# tipind — Developer documentation

Technical reference for setting up, modifying, and deploying tipind. If you are
the business owner and just want to know what the site does, read
[`README.md`](./README.md) instead.

---

## Quick start

```bash
npm install           # or: bun install
npm run dev           # http://localhost:3000
npm run build         # static export into out/
npm run verify        # post-build gate: catalog, headers, budget
```

Node 22+ (or `bun@1.4.2` if you prefer).

---

## Deploying

Everything ships as static files via Cloudflare Workers assets.

### Option A — one command (recommended)

```bash
npm run catalog:build   # pull the Google Sheet, rebuild catalog artifact
npm run deploy          # catalog:build + build + verify + wrangler deploy
```

`npm run deploy` stops before uploading if `npm run verify` fails.

You need to be logged in to Cloudflare once:

```bash
npx wrangler login
```

### Option B — CI (push to `main`)

The workflow file is **not committed**. Create
`.github/workflows/ci.yml` in the GitHub web UI and paste:

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
      - run: npm run build
      - run: npm run verify
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --minify
```

Add repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Where to get it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → *Edit Cloudflare Workers* template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right sidebar |

### Option C — drag and drop

1. `npm run build`
2. Open [Cloudflare dashboard → Workers & Pages](https://dash.cloudflare.com) → `tipind`
3. **Create deployment** → drag the whole `out/` folder in

---

## Refreshing the catalog

Product data lives in a Google Sheet behind an Apps Script web app.

```bash
npm run catalog:build
```

This downloads the sheet, drops invalid rows, sorts by name, converts prices to
integer mills, writes a versioned artifact, and rewrites
`NEXT_PUBLIC_CATALOG_DATA_URL` in `.env.production`.

Commit the new artifact and `.env.production` together.

### Format

Format 6: `TIPCAT6:` + base64( xor( gzip( JSON ) ) ). The mask stops casual
URL-harvesting but is not encryption — the key ships in the JS bundle.

---

## Configuration

All configuration is build-time. There are no runtime environment variables.

**Facts** (name, contact, countries, payment methods) →
`src/config/site.ts`
**Words** (headlines, FAQ, notices) → `src/config/content.ts` or
`src/features/<area>/content.ts`

| File | Purpose |
|------|---------|
| `.env.production` | Production values, committed. Inlined into the browser bundle. |
| `.env.example` | Template for a fresh checkout. |
| `wrangler.jsonc` | Worker name, assets directory. No `vars` block. |

Never put secrets in `NEXT_PUBLIC_*` values.

`npm run content:audit` enforces: no unused copy, no hardcoded country lists,
no duplicated business config, every env var documented.

---

## Cloudflare edge setup

The deployment is an **assets-only Worker** (`wrangler.jsonc` has no `main`).
Requests are answered by files in `out/` — no script runs.

| | Assets-only | With a Worker |
|-----|-------------|---------------|
| Requests | Free, unlimited | 100,000/day Free, then 429 |
| DDoS | Automatic | Automatic |

### Response headers

`public/_headers` sets cache controls, CSP, HSTS, frame-ancestors, etc.
`npm run verify` fails if any required header is missing.

### Manual setup (Cloudflare dashboard)

1. Connect a custom domain (required for WAF rules).
2. SSL/TLS: Full, Always Use HTTPS, Automatic HTTPS Rewrites, TLS 1.2+, Brotli On.
3. WAF rules: block non-GET, block catalog scrapers, hotlink protection, threat score.
4. Rate limiting: 10 requests per 10 seconds on `/data/`.
5. Cache rules: catalog and framework assets at 1 year TTL.

---

## Load testing

```bash
npm run loadtest -- --target https://tipind.com --scenario cold
npm run loadtest -- --scenario burst --requests 10000 --concurrency 200
npm run loadtest -- --scenario soak --duration 120 --rate 100
```

Localhost runs are smoke tests only. Use the deployed URL for real numbers.

---

## Pre-flight checks

```bash
./scripts/ci.sh   # typecheck + lint + build + verify + security
```

| Command | What it checks |
|---------|---------------|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, type-aware, zero warnings |
| `npm run build` | Static export |
| `npm run verify` | Catalog, headers, budget, SEO gate |
| `npm run security` | XSS, input handling, build leaks |
| `npm run content:audit` | Dead copy, duplicated facts, env docs |
| `npm run security:audit` | Static security audit |
| `npm run post-deploy-audit` | Live security audit against a URL |

---

## Security posture

- Stored-XSS guardrails in `src/config/site.ts` reject HTML-breaking chars at build time.
- Order message flattens line breaks in single-line fields.
- Field lengths capped in Zod schema, not just HTML `maxLength`.
- Stored data re-validated on every read; bad records are dropped.
- No source maps, TypeScript, or `.env` in the export.
- Catalog artifact is masked (format 6) to stop casual scraping.
- No login, no payment gateway, no database — minimal attack surface.

---

## Repo map

```
src/app/                 routes; layout.tsx is the shell
src/components/layout/   header, logo, top strip, floating actions
src/components/sections/ home page sections (server components)
src/components/ui/       primitives (button, tooltip, slider, combobox…)
src/features/catalog/    data loading, search, filters, table
src/features/cart/       cart store (localStorage, re-validated on read)
src/features/checkout/   form, validation, order message
src/lib/sanitize.ts      control-char / bidi / zero-width stripping
src/config/site.ts       facts: identity, contact, countries, payments
src/config/content.ts    site-wide copy
src/config/links.ts      URLs derived from contact details
src/styles/main.css      Tailwind theme + custom classes
scripts/build-catalog.mjs  sheet → catalog artifact
scripts/verify-export.mjs  post-build gate
scripts/security-check.mjs XSS / input / build-leak regressions
scripts/content-audit.mjs  dead copy / duplicated facts / env docs
scripts/loadtest.mjs       load/stress harness
scripts/ci.sh              typecheck + lint + build + verify + security
scripts/preview.mjs        local stand-in for Cloudflare asset layer
public/_headers          Cloudflare response headers
public/data/             committed catalog artifact
docs/                    product, engineering, decision, security docs
```