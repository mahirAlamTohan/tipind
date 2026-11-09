# Operations

Everything needed to run, configure, release and debug the site.

## Requirements

- Node.js **≥ 20.9** (Next 16 requirement; the repo is developed on Node 22).
- npm 10 or Bun 1.4. `packageManager` in `package.json` names Bun, but every
  script is plain npm-compatible and `deploy.ps1` uses npm. `package-lock.json`
  is committed for reproducible npm installs.
- A Cloudflare account with Workers/static assets enabled (only for deploys).

```bash
npm install
npm run dev        # http://localhost:3000
```

`next build` loads `.env.production` automatically (NODE_ENV=production), so the
build works out of the box with the committed catalog. Use `.env.local` for
personal overrides; it is gitignored.

## Scripts

| Command                 | Does                                              |
| ----------------------- | ------------------------------------------------- |
| `npm run dev`           | Next dev server (Turbopack, React Compiler on)    |
| `npm run build`         | Static export to `out/`                           |
| `npm run preview`       | `wrangler dev` — serves `out/` like production    |
| `npm run deploy`        | `npm run build && wrangler deploy`                |
| `npm run typecheck`     | `next typegen && tsc --noEmit`                    |
| `npm run lint`          | ESLint over the whole project                     |
| `npm run lint:diff`     | ESLint limited to changed lines (`ESLINT_DIFF=1`) |
| `npm run format`        | Prettier write                                    |
| `npm run format:check`  | Prettier check (CI)                               |
| `npm run catalog:build` | Rebuild the catalog artifact (see below)          |

## Environment variables

All `NEXT_PUBLIC_*` values are **inlined into the static bundle at build time**
and are public. Changing one requires a rebuild and redeploy. Values without the
prefix are build/dev-time only.

| Variable                        | Used by                        | Purpose / default                                                                                                               |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_NAME`         | `config/site.ts`               | Brand name (`tipind`)                                                                                                           |
| `NEXT_PUBLIC_SITE_URL`          | metadata, canonical, OG        | Must be HTTPS; falls back to the Workers URL                                                                                    |
| `NEXT_PUBLIC_CONTACT_PHONE`     | top strip, contact, footer     | Displayed verbatim; `tel:` strips non-digits                                                                                    |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`   | header, hero, floating actions | Digits only (country code first)                                                                                                |
| `NEXT_PUBLIC_CONTACT_EMAIL`     | contact, footer                | `mailto:` target                                                                                                                |
| `NEXT_PUBLIC_TELEGRAM_USERNAME` | order dialog                   | `@handle` or `handle`; shown as the hand-off channel                                                                            |
| `NEXT_PUBLIC_SUPPORT_HOURS`     | contact, footer                | Free text                                                                                                                       |
| `NEXT_PUBLIC_CATALOG_DATA_URL`  | catalog loader                 | `/data/catalog.<hash>.dat` (same-origin path)                                                                                   |
| `NEXT_PUBLIC_CATALOG_XOR_KEY`   | catalog loader + build script  | Obfuscation key; **not a secret**                                                                                               |
| `CATALOG_SHEET_URL`             | catalog build script           | Apps Script URL; never shipped                                                                                                  |
| `NEXT_ALLOWED_DEV_ORIGINS`      | `next.config.ts`               | Comma-separated extra hosts allowed to hit the dev server (LAN IPs, tunnels). `*.e2b.app` is always allowed for hosted previews |

Missing contact values degrade gracefully: hrefs fall back to `#contact` and the
UI shows the content fallbacks. A missing catalog URL leaves the catalog
“unconfigured”; a missing XOR key makes the loader refuse to decode.

## Development

- `npm run dev` binds `localhost` by default. To test from a phone on the same
  network: `npx next dev --hostname 0.0.0.0` and set
  `NEXT_ALLOWED_DEV_ORIGINS="192.168.1.20"` if the browser host is not localhost.
- React Compiler is enabled (`reactCompiler: true`); avoid patterns it cannot
  optimise (conditional hooks, mutating props) — ESLint enforces the rules.
- Turbopack is the default bundler. `@tailwindcss/turbopack` is installed for it.

## Refreshing the catalog

```bash
npm run catalog:build
```

- Pulls the live sheet through `CATALOG_SHEET_URL`, writes
  `public/data/catalog.<hash>.dat`, deletes older `catalog.*.dat`, saves a raw
  snapshot under `extras/` (gitignored), and updates
  `NEXT_PUBLIC_CATALOG_DATA_URL` in `.env.production`.
- Preview the report; it tells you how many rows were dropped and why.
- `npm run build` afterwards to bake the new URL into the bundle. (The filename
  is hashed, so a stale bundle would request a deleted file.)
- Keep the format constants in sync if you change the payload (see
  [catalog pipeline](./catalog-pipeline.md)).

## Continuous integration

The pipeline is provided as a template, `docs/engineering/ci-workflow.yml.example`,
because adding `.github/workflows/*.yml` requires a token with the `workflows`
permission. To enable it:

```bash
mkdir -p .github/workflows
cp docs/engineering/ci-workflow.yml.example .github/workflows/ci.yml
git add .github/workflows/ci.yml && git commit -m "ci: add pipeline"
```

It runs on every push to `main` and on every pull request:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run format:check`
5. `npm run build`
6. a Node check that decodes `public/data/catalog.<hash>.dat` with the key from
   `.env.production` and asserts the format and a non-empty product list
7. uploads `out/` as a build artifact (7 days)

A red run therefore means either the code or the catalog artifact is broken —
both are blocking for a release. There is no deployment step in CI; publishing
stays a deliberate `npm run deploy`.

## Release

1. `npm run catalog:build` (if prices changed)
2. `git add public/data .env.production` and commit the artifact with the code
3. `npm run typecheck && npm run lint && npm run build`
4. `npm run deploy`
   - first time only: `npx wrangler login`
   - the Worker name comes from `wrangler.jsonc` (`tipind`)
5. Verify: open the Workers URL, load the catalog, add an item, reach
   `/checkout/`, copy an order message.

`./deploy.ps1` (Windows/PowerShell) automates steps 1–3 plus `git commit` and
`git push` with GitHub login recovery. It does **not** run `wrangler deploy` —
use `npm run deploy` for the actual publish.

### What gets deployed

`wrangler.jsonc`:

```jsonc
{
  "name": "tipind",
  "compatibility_date": "2026-11-01",
  "assets": { "directory": "./out", "not_found_handling": "404-page" },
  "observability": {
    "logs": { "enabled": true, "invocation_logs": true, "persist": true },
  },
}
```

`public/_headers` is copied into `out/` and applied by Cloudflare:

- `/_next/static/*` and `/data/*.dat`: `Cache-Control: immutable, max-age=1y`
- generated `/icon`, `/apple-icon`, `/opengraph-image`: correct image content types
- `/*`: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Strict-Transport-Security`, restrictive `Permissions-Policy`, `COOP`

`X-Frame-Options: DENY` means the site cannot be embedded in an iframe. If you
ever need an embed, switch it to `SAMEORIGIN` and allow specific frames.

## Monitoring

There is no analytics and no client error reporting. The Worker has observability
logs enabled in `wrangler.jsonc`, which is enough to see request volumes and
failures at the edge, but not client-side JS errors. Adding a privacy-friendly
analytics snippet is a roadmap item.

## Troubleshooting

| Symptom                                           | Cause                                                     | Fix                                                                      |
| ------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Blocked cross-origin request` in the dev console | Dev server reached through a host that is not allowlisted | Add the host to `NEXT_ALLOWED_DEV_ORIGINS`, or use localhost             |
| Catalog stays “loading” forever                   | URL missing/typo, or file not in `out/data`               | Check `.env.production` and `ls public/data`; rebuild                    |
| “could not be decoded”                            | Artifact built with a different XOR key                   | Rebuild catalog with the current key                                     |
| “unsupported format version”                      | Old artifact left behind                                  | `npm run catalog:build` with `--clean`, then rebuild                     |
| `/checkout` 308 redirect                          | `trailingSlash: true`                                     | Use `/checkout/` (links already do)                                      |
| `next start` fails                                | Output is a static export                                 | Use `npm run preview` (Wrangler) or any static file server on `out/`     |
| A bare `tsc` cannot find `LayoutProps`            | Next's generated route types are missing                  | Use `npm run typecheck` (it runs `next typegen` first)                   |
| Fonts flash or fallback                           | Local font preload disabled by an error                   | Check `src/fonts/*.woff2` are committed and imported in `app/layout.tsx` |
| Deploy asks for a login                           | Wrangler not authenticated                                | `npx wrangler login`                                                     |
| Build picks up local values                       | `.env.local` exists                                       | It overrides `.env.production`; remove it for production builds          |

## Housekeeping

- `npm outdated` before each release; keep Next/React patch versions aligned.
- Do not commit `out/`, `.next/`, `extras/` or `node_modules/`.
- The catalog `.dat` files are versioned and **should** be committed — they are
  the deployable data.
- Rotating `NEXT_PUBLIC_CATALOG_XOR_KEY` requires rebuilding the catalog and the
  site in the same release.
