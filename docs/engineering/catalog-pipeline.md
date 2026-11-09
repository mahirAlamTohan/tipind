# Catalog pipeline

The catalog is the product. This document covers where it comes from, how it is
compressed, and how the browser turns it back into searchable rows.

## Source of truth

A Google Sheet tab named **“Price List”**, maintained by the team. Relevant
columns (header names are matched through alias lists, case- and
punctuation-insensitive):

| Logical field      | Example header           | Required                                       |
| ------------------ | ------------------------ | ---------------------------------------------- |
| Product name       | `Product Name`           | yes (a row without one is skipped)             |
| Active ingredient  | `Active Ingredient`      | no                                             |
| Manufacturer       | `Manufacturer`           | no                                             |
| Packaging          | `Packaging`, `Pack Size` | no                                             |
| Type / dosage form | `Type`, `Dosage Form`    | no                                             |
| Rate in USD        | `Rate (USD)`, `Price`    | no (row still publishes, but can't be ordered) |
| Status             | `Status`                 | no — `needs review` is held back               |

Prices are parsed as **mills**: `1/1000 USD`. `$2.831` → `2831`. Anything finer
than three decimals is rounded half-up (and counted in the build report). Values
above $100,000 are treated as invalid.

### Apps Script contract

The sheet is exposed through a small Google Apps Script web app, deployed with
access “Anyone”. The build script expects three query modes:

| Request                                    | Response                                                         |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `?info=1&sheet=Price List`                 | `{ ok: true, sheet, lastRow, lastColumn }`                       |
| `?range=A1:F2000&sheet=Price List&table=1` | `{ ok: true, data: [[cell, …], …] }` (true if the range exists)  |
| anything else                              | `{ ok: true, data: [...] }` as a plain array of objects (legacy) |

`lastRow`/`lastColumn` matter: the script downloads exactly the used range in
2,000-row chunks instead of guessing, and refuses to publish a chunk whose row
count does not match the request (protects against silent truncation).

The web app URL lives in `CATALOG_SHEET_URL` (in `.env.production` for this
repo). It is build-time only and never reaches the browser bundle.

## Build step

```bash
npm run catalog:build
# = node scripts/build-catalog.mjs --clean --write-env
```

What the script does:

1. Loads `.env` then `.env.production` (existing env wins) and requires
   `NEXT_PUBLIC_CATALOG_XOR_KEY`.
2. Reads the sheet:
   - asks `?info=1` for the real range,
   - downloads chunks with retries (3 attempts, 90 s timeout each),
   - re-reads the row count afterwards and retries the whole download (up to 3
     passes) if the sheet changed mid-flight.
3. Normalises rows: NFC text, collapse whitespace, strip a BOM, drop blank rows
   and rows without a product name, drop `needs review`, drop duplicates
   (identity = name + ingredient + manufacturer + packaging + mills).
4. Sorts products by name then manufacturer (locale-aware, base sensitivity).
5. Builds three dictionaries — manufacturers, packaging, types — keyed
   accent/punctuation-insensitively, sorted, first spelling wins.
6. Encodes the artifact as `JSON → gzip(level 9) → XOR with the key → magic`.
7. Writes `public/data/catalog.<sha256[:8]>.dat`, where the hash is of the final
   payload. Same sheet + same key ⇒ same filename (idempotent deploy).
8. Writes a raw snapshot to `extras/source.<same-hash>.json` (gitignored) so a
   published artifact can be traced back to its exact source rows.
9. With `--clean`, deletes older `catalog.*.dat` (and matching source snapshots).
10. With `--write-env`, points `NEXT_PUBLIC_CATALOG_DATA_URL` in
    `.env.production` at the new file.
11. Prints a report: source rows, published products, invalid/duplicate/needs-review
    counts, rows without a usable price, rounded prices, dictionary sizes, range.

Expected report shape for the current sheet (8,522 published rows):

```
Wrote catalog.<hash>.dat (~204,000 bytes)
Products: 8,522 of ~8,5xx rows
Skipped: n invalid, n duplicates, n needs review
Without a usable price: n (shown, but can't be added to a checkout)
```

## Artifact format (version 4)

```
bytes 0..7    "TIPCAT4:"                    ASCII magic
bytes 8..end  XOR(gzip(JSON payload))       key = NEXT_PUBLIC_CATALOG_XOR_KEY (utf8, repeating)
```

Payload:

```jsonc
{
  "format": 4,
  "priceBounds": [9, 1557300], // mills, [min, max], max > min
  "manufacturers": ["...", "..."], // sorted dictionary
  "packaging": ["1x10", "..."],
  "types": ["tablet", "..."],
  "products": [
    // [name, ingredient, manufacturerIdx, packagingIdx, typeIdx, priceMills]
    ["2 B12 TAB", "Methylcobalamin", 43, 12, 8, 665],
  ],
}
```

- Tuple positions are fixed and validated (`row.length === 6`).
- `-1` is the sentinel for “no value” in any index and for “no price”.
- Unknown indexes are corruption, not silently ignored.
- Prices are whole mills, so totals stay in safe-integer range
  (max quantity 9,999 × max price $100,000 is far below `MAX_SAFE_INTEGER`).
- The XOR key is obfuscation only. Anyone can decode the file; never put
  anything private in it.

### Changing the format

Format changes are coordinated in three places:

1. `scripts/build-catalog.mjs`: `FORMAT` and `MAGIC` (`TIPCAT<version>:`),
2. `src/features/catalog/constants.ts`: the same `CATALOG_FORMAT`/`CATALOG_MAGIC`,
3. `src/features/catalog/lib/load-catalog.ts`: the row reader and validation.

Bump the version when the tuple or the payload changes. Old artifacts then fail
with an explicit “unsupported format version” message instead of rendering
garbage. Never leave two different formats behind the same URL.

## Browser side

`fetchCatalog(url)` in `src/features/catalog/lib/load-catalog.ts`:

1. `fetch(url, { cache: "force-cache", credentials: "omit" })`, aborted on
   unmount. A network failure produces “could not be downloaded”; a non-2xx
   produces the status code.
2. Verify the magic prefix.
3. XOR with the public key (refuses to run if the key is missing).
4. Decompress with `DecompressionStream("gzip")` — a browser without it gets a
   clear “please update” error.
5. `JSON.parse` and `parseCatalog`: format check, dictionaries, bounds, then one
   pass over 8,522 tuples building `CatalogProduct[]` with dictionary lookups.

The dataset is cached in the `catalog` store for the session; a second mount of
the explorer reuses it instead of re-downloading.

## Why not a JSON API?

- **No server** to host it, authenticate, rate-limit or pay for.
- A **single immutable file** can be cached forever at the edge and in the
  browser; an API would need revalidation.
- The **dictionary + tuple** encoding is roughly a third of the size of the
  equivalent objects-with-keys JSON, which matters on mobile in emerging
  markets.
- The trade-off is that “prices are stale until the next deploy”. That matches
  how the business actually works (packet prices change rarely, and the team
  confirms the final amount anyway).

## Failure playbook

| Symptom                                                       | Likely cause                                            | Fix                                         |
| ------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| “unsupported format version”                                  | Stale `catalog.*.dat` or mismatched build               | Re-run `npm run catalog:build -- --clean`   |
| “could not be decoded… XOR key may not match”                 | Key changed after the file was built                    | Rebuild with the current key                |
| “request failed (status 404)”                                 | `NEXT_PUBLIC_CATALOG_DATA_URL` points at a deleted file | Check `public/data` and `.env.production`   |
| “No records are displayed” with a redirect/CORS console error | Wrong URL host or missing CORS header                   | Use a same-origin `/data/...` path          |
| Empty facets                                                  | Build filtered everything out (all `needs review`)      | Check the build report                      |
| Prices off by 1000×                                           | Source column is in cents, not dollars                  | Fix the sheet or add an explicit conversion |
