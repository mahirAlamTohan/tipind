#!/usr/bin/env node
/**
 * Post-build gate for the static export. Run after `next build`.
 *
 *   node scripts/verify-export.mjs [--dir out] [--no-budget]
 *
 * Checks, in order of how much they have hurt in the past:
 *
 *   1. Catalog — the URL baked into the JS actually exists in the export, and
 *      the artifact's `format` matches CATALOG_FORMAT. A mismatch here is the
 *      "catalog could not be loaded" error users see.
 *   2. Headers — every first-load resource is covered by a Cache-Control rule
 *      in _headers, and the security headers are present.
 *   3. Budget — first-load JS, request count and total transfer stay under
 *      the numbers in BUDGET. Raise them deliberately, never by accident.
 *   4. Hygiene — robots.txt and sitemap.xml exist; no leftover `.dat` catalog.
 *
 * Exit code 0 = pass, 1 = a check failed, 2 = the export is missing/not built.
 */
import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gunzipSync, gzipSync } from "node:zlib"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** First-load budget. Tighten these as the site gets leaner. */
const BUDGET = {
  /** Total gzipped JavaScript the home page references. */
  jsGzipBytes: 420 * 1024,
  /** Number of resources a cold first visit fetches. */
  requests: 24,
  /** Everything on the first visit, gzipped where the file allows it. */
  totalGzipBytes: 900 * 1024,
}

const args = process.argv.slice(2)
const dirIndex = args.indexOf("--dir")
const OUT = path.resolve(ROOT, dirIndex >= 0 ? args[dirIndex + 1] : "out")
const skipBudget = args.includes("--no-budget")

const CATALOG_MAGIC = "TIPCAT6:"

/**
 * Mirrors src/features/catalog/lib/catalog-mask.ts, synchronously for Node.
 * Kept as a copy rather than an import because this script runs outside the
 * bundler and the app module is TypeScript. The build's own round-trip check
 * (`scripts/build-catalog.mjs`) proves the two implementations agree.
 */
function decodeCatalog(payload) {
  const text = payload.trim()
  if (!text.startsWith(CATALOG_MAGIC)) {
    throw new Error("missing TIPCAT6 signature")
  }
  const key =
    process.env.NEXT_PUBLIC_CATALOG_XOR_KEY?.trim() || "tipind-catalog-mask-v6"
  const xored = Buffer.from(text.slice(CATALOG_MAGIC.length), "base64")
  const keyBytes = Buffer.from(key, "utf8")
  const plain = Buffer.allocUnsafe(xored.length)
  for (let index = 0; index < xored.length; index += 1) {
    plain[index] = xored[index] ^ keyBytes[index % keyBytes.length]
  }
  return JSON.parse(gunzipSync(plain).toString("utf8"))
}

const failures = []
const notes = []
const pass = (message) => notes.push(`  ok    ${message}`)
const fail = (message) => failures.push(`  FAIL  ${message}`)

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

async function exists(file) {
  try {
    return (await stat(file)).isFile()
  } catch {
    return false
  }
}

/** Every file in the export, relative and slash-separated. */
async function listFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...(await listFiles(path.join(dir, entry.name), relative)))
    else files.push(relative)
  }
  return files
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"))
}

/** gzip estimate for a file we will serve compressed. */
async function wireSize(file) {
  const body = await readFile(file)
  const name = path.basename(file)
  if (/\.(woff2|webp|avif|png|jpg|jpeg|gz|br|zip)$/i.test(name)) {
    return body.byteLength
  }
  return gzipSync(body, { level: 9 }).byteLength
}

/* ── 1. catalog ──────────────────────────────────────────────────────── */

async function checkCatalog() {
  const homeHtml = await readFile(path.join(OUT, "index.html"), "utf8")
  const chunkPaths = [
    ...new Set(
      [...homeHtml.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map(
        (match) => match[1]
      )
    ),
  ]

  let catalogUrl = null
  for (const chunk of chunkPaths) {
    const file = path.join(OUT, chunk)
    if (!(await exists(file))) continue
    const text = await readFile(file, "utf8")
    const match = /"(\/data\/catalog\.[\w-]+\.(?:json|dat))"/.exec(text)
    if (match) {
      catalogUrl = match[1]
      break
    }
  }

  if (!catalogUrl) {
    fail("no catalog URL found in the JS bundle")
    return
  }

  const artifact = path.join(OUT, catalogUrl)
  if (!(await exists(artifact))) {
    fail(`the bundle requests ${catalogUrl} but that file is not in ${path.relative(ROOT, OUT)}/`)
    fail("  → rebuild the catalog (`npm run catalog:build -- --clean --write-env`) then `npm run build`")
    return
  }

  const expected = await readFile(
    path.join(ROOT, "src/features/catalog/constants.ts"),
    "utf8"
  )
  const formatMatch = /CATALOG_FORMAT = (\d+)/.exec(expected)
  const expectedFormat = formatMatch ? Number(formatMatch[1]) : null

  // Format 6: the artifact is masked (TIPCAT6: + base64(xor(gzip(json)))).
  // Decode it so the gate checks the real payload, not just that a file exists
  // — a wrong key or a stale artifact has to fail here, not in a browser.
  if (!catalogUrl.endsWith(".dat")) {
    fail(`catalog URL must point at a masked .dat artifact, got ${catalogUrl}`)
  } else {
    try {
      const data = decodeCatalog(await readFile(artifact, "utf8"))
      if (expectedFormat !== null && data.format !== expectedFormat) {
        fail(
          `catalog format is ${String(data.format)} but the app expects ${String(expectedFormat)} — rebuild the catalog`
        )
      }
      pass(
        `catalog ${catalogUrl} (format ${String(data.format)}, ${(data.products?.length ?? 0).toLocaleString()} products, masked)`
      )
    } catch (error) {
      fail(`catalog ${catalogUrl} could not be decoded: ${error.message}`)
    }
  }

  const stale = (await readdir(path.join(OUT, "data"))).filter((name) =>
    name.startsWith("catalog.")
  )
  if (stale.length > 1) {
    notes.push(`  note  ${String(stale.length)} catalog files in the export: ${stale.join(", ")}`)
  }
}

/* ── 2. headers ──────────────────────────────────────────────────────── */

const REQUIRED_RULES = [
  { label: "/_next/static/* immutable", pattern: "/_next/static/*", header: /Cache-Control:.*immutable/i },
  { label: "/data/* immutable", pattern: /^\/data\/.*\*/, header: /Cache-Control:.*immutable/i },
  { label: "entry points revalidate", pattern: "/", header: /Cache-Control:.*must-revalidate/i },
  { label: "CSP", pattern: "/*", header: /Content-Security-Policy:/i },
  { label: "X-Frame-Options", pattern: "/*", header: /X-Frame-Options:/i },
  { label: "HSTS", pattern: "/*", header: /Strict-Transport-Security:/i },
]

async function checkHeaders() {
  const file = path.join(OUT, "_headers")
  if (!(await exists(file))) {
    fail("_headers is missing from the export")
    return
  }
  const text = await readFile(file, "utf8")

  // Split into blocks: a path line followed by indented header lines.
  const blocks = text
    .split(/\n(?=\S)/)
    .map((block) => block.split("\n").map((line) => line.trimEnd()))
    .filter((lines) => lines[0] && !lines[0].startsWith("#"))

  const matches = (target, pattern) =>
    typeof pattern === "string" ? target === pattern : pattern.test(target)

  for (const rule of REQUIRED_RULES) {
    const block = blocks.find((lines) => matches(lines[0].trim(), rule.pattern))
    if (!block) {
      fail(`_headers has no rule for ${String(rule.pattern)} (${rule.label})`)
      continue
    }
    if (!block.some((line) => rule.header.test(line))) {
      fail(`_headers rule ${String(rule.pattern)} is missing ${rule.label}`)
      continue
    }
    pass(rule.label)
  }

  // Rules pointing at files that do not exist are maintenance lies.
  // Rules pointing at paths with no matching file are maintenance lies. A
  // rule is fine if it is a glob, or if any exported path starts with it.
  const exported = (await listFiles(OUT)).map((file) => `/${file}`)
  for (const lines of blocks) {
    const target = lines[0].trim()
    if (target === "/" || target === "/*" || target.includes("*")) continue
    if (!exported.some((file) => file === target || file.startsWith(`${target}/`))) {
      notes.push(`  note  _headers rule for ${target} matches no file in the export`)
    }
  }
}

/* ── 3. budget ───────────────────────────────────────────────────────── */

async function checkBudget() {
  const homeHtml = await readFile(path.join(OUT, "index.html"), "utf8")

  const resources = new Set(["/"])
  for (const [tag] of homeHtml.matchAll(/<link\b[^>]*>/g)) {
    const href = /\bhref="([^"]+)"/.exec(tag)?.[1]
    const rel = (/\brel="([^"]*)"/.exec(tag)?.[1] ?? "").toLowerCase()
    const as = (/\bas="([^"]*)"/.exec(tag)?.[1] ?? "").toLowerCase()
    if (!href) continue
    if (
      rel.includes("stylesheet") ||
      rel.includes("icon") ||
      rel.includes("manifest") ||
      ["font", "image", "script", "style"].includes(as)
    ) {
      resources.add(href)
    }
  }
  for (const match of homeHtml.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    resources.add(match[1])
  }

  const catalogMatch = /"(\/data\/catalog\.[\w-]+\.(?:json|dat))"/.exec(
    homeHtml
  )
  if (catalogMatch) resources.add(catalogMatch[1])

  let jsGzip = 0
  let totalGzip = 0
  for (const resource of resources) {
    const clean = resource.split("?")[0]
    const file = path.join(OUT, clean)
    if (!(await exists(file))) continue
    const size = await wireSize(file)
    totalGzip += size
    if (clean.endsWith(".js")) jsGzip += size
  }

  pass(`first-load requests: ${String(resources.size)} (budget ${String(BUDGET.requests)})`)
  pass(`first-load JS: ${kb(jsGzip)} gz (budget ${kb(BUDGET.jsGzipBytes)})`)
  pass(`first-load transfer: ${kb(totalGzip)} gz (budget ${kb(BUDGET.totalGzipBytes)})`)

  if (skipBudget) {
    notes.push("  note  budget checks disabled (--no-budget)")
    return
  }
  if (resources.size > BUDGET.requests) {
    fail(`first-load requests ${String(resources.size)} exceed the budget of ${String(BUDGET.requests)}`)
  }
  if (jsGzip > BUDGET.jsGzipBytes) {
    fail(`first-load JS ${kb(jsGzip)} exceeds the budget of ${kb(BUDGET.jsGzipBytes)}`)
  }
  if (totalGzip > BUDGET.totalGzipBytes) {
    fail(`first-load transfer ${kb(totalGzip)} exceeds the budget of ${kb(BUDGET.totalGzipBytes)}`)
  }
}

/* ── 4. hygiene ──────────────────────────────────────────────────────── */

async function checkHygiene() {
  for (const file of ["robots.txt", "sitemap.xml", "manifest.webmanifest"]) {
    if (await exists(path.join(OUT, file))) pass(`${file} present`)
    else fail(`${file} is missing from the export`)
  }

  const html = await readFile(path.join(OUT, "index.html"), "utf8")
  if (html.includes('type="application/ld+json"')) pass("JSON-LD present")
  else fail("no JSON-LD in the home page")

  if (html.includes('class="skip-link"')) pass("skip link present")
  else fail("no skip link in the home page")
}

/* ── run ─────────────────────────────────────────────────────────────── */

async function main() {
  if (!(await exists(path.join(OUT, "index.html")))) {
    console.error(`\n  ${path.relative(ROOT, OUT)}/index.html not found. Run \`npm run build\` first.\n`)
    process.exitCode = 2
    return
  }

  console.log(`\n  verifying ${path.relative(ROOT, OUT)}/\n`)

  for (const check of [checkCatalog, checkHeaders, checkBudget, checkHygiene]) {
    try {
      await check()
    } catch (error) {
      fail(`${check.name} threw: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  for (const line of notes) console.log(line)
  for (const line of failures) console.log(line)

  if (failures.length > 0) {
    console.log(`\n  ${String(failures.length)} check(s) failed\n`)
    process.exitCode = 1
    return
  }
  console.log("\n  all checks passed\n")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 2
})
