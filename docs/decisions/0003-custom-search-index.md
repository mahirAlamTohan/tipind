# 0003 — Purpose-built search index instead of a library

Date: 2026-11-09
Status: Accepted

## Context

Search has to work over product name, active ingredient, manufacturer and
packaging. Users type fragments ("amox", "as life" for "A. S Lifesciences"),
sometimes with accents or punctuation differences, and expect the matched letters
to be highlighted. The dataset is ~8,500 rows and is already in memory.

## Decision

Implement a small in-memory scorer in `features/catalog/lib/search.ts`:
fold each field once (lowercase, strip diacritics, keep a position map), score
each query term by match quality (whole word 3, word start 2, inside 1) times a
column weight (name 4, ingredient 3, manufacturer 2, pack 1), require every term
to match, and fall back to a space-stripped comparison for multi-word queries.

## Consequences

- Ranking matches the business' intuition: the product name outranks the pack
  size, exact words outrank fragments.
- Highlighting is exact, including accents, because folded positions map back to
  the original string.
- No extra dependency, no index serialisation, no worker: the index builds lazily
  per dataset and is cached in a `WeakMap`.
- We own the complexity (~200 lines) and must test it ourselves; there is no
  fuzzy typo tolerance (edit distance) — only spacing/punctuation tolerance.
- The library `minisearch` was evaluated and later removed: it was installed but
  never imported.

## Alternatives considered

- **MiniSearch/FlexSearch** — good libraries, but ranking is generic, the
  highlight mapping is awkward for accented text, and the bundle cost is real
  when the dataset is already local.
- **Server-side search** — impossible without a server, and slower than memory.
- **`String.includes` only** — no ranking, no word awareness, poor results once
  ingredient names share substrings.
