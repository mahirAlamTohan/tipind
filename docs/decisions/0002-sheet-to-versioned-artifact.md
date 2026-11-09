# 0002 — Google Sheet → versioned masked artifact

Date: 2026-11-09
Status: Accepted

## Context

Prices live in a Google Sheet the team edits directly. The browser needs the
whole catalog (~8,500 rows) to search and filter locally. Options were: query the
sheet at runtime, expose a JSON API, or pre-build a file.

## Decision

At release time, `scripts/build-catalog.mjs` downloads the sheet through an Apps
Script web app and writes a **single versioned binary**:
`MAGIC + XOR(gzip(JSON))` → `public/data/catalog.<hash>.dat`. The browser fetches
it once, unmasks, gunzips and validates it.

## Consequences

- ~200 KB for 8,500 products, served from one immutable, forever-cacheable URL.
- No runtime dependency on Google, no CORS problems, no quota exposure, no API
  key in the client.
- Prices are as fresh as the last deploy. The team confirms the final amount in
  conversation, so a slightly stale catalog is not a correctness problem.
- The filename is content-addressed, so a deploy can never mix an old HTML
  bundle with a new data file — stale bundles 404 loudly instead of showing
  wrong prices.
- XOR is obfuscation, not secrecy. The file is trivially decodable and is treated
  as public.
- A schema change means bumping the format version in three places (script,
  constants, loader).

## Alternatives considered

- **Fetch the sheet/Apps Script at page load** — slow, rate-limited, leaks the
  endpoint, breaks offline, and couples page availability to Google.
- **Plain JSON in `public/`** — roughly 3× larger and gives away the tuple
  structure for free; no caching benefit over the masked file.
- **A CMS / hosted database** — a second place to edit products, plus a runtime
  dependency, for a dataset that is already a spreadsheet.
