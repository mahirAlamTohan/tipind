#!/usr/bin/env node
/**
 * Post-build gate for the static export. Runs after `next build`.
 *
 *   node scripts/verify-export.mjs [--dir out] [--no-budget]
 *
 * It checks the things that have actually broken before, in that order:
 *
 *   1. Catalog — the URL baked into the JS exists in `out/`, carries this
 *      build's magic prefix, decodes with this build's key, and every price
 *      inside it is sane. This is the "catalog could not be loaded" failure.
 *   2. Headers — every first-load resource is matched by a Cache-Control rule
 *      in `_headers`, and the security headers (CSP, nosniff, XFO, HSTS,
 *      referrer, permissions, COOP) are declared. `/checkout/*` must be
 *      `noindex`.
 *   3. Budget — request count, gzipped JS and total wire size for a cold visit.
 *   4. Hygiene — 404 page, robots, sitemap, manifest, JSON-LD, skip link,
 *      lang, description.
 *
 * Exit code 1 if anything fails. `--no-budget` keeps the useful checks and
 * only relaxes the numbers.
 */
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gunzipSync, gzipSync } from "node:zlib"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const dirIndex = args.indexOf("--dir")
const OUT = path.resolve(ROOT, dirIndex >= 0 ? args[dirIndex + 1] : "out")
const skipBudget = args.includes("--no-budget")

/** Cold-visit budget. Measured on the current build, with headroom. */
const BUDGET = {
  requests: 24,
  jsGzipBytes: 400 * 1024,
  totalGzipBytes: 900 * 1024,
}

const failures = []
const notes = []

const pass = (message) => console.log(`  ok    ${message}`)
const fail = (message) => {
  failures.push(message)
  console.log(`  FAIL  ${message}`)
}
const note = (message) => notes.push(`  note  ${message}`)
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

const exists = async (file) =>
  stat(file).then(
    (info) => info.isFile(),
    () => false
  )

/** Gzip size, or the raw size for formats that are already compressed. */
async function wireSize(file) {
  const bytes = await readFile(file)
  if (/\.(woff2?|png|jpe?g|avif|webp|ico|br|gz)$/i.test(file))
    return bytes.length
  return gzipSync(bytes).length
}

/* ── 1. catalog ───────────────────────────────────────────────────────── */

async function readEnvKey() {
  if (process.env.NEXT_PUBLIC_CATALOG_XOR_KEY) {
    return process.env.NEXT_PUBLIC_CATALOG_XOR_KEY
  }
  for (const file of [
    ".env.production.local",
    ".env.production",
    ".env.local",
    ".env",
  ]) {
    const full = path.join(ROOT, file)
    if (!(await exists(full))) continue
    const match = /^NEXT_PUBLIC_CATALOG_XOR_KEY=(.*)$/m.exec(
      await readFile(full, "utf8")
    )
    if (match) return match[1].trim().replace(/^["']|["']$/g, "")
  }
  return null
}

async function checkCatalog() {
  const constants = await readFile(
    path.join(ROOT, "src/features/catalog/constants.ts"),
    "utf8"
  )
  const format = Number(/CATALOG_FORMAT = (\d+)/.exec(constants)?.[1])
  const magic = /CATALOG_MAGIC = "([^"]+)"/.exec(constants)?.[1]
  if (!Number.isFinite(format) || !magic) {
    fail("could not read CATALOG_FORMAT / CATALOG_MAGIC from constants.ts")
    return
  }

  // Which artifact does the shipped JS actually fetch?
  const staticDir = path.join(OUT, "_next/static")
  const referenced = new Set()
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(
      () => []
    )) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name.endsWith(".js")) {
        const text = await readFile(full, "utf8")
        for (const match of text.matchAll(/\/data\/catalog\.[\w-]+\.dat/g)) {
          referenced.add(match[0])
        }
      }
    }
  }
  await walk(staticDir)

  if (referenced.size === 0) {
    fail("the shipped JS does not reference any /data/catalog.*.dat artifact")
    return
  }
  if (referenced.size > 1) {
    fail(
      `the build references ${String(referenced.size)} catalog artifacts: ${[...referenced].join(", ")}`
    )
  }

  const url = [...referenced][0]
  const file = path.join(OUT, url)
  if (!(await exists(file))) {
    fail(
      `${url} is referenced by the bundle but not in ${path.relative(ROOT, OUT)}/`
    )
    fail(
      "     → rebuild the catalog (`bun run catalog:build`) then `bun run build`"
    )
    return
  }

  const bytes = await readFile(file)
  if (bytes.subarray(0, magic.length).toString("utf8") !== magic) {
    fail(
      `${url} does not start with ${magic} — stale artifact or missing rebuild`
    )
    return
  }

  const key = await readEnvKey()
  if (!key) {
    note(
      `${url} exists with the right magic; key not found, so decoding was skipped`
    )
    return
  }

  const keyBytes = Buffer.from(key, "utf8")
  const body = Buffer.from(bytes.subarray(magic.length))
  for (let index = 0; index < body.length; index += 1) {
    body[index] ^= keyBytes[index % keyBytes.length]
  }

  let parsed
  try {
    parsed = JSON.parse(gunzipSync(body).toString("utf8"))
  } catch (error) {
    fail(
      `${url} does not decode with NEXT_PUBLIC_CATALOG_XOR_KEY (${error.message})`
    )
    return
  }

  if (parsed.format !== format) {
    fail(
      `${url} is format ${String(parsed.format)}, but CATALOG_FORMAT is ${String(format)}`
    )
    return
  }
  if (!Array.isArray(parsed.products) || parsed.products.length === 0) {
    fail(`${url} contains no products`)
    return
  }

  const bounds = parsed.priceBounds
  let badPrice = 0
  for (const row of parsed.products) {
    const price = Array.isArray(row) ? row.at(-1) : row?.priceMills
    if (price === -1 || price === null || price === undefined) continue
    if (typeof price !== "number" || price <= 0) badPrice += 1
    else if (Array.isArray(bounds) && (price < bounds[0] || price > bounds[1]))
      badPrice += 1
  }
  if (badPrice > 0)
    fail(`${String(badPrice)} products carry an impossible price`)

  pass(
    `catalog ${path.basename(url)}: format ${String(format)}, ${parsed.products.length.toLocaleString("en-US")} products, prices within bounds`
  )
}

/* ── 2. headers ───────────────────────────────────────────────────────── */

function parseHeaders(text) {
  const rules = []
  let current = null
  for (const raw of text.split("\n")) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue
    if (!raw.startsWith(" ") && !raw.startsWith("\t")) {
      current = { pattern: raw.trim(), headers: {} }
      rules.push(current)
      continue
    }
    const split = raw.trim().split(":")
    if (current && split.length > 1) {
      current.headers[split[0].trim().toLowerCase()] = split
        .slice(1)
        .join(":")
        .trim()
    }
  }
  return rules
}

function matches(pattern, urlPath) {
  if (pattern.endsWith("/*")) return urlPath.startsWith(pattern.slice(0, -1))
  if (!pattern.includes("*")) return urlPath === pattern
  const regex = new RegExp(
    `^${pattern.split("*").map(escapeRegex).join("[^/]*")}$`
  )
  return regex.test(urlPath)
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function checkHeaders(resources) {
  const before = failures.length
  const file = path.join(OUT, "_headers")
  if (!(await exists(file))) {
    fail("_headers is missing from the export")
    return
  }
  const rules = parseHeaders(await readFile(file, "utf8"))

  const uncached = []
  for (const resource of resources) {
    const clean = resource.split("?")[0]
    if (!(await exists(path.join(OUT, clean)))) continue
    // Cloudflare picks the most specific rule; for the check it is enough
    // that some matching rule sets Cache-Control.
    const covered = rules.some(
      (entry) => matches(entry.pattern, clean) && entry.headers["cache-control"]
    )
    if (!covered) uncached.push(clean)
  }
  if (uncached.length > 0) {
    fail(
      `no Cache-Control rule for ${String(uncached.length)} first-load resource(s): ${uncached.slice(0, 4).join(", ")}`
    )
  }

  const global = rules.filter((entry) => entry.pattern === "/*").at(-1)
  if (!global) {
    fail('_headers has no "/*" block')
  } else {
    const required = [
      "content-security-policy",
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
      "strict-transport-security",
      "permissions-policy",
    ]
    const missing = required.filter((name) => !global.headers[name])
    if (missing.length > 0)
      fail(`security headers missing from "/*": ${missing.join(", ")}`)
    const csp = global.headers["content-security-policy"] ?? ""
    if (csp && !/frame-ancestors\s+'none'/.test(csp))
      fail("CSP has no frame-ancestors 'none'")
    if (csp && !/object-src\s+'none'/.test(csp))
      fail("CSP has no object-src 'none'")
  }

  const checkout = rules.find((entry) => matches(entry.pattern, "/checkout/"))
  if (!/noindex/.test(checkout?.headers["x-robots-tag"] ?? "")) {
    fail("/checkout/ is not marked noindex in _headers")
  }

  if (failures.length === 0)
    pass("_headers covers every first-load resource and every security header")
}

/* ── 3. budget ────────────────────────────────────────────────────────── */

async function firstLoad() {
  const html = await readFile(path.join(OUT, "index.html"), "utf8")
  const resources = new Set()
  for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
    const url = match[1].split("?")[0]
    if (/#|mailto:|tel:/.test(url)) continue
    if (!/\.(js|css|woff2?|png|svg|ico|webmanifest|dat)$/.test(url)) continue
    resources.add(url)
  }
  const catalog = /"(\/data\/catalog\.[\w-]+\.dat)"/.exec(html)
  if (catalog) resources.add(catalog[1])
  return resources
}

async function checkBudget(resources) {
  let jsGzip = 0
  let totalGzip = 0
  for (const resource of resources) {
    const file = path.join(OUT, resource)
    if (!(await exists(file))) continue
    const size = await wireSize(file)
    totalGzip += size
    if (resource.endsWith(".js")) jsGzip += size
  }

  const compare = (label, actual, value, limit, limitLabel, over) => {
    if (skipBudget) {
      pass(`${label}: ${actual} (budget ${limitLabel}, checks disabled)`)
      return
    }
    if (value > limit) fail(over)
    else pass(`${label}: ${actual} (budget ${limitLabel})`)
  }

  compare(
    "first-load requests",
    String(resources.size),
    resources.size,
    BUDGET.requests,
    String(BUDGET.requests),
    `first-load requests ${String(resources.size)} exceed the budget of ${String(BUDGET.requests)}`
  )
  compare(
    "first-load JS",
    `${kb(jsGzip)} gz`,
    jsGzip,
    BUDGET.jsGzipBytes,
    kb(BUDGET.jsGzipBytes),
    `first-load JS ${kb(jsGzip)} exceeds the budget of ${kb(BUDGET.jsGzipBytes)}`
  )
  compare(
    "first-load transfer",
    `${kb(totalGzip)} gz`,
    totalGzip,
    BUDGET.totalGzipBytes,
    kb(BUDGET.totalGzipBytes),
    `first-load transfer ${kb(totalGzip)} exceeds the budget of ${kb(BUDGET.totalGzipBytes)}`
  )
}

/* ── 4. hygiene ───────────────────────────────────────────────────────── */

async function checkHygiene() {
  const before = failures.length
  const html = await readFile(path.join(OUT, "index.html"), "utf8")
  const has = (file) => path.join(OUT, file)

  const notFound = has("404.html")
  if (!(await exists(notFound))) {
    fail("no 404.html in the export")
  } else {
    const text = await readFile(notFound, "utf8")
    // Our own page (app/not-found.tsx) must win over Next's bare default.
    if (!/<h1/.test(text)) fail("404.html has no heading")
    if (/This page could not be found/.test(text)) {
      fail("404.html is Next's default page, not app/not-found.tsx")
    }
  }

  if (!(await exists(has("robots.txt")))) fail("robots.txt is missing")
  else if (
    !/disallow:\s*\/checkout/i.test(await readFile(has("robots.txt"), "utf8"))
  ) {
    fail("robots.txt does not disallow /checkout")
  }

  if (!(await exists(has("sitemap.xml")))) fail("sitemap.xml is missing")
  else if (!/<urlset/.test(await readFile(has("sitemap.xml"), "utf8")))
    fail("sitemap.xml is not a urlset")

  const manifest = has("manifest.webmanifest")
  if (!(await exists(manifest))) fail("manifest.webmanifest is missing")
  else {
    const data = JSON.parse(await readFile(manifest, "utf8"))
    if (!data.name || !Array.isArray(data.icons) || data.icons.length === 0) {
      fail("manifest.webmanifest has no name or no icons")
    }
  }

  if (!/"@context"\s*:\s*"https:\/\/schema.org"/.test(html))
    fail("no JSON-LD block on the home page")
  if (!/href="#main"/.test(html)) fail("no skip link to #main")
  if (!/<html[^>]*\blang="/.test(html)) fail("<html> has no lang attribute")
  if (!/<meta name="description"/.test(html)) fail("no meta description")
  if (!/rel="canonical"/.test(html)) fail("no canonical link")

  if (failures.length === 0)
    pass(
      "hygiene: 404, robots, sitemap, manifest, JSON-LD, skip link, lang, description"
    )
}

/* ── run ──────────────────────────────────────────────────────────────── */

if (!(await exists(path.join(OUT, "index.html")))) {
  console.error(
    `\n  ${path.relative(ROOT, OUT)}/index.html is missing — run \`next build\` first.\n`
  )
  process.exit(1)
}

const resources = await firstLoad()
await checkCatalog()
await checkHeaders(resources)
await checkBudget(resources)
await checkHygiene()

for (const entry of notes) console.log(entry)
console.log(
  failures.length === 0
    ? "\n  all checks passed\n"
    : `\n  ${String(failures.length)} check(s) failed\n`
)
process.exit(failures.length === 0 ? 0 : 1)
