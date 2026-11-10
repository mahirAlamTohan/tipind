# 0008 — Split the catalog pipeline from the site repository

Date: 2026-11-09
Status: Proposed (supersedes the local-push half of `deploy.ps1`)

## Context

The repository currently does four jobs at once:

1. the **site** (`src/`, `public/`),
2. the **catalog build** (`scripts/build-catalog.mjs`), which holds the only
   secret the project has — access to the source sheet,
3. the **deploy** (`deploy.ps1` → `git add -A` → push → `npm run deploy` on a
   laptop), and
4. the **history**, which is public and contains the sheet endpoint (see the
   [security review](../security/review-2026-11.md), F-01).

Those jobs have different blast radii. Anything that can read the sheet can
publish prices; anything that can deploy can change what buyers see and who they
pay. Keeping all four in one public repository with one personal token means a
mistake in any one of them compromises the others.

The question that blocks the split: **if the pipeline lives somewhere else, how
does a sheet edit reach Cloudflare?**

## The answer in one sentence

A sheet edit reaches Cloudflare the same way it does today — as a **new
`catalog.<hash>.dat` committed to the site** — but the machine that reads the
sheet and the machine that publishes the site should be **CI jobs with different
secrets**, not one laptop with both.

The catalog is a _file in the site_, not a service. That is the property that
makes the split easy: whoever produces the file only has to hand it over; the
site never needs to know where it came from.

## What is actually being split

| Concern                          | Needs the sheet secret | Needs the Cloudflare token | Belongs in                                  |
| -------------------------------- | ---------------------- | -------------------------- | ------------------------------------------- |
| `src/`, `public/`, docs          | No                     | No                         | Site repo (private)                         |
| `scripts/build-catalog.mjs`      | **Yes**                | No                         | Pipeline (same repo, separate folder + job) |
| `next build` + `wrangler deploy` | No                     | **Yes**                    | Deploy job (site repo)                      |
| `deploy.ps1`                     | Yes                    | Yes                        | **Delete** — it is the problem              |

The mistake to avoid is splitting the _code_ while leaving the secrets in one
place. Two repositories with the same token is more work, not more safety.

## Options

### A. One private repo, two workflows, secrets in GitHub (recommended)

Keep the code together but move the jobs apart:

```
tools/catalog/            ← the builder, its own dependencies, no runtime import
  build-catalog.mjs
.github/workflows/
  catalog.yml             ← sheet → artifact → commit (holds SHEET secret only)
  deploy.yml              ← build + wrangler deploy (holds CLOUDFLARE token only)
```

`catalog.yml` runs on a schedule or on demand, reads the sheet, writes
`public/data/catalog.<hash>.dat`, updates `NEXT_PUBLIC_CATALOG_DATA_URL` and
`NEXT_PUBLIC_CATALOG_SHA256`, and commits. `deploy.yml` runs on every push to
`main`, builds, and deploys. Neither job can do the other's job.

- **Cost:** one repository, ~40 lines of YAML, one afternoon.
- **Gain:** no secret on any laptop; a leaked Cloudflare token cannot read the
  sheet and a leaked sheet token cannot publish a site; every catalog change is a
  commit with an author (`github-actions[bot]`) and a diff.
- **Limit:** both jobs still see the same checkout. Fine — the secret separation
  is what matters, and the repo stays private.

### B. Two private repositories, artifact passed as a release asset

`tipind-pipeline` holds the builder and the sheet credential. On a schedule it
builds and publishes a GitHub Release with `catalog.<hash>.dat` and
`manifest.json` (`{ sha256, bytes, rowCount, builtAt }`), then fires a
`repository_dispatch` at `tipind-site`. The site's workflow downloads the
release asset, **verifies the SHA-256 against the manifest**, commits it and
deploys.

- **Cost:** a second repo, a fine-grained PAT or GitHub App that can read releases
  across repos, and a `repository_dispatch` hop. Two things to monitor instead of
  one. Install the workflow files with an account that has the `workflow` scope.
- **Gain:** the strongest separation. The deploy repo never holds the sheet
  credential at all.
- **When it is worth it:** a second person (or a contractor) maintains the
  pipeline, or you want the pipeline repo to be public or shared.

### C. Artifact outside git: R2/KV + a manifest the site reads at runtime

The pipeline uploads `catalog.<hash>.dat` to R2 (custom domain) and rewrites
`catalog.json` (`{ url, sha256, builtAt }`). The site fetches the manifest,
verifies the digest against `NEXT_PUBLIC_CATALOG_SHA256` (or the manifest's own
signature), then fetches the data. **Price updates no longer need a deploy.**

- **Cost:** a second origin, CORS, `connect-src` in the CSP, a bucket to secure,
  and a new failure mode (manifest cached, artifact missing).
- **Gain:** update in seconds; no commit per price change; the repo stops growing.
- **When it is worth it:** you refresh prices daily, or the artifact grows past a
  few megabytes. Not yet: at 204 KB and a handful of updates a week, a commit is
  cheaper than a bucket.

### Comparison

|       | Repos      | Secrets              | Update latency | Failure modes              | Effort      |
| ----- | ---------- | -------------------- | -------------- | -------------------------- | ----------- |
| **A** | 1          | 2, separated by job  | ~3 min (CI)    | CI only                    | Low         |
| **B** | 2          | 2 + cross-repo token | ~5 min         | CI, dispatch, token scope  | Medium      |
| **C** | 1 + bucket | 3                    | seconds        | CI, bucket, manifest cache | Medium-high |

## Decision

Take **A now**, structure the tree so **B** is a folder move, and keep **C** for
the day the catalog updates more than once a day.

Concretely:

1. **Delete the push half of `deploy.ps1`.** `npm run catalog:build` stays as a
   local convenience, but the script must not `git add -A`, commit or push.
   Anything that publishes runs in CI.
2. **Move the builder to `tools/catalog/`** with the rest of the sheet logic.
   Give it its own `package.json` (or at least a documented dependency list) so
   its packages never enter the site bundle and can be audited separately.
3. **Add `catalog.yml`**: `workflow_dispatch` + a weekly `schedule`. It uses
   `GOOGLE_SERVICE_ACCOUNT_JSON` (preferred) or `CATALOG_SHEET_TOKEN`, runs the
   builder with `--write-env`, and commits the artifact and env change to a
   `catalog` branch that auto-merges into `main` (so branch protection still
   applies to humans).
4. **Add `deploy.yml`**: on push to `main`, `npm ci`, `npm run lint`,
   `npm run typecheck`, `npm run build`, `wrangler deploy` with
   `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` scoped to this Worker only.
5. **Make the sheet readable only by a service account.** This removes the public
   Apps Script endpoint entirely (F-01) — there is then no URL to leak. If Apps
   Script has to stay for a while, require a `?token=` that only exists as a
   GitHub secret, and rotate the deployment.
6. **Protect `main`**: require a PR and a passing check; allow the bot to push
   only to `catalog`, never directly to `main`.

### How an update flows after A

```
edit the sheet
  → catalog.yml (schedule or "Run workflow")
      → service account reads the sheet
      → tools/catalog/build-catalog.mjs --write-env
      → commit public/data/catalog.<hash>.dat + .env.production on branch catalog
      → PR auto-opened, check passes, merged
  → deploy.yml
      → npm ci, lint, typecheck, build
      → wrangler deploy ./out
  → buyers get the new file on their next visit (immutable, content-addressed)
```

Nothing is typed on a laptop, and the two credentials never meet.

### Workflow sketch (install with an account that has the `workflow` scope)

```yaml
# .github/workflows/catalog.yml
name: Catalog refresh
on:
  workflow_dispatch:
  schedule: [{ cron: "0 4 * * 1" }]
permissions:
  contents: write
  pull-requests: write
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-node@<sha>
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: node tools/catalog/build-catalog.mjs --write-env
        env:
          GOOGLE_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
      - run: |
          git switch -c catalog
          git add public/data .env.production
          git -c user.name=github-actions -c user.email=actions@github.com \
              commit -m "data: refresh the catalog"
          git push -u origin catalog --force
      - run: gh pr create --base main --head catalog --title "Catalog refresh" --body "Automated" || true
        env: { GH_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
```

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: { push: { branches: [main] } }
permissions: { contents: read }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-node@<sha>
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm run build
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Pin every action to a commit SHA (a tag is mutable — this is the supply-chain
path into the deploy token).

### Sheet access without a public endpoint (the F-01 fix)

Two ways, in order of preference:

1. **Google Sheets API + service account.** Create a service account, share the
   sheet with its `client_email` as Viewer, put the JSON key in
   `GOOGLE_SERVICE_ACCOUNT_JSON`. The builder reads
   `spreadsheets.values.get`. No web app, no URL, nothing to leak.
2. **Apps Script with a shared token.** Keep the deployment, but the script
   compares `e.parameter.token` to a value in `PropertiesService`; the token is a
   GitHub secret and never appears in git. Rotate both the deployment and the
   token after the current one is retired.

Either way: set the sheet's sharing to named people, not "anyone with the link".

## Consequences

- The public repository can stay public without exposing the sheet, if you keep
  it public for some other reason; making it private is still the better default.
- `deploy.ps1` disappears or becomes a thin wrapper around `npm run build`
  (a local preview), never a publisher.
- A price update is a commit; the diff is reviewable and the artifact hash in the
  filename changes, so caching stays correct.
- One more thing to watch: a failing scheduled job means stale prices, not an
  outage. Add a notification (GitHub failure email is on by default) and a
  staleness check in the site later if it matters.
- The site build no longer needs any sheet access, so `npm run build` works from
  a clean clone with the committed artifact — the current behaviour, preserved.

## Alternatives rejected

- **Fetch the sheet/Apps Script at runtime** — leaks the endpoint to every
  visitor, couples availability to Google, breaks offline and the immutable
  cache, and moves validation into the browser.
- **Keep `deploy.ps1` and just make the repository private** — hides the symptom,
  leaves a long-lived Cloudflare token on a laptop and a script that stages the
  whole tree.
- **Give CI the Apps Script URL only** — better than today, but the endpoint is
  still anonymous and still a quota target. A service account removes the
  resource instead of guarding it.
- **Two repos where the site repo also builds the catalog** — duplicates the
  builder and the secret; the worst of both.
