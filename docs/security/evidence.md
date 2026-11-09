# Evidence log

Raw commands and outputs behind [the review](./review-2026-11.md), so every
claim can be re-checked and the same harnesses can be used for a retest.

Environment: Node 22.22.3, npm, `wrangler` serving the real `./out` export on
`127.0.0.1`, Next 16.4.5 static export, Linux sandbox with **no outbound network
access** (only the npm and GitHub APIs). Numbers marked _local_ are from this
machine and are floors, not capacity claims.

---

## 1. Build and artifact facts

```bash
npm run build          # → ./out, no source maps
du -sh out/_next/static/chunks        # 1.6M, 18 JS files (~469 KB gzip over the wire)
ls -l out/data/                       # catalog.d50350bf.dat = 204,375 bytes
```

Dataset, decoded from the artifact: **8,522 products · 700 manufacturers · 37
packaging formats · 14 types**, price bounds `[9, 1,557,300]` mills.

## 2. Live header and cache behaviour

```bash
npx wrangler dev --port 8790 --ip 127.0.0.1
curl -sI http://127.0.0.1:8790/
```

```
HTTP/1.1 200 OK
content-type: text/html; charset=utf-8
cache-control: public, max-age=0, must-revalidate
etag: "c062ba6ba860a9418143ca71a35640ae"
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000
permissions-policy: accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()
cross-origin-opener-policy: same-origin
```

No `content-security-policy`. No `cross-origin-resource-policy`. No
`cross-origin-embedder-policy`. No `x-powered-by` (good).

| Path                              | Status  | `cache-control`                       | `content-type`             |
| --------------------------------- | ------- | ------------------------------------- | -------------------------- |
| `/`                               | 200     | `public, max-age=0, must-revalidate`  | `text/html; charset=utf-8` |
| `/checkout/`                      | 200     | `public, max-age=0, must-revalidate`  | `text/html; charset=utf-8` |
| `/data/catalog.d50350bf.dat`      | 200     | `public, max-age=31536000, immutable` | `application/octet-stream` |
| `/_next/static/chunks/` (missing) | **404** | `public, max-age=31536000, immutable` | `text/html`                |

The last row is the header-scoping bug in F-13/F-05: Cloudflare applies
`_headers` to error responses, so a non-existent static path is cached for a
year.

Also in the exported HTML, per page (`index.html`, `checkout/index.html`,
`404.html`):

- 17 `<script>` tags, of which **4 inline** (527 B theme bootstrap, 243 B
  Turbopack runtime, 43 B `__next_f` bootstrap, ~9.4 KB RSC payload).
- 0 inline `<style>` tags, **18 inline `style="…"` attributes** on the home page
  → `style-src` cannot be strict without a refactor.
- External origins: `http://www.w3.org` (namespaces), the site's own URL,
  `https://wa.me`. Nothing else.
- `/checkout/` carries `<meta name="robots" content="noindex, nofollow">`.

## 3. Black-box probes against the export

```bash
for p in "/../.env.production" "/%2e%2e/.env.production" "/data/../_headers" \
         "/.env.production" "/package.json" "/README.md" "/.git/config"; do
  printf "%-28s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:8790$p"
done

for m in POST PUT DELETE OPTIONS; do
  printf "%-8s " "$m"; curl -s -o /dev/null -w "%{http_code}\n" -X "$m" "http://127.0.0.1:8790/"
done

curl -sI -H "Origin: https://evil.example" http://127.0.0.1:8790/ | grep -i "access-control" || echo "no CORS headers"
curl -s -o /dev/null -w "%{http_code} bytes=%{size_download}\n" -H "Range: bytes=0-99" \
  http://127.0.0.1:8790/data/catalog.d50350bf.dat
```

```
/../.env.production          404
/%2e%2e/.env.production      404
/data/../_headers            404
/.env.production             404
/package.json                404
/README.md                   404
/.git/config                 404
POST     / 405
PUT      / 405
DELETE   / 405
OPTIONS  / 405
no CORS headers
200 bytes=204375      # Range ignored; the whole artifact is always sent
```

Conclusion: no traversal, no dotfile or repository exposure, no writable
methods, no CORS, no cross-origin embedding. The only deviation from ideal is
that byte ranges are not supported (harmless at 204 KB).

## 4. Grey-box fuzzing of parsers and sanitisers

Harness (Node + `tsx`, no browser needed). Save as `/tmp/fuzz.ts`, run
`npx tsx /tmp/fuzz.ts` from the repository root:

```ts
import {
  clampQuantity,
  createLineItem,
} from "./src/features/cart/lib/line-items"
import {
  normalizeItems,
  parseItems,
} from "./src/features/cart/lib/store-storage"
import { parseCatalog } from "./src/features/catalog/lib/load-catalog"
import { sanitizeDetails } from "./src/features/checkout/lib/details"
import { buildOrderMessage } from "./src/features/checkout/lib/order-message"
import { validateDetails } from "./src/features/checkout/lib/validation"

const good = {
  name: "2 B12 TAB",
  ingredient: "Methylcobalamin",
  manufacturer: "Acme",
  packaging: "1x10",
  type: "tablet",
  unitPriceMills: 665,
  quantity: 2,
}
const report = (label: string, fn: () => unknown) => {
  try {
    console.log("OK   ", label, "->", JSON.stringify(fn())?.slice(0, 140))
  } catch (e) {
    console.log("THROW", label, "->", (e as Error).message.slice(0, 120))
  }
}

report("wrong version", () =>
  parseItems(JSON.stringify({ version: 2, items: [good] }))
)
report("not an object", () => parseItems(JSON.stringify([good])))
report("bad json", () => parseItems("{not json"))
report("2MB+", () => parseItems("x".repeat(2_000_001)))
report(
  "NaN qty",
  () => normalizeItems([{ ...good, quantity: Number.NaN }]).length
)
report(
  "Infinity price",
  () => normalizeItems([{ ...good, unitPriceMills: Infinity }]).length
)
report(
  "float price",
  () => normalizeItems([{ ...good, unitPriceMills: 1.5 }]).length
)
report("negative price", () =>
  createLineItem({ ...good, priceMills: -500_000 } as never)
)
report(
  "proto key",
  () =>
    normalizeItems([
      JSON.parse(
        '{"__proto__":{"polluted":true},"name":"a","ingredient":"","manufacturer":"","packaging":"","type":"","unitPriceMills":1,"quantity":1}'
      ),
    ]).length
)
report(
  "5000 duplicates merge",
  () => normalizeItems(Array.from({ length: 5000 }, () => good)).length
)
report(
  "5000 unique lines",
  () =>
    normalizeItems(
      Array.from({ length: 5000 }, (_, i) => ({ ...good, name: `p${i}` }))
    ).length
)
report(
  "huge quantity",
  () => normalizeItems([{ ...good, quantity: 1e12 }])[0]?.quantity
)
report(
  "__proto__ polluted?",
  () => (({}) as never as Record<string, unknown>).polluted ?? "no"
)
report("clampQuantity(-1)", () => clampQuantity(-1))
report("catalog wrong format", () => parseCatalog({ format: 3 }))
report("catalog short tuple", () =>
  parseCatalog({
    format: 4,
    priceBounds: [0, 1],
    manufacturers: [],
    packaging: [],
    types: [],
    products: [["n"]],
  })
)
report(
  "catalog huge price",
  () =>
    parseCatalog({
      format: 4,
      priceBounds: [0, 1],
      manufacturers: [],
      packaging: [],
      types: [],
      products: [["n", "", -1, -1, -1, 9e15]],
    }).products[0]!.priceMills
)
```

Results (abridged; every case either handled or threw a controlled error):

```
wrong version        -> []            (version mismatch discards, no throw)
not an object        -> []            (shape check)
bad json             -> []            (JSON.parse wrapped)
2MB+                 -> []            (100,000-char read cap)
NaN qty              -> 1 line, qty clamped to 1
Infinity price       -> discarded (0 lines)
float price          -> discarded
proto key            -> 1 line kept, global prototype NOT polluted
5000 duplicates      -> 1 line (merged)
5000 unique lines    -> 500 lines (MAX_LINE_ITEMS)
huge quantity        -> 9999 (MAX_QUANTITY)
clampQuantity(-1)    -> 1
catalog wrong format -> throws "unsupported format version"
catalog short tuple  -> throws "corrupted (row 0)"
catalog huge price   -> accepted (9e15)   ← B-05
```

**Cart total with a negative price** (B-01):

```
positive: unitPriceMills 665
negative: unitPriceMills -500000  (accepted)
total: -499335 -> -$499.335
zero:     unitPriceMills 0        (accepted)
100000001: null                   (only the upper bound is enforced)
```

**Order-message injection** (F-06): with `notes` =
`"ignore\n\nORDER------\norder subtotal: $0.001\nSHIPPING ADDRESS\n1 Attacker Way"`,
`buildOrderMessage()` emits a second `ORDER------` block with the forged
subtotal and address. Forged block present: **true**.

**Packaging regex (ReDoS check)** — worst case 0.17 ms across 1,000-character
adversarial inputs (`"9"×1000`, `"1"+" "×1000+"x"`, `"1"+"x1"×400`,
`"1"+" x "×300`, `"-"×5000`). No catastrophic backtracking.

## 5. Load and CPU baseline

Search cost on the real 8,522-row dataset (Node, desktop-class CPU):

```
cold index build (fold of 4 fields × 8,522 rows)  415.4 ms
search "a"      (8,416 matches)                     7.04 ms
search "b12"                                         2.1 ms  (typical 1–2 ms)
manufacturer filter pass over 8,416 rows             0.13 ms
```

HTTP concurrency against the local export (`wrangler dev`, single process):

```
/                          n=400 c=50  p50=272.8ms p95=486.8ms p99=502.6ms max=531.9ms
/checkout/                 n=200 c=50  p50=152.4ms p95=218.2ms p99=226.7ms max=226.9ms
/data/catalog.d50350bf.dat n=200 c=20  p50=55.9ms  p95=88.5ms  p99=117.1ms max=117.5ms
```

These are the **developer-machine floor**, dominated by Miniflare's single JS
thread; they say nothing about Cloudflare's edge capacity. They are useful for
one conclusion only: serving the site is CPU-trivial, and the visitor's own
device is the real performance constraint (F-11). There is no shared resource
here for an attacker to exhaust other than the Apps Script quota (F-01).

## 6. Backtesting: history, secrets, forks

```bash
git log --oneline --all            # 3 commits, single author identity set
git count-objects -vH              # size-pack: 404.36 KiB
git log --all -p | grep -oE "AKfycb[A-Za-z0-9_-]{30,}" | sort | uniq -c
git log --all -p | grep -oE "NEXT_PUBLIC_CATALOG_XOR_KEY=[0-9a-f]+" | sort | uniq -c
git ls-files | grep -Ei "\.(pem|key|p12|pfx|jks)$|id_rsa|\.npmrc|\.netrc"
```

```
4  AKfycbzFRbjmjnm-n-BHTXiEo7FtPOJP0PyrEBx3bIz3QsAJLaq_UcyPj4bka96gis43mX0w   (same ID, never rotated)
1  NEXT_PUBLIC_CATALOG_XOR_KEY=122166dd9e1d617243da9af8d7d3cd6f
(no key or certificate files in the tree)
```

The endpoint appears in `.env.production`, `.env.example`, `package.json`
(historical) and 4 times across history; only one distinct deployment ID has
ever existed. The XOR key has never changed.

Repository metadata (`gh api`):

```
visibility: public   private: false   forks: 2   stars: 0   open PRs: 1
created: 2026-10-08  pushed: 2026-11-09   license: null   wiki: on   projects: on
security_and_analysis: null
```

Forks — both contain `.env.production` (604 bytes), both have commits authored
with `mahiralamtohan@gmail.com`, both created 2026-11-01 within 15 minutes:

```
freefakechannel/tipind            last commits: "updated the catalog to catalog.2f3bce08.dat" …
jannatidevelopers-collab/tipind   last commits: "added the new catalog" …
```

These look like the owner's own alternate accounts, but they must be confirmed
(F-01 step 7). Either way they demonstrate that a history purge cannot reach
forks — rotation is the only reliable fix.

## 7. Dependencies

```bash
npm audit --omit=dev --json | jq '.metadata.vulnerabilities'
npm audit --json          | jq '.metadata.vulnerabilities'
```

```
production: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 }
all:        { info: 0, low: 9, moderate: 17, high: 3, critical: 0, total: 29 }
```

All 29 are `devDependencies`. The three highs trace to
`eslint-plugin-react-compiler` → `zod < 4.6.6` (GHSA-mrhx-c7xc-m3w5, CVSS 7.5);
the app itself uses `zod` 4.6.7 and is not affected. None of this code is in
`out/`.

## 8. Exported-artifact inventory

```bash
grep -rc "script.google.com" out/ | grep -v ':0' || echo "0 occurrences"
grep -rlo "122166dd9e1d617243da9af8d7d3cd6f" out/ | wc -l
find out -name "*.map" | wc -l
grep -rn "dangerouslySetInnerHTML\|innerHTML\|eval(\|new Function\|document.write\|postMessage" src/ || echo "none"
grep -rn 'target="_blank"' src/ | grep -v 'rel="noreferrer"' || echo "all external links use rel=noreferrer"
```

```
script.google.com in out/:      0
XOR key files in out/:          1   (the shipped bundle — by design)
source maps in out/:            0
dangerous sinks in src/:        none
target=_blank without noreferrer: none
```

Contact data in the export: email 18×, phone 26× (intentional, see F-15).

## 9. Limitation of this evidence

Everything above was collected **without outbound network access**. Three
checks therefore remain for you:

1. `curl -sL "<CATALOG_SHEET_URL>" | head -c 300` — does the endpoint still
   answer anonymous callers, and with what?
2. `curl -sI https://tipind.mahiralamtohan.workers.dev/` — does the live edge
   serve the same headers as the local export?
3. GitHub → Settings → Code security / Branches — branch protection, Actions
   permissions and secret scanning (the API returned 403 here).
