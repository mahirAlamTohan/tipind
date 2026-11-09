#!/usr/bin/env node
/**
 * Builds the catalog artifact from a source JSON file or a Google Apps Script
 * web app that reads the live Google Sheet.
 *
 *   node scripts/build-catalog.mjs -i <source.json> [-o public/data] [--clean] [--write-env]
 *   node scripts/build-catalog.mjs [--sheet <apps-script-url>] [-o public/data] [--clean] [--write-env]
 *
 * Without -i or --sheet, the sheet URL comes from CATALOG_SHEET_URL in the
 * environment or in .env / .env.production.
 *
 * Output: <output>/catalog.<hash>.dat = MAGIC + XOR(gzip(JSON))
 * JSON:   { format: 4, priceBounds: [minMills, maxMills], manufacturers: string[],
 *           packaging: string[], types: string[],
 *           products: [name, ingredient, manufacturerIdx, packagingIdx, typeIdx, priceMills][] }
 * A mill is 1/1000 USD, so "$0.665" is stored as 665 (3 decimals, exact).
 * Missing index/price is -1. Keep FORMAT/MAGIC in sync with
 * src/features/catalog/constants.ts (and check the product tuple matches the reader).
 *
 * Rows whose "status" column is "needs review" are held out of the published
 * catalog and are reported in the stats.
 *
 * --sheet asks the Apps Script how many rows the tab really has (?info=1) and then
 * downloads exactly that many, in chunks, so it never misses rows and never pulls
 * thousands of blank ones. Needs the version 2 Apps Script (sheet_editor.gs).
 * The raw rows are saved to extras/source.<hash>.json (same <hash> as the catalog).
 */
import { createHash } from "node:crypto"
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { gzipSync } from "node:zlib"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const KEY_NAME = "NEXT_PUBLIC_CATALOG_XOR_KEY"
const URL_NAME = "NEXT_PUBLIC_CATALOG_DATA_URL"
const FORMAT = 4
const MAGIC = Buffer.from("TIPCAT4:", "ascii")
const NONE = -1
const MAX_UNIT_PRICE_MILLS = 100_000_000
/** Status value that holds a product out of the published catalog. */
const REVIEW_STATUS = "needs review"
/** Default sheet tab name. */
const DEFAULT_SHEET_TAB = "Price List"
/** Rows requested from the Apps Script per call. */
const CHUNK_ROWS = 2000
const FETCH_TIMEOUT_MS = 90_000
const FETCH_ATTEMPTS = 3

const ALIASES = {
  name: [
    "product name",
    "product",
    "brand name",
    "brand",
    "medicine name",
    "drug name",
    "name",
  ],
  ingredient: [
    "active ingredient",
    "active ingredients",
    "ingredient",
    "content",
    "composition",
    "generic name",
    "salt",
  ],
  manufacturer: [
    "manufacturer",
    "manufacturer name",
    "maker",
    "mfr",
    "company",
  ],
  packaging: ["packaging", "pack size", "packsize", "package", "pack"],
  price: [
    "rate (usd)",
    "rate usd",
    "rate",
    "price in usd",
    "usd price",
    "price",
  ],
  status: ["status"],
  type: ["type", "dosage form", "form", "unit"],
}

const key = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")

const compare = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const describe = (error) =>
  error instanceof Error ? error.message : String(error)

function text(value) {
  if (typeof value !== "string" && typeof value !== "number") return ""
  return String(value).normalize("NFC").replace(/\s+/g, " ").trim()
}

/** "$2.831" -> 2831 (exact; digits past the 3rd decimal are rounded half up). */
function parseMills(value) {
  const cleaned = text(value)
    .replace(/^\$\s*/, "")
    .replace(/,/g, "")
  const match = /^(\d{1,9})(?:\.(\d+))?$/.exec(cleaned)
  if (!match) return NONE
  const fraction = (match[2] ?? "").padEnd(4, "0")
  let mills = Number(match[1]) * 1000 + Number(fraction.slice(0, 3))
  if (Number(fraction[3]) >= 5) mills += 1
  return mills <= MAX_UNIT_PRICE_MILLS ? mills : NONE
}

/** True when the source has non-zero digits beyond 3 decimals (they get rounded). */
const losesPrecision = (value) => /\.\d{3}\d*[1-9]/.test(text(value))

function rowsFrom(json) {
  if (Array.isArray(json)) return json
  if (json && typeof json === "object") {
    for (const name of ["products", "data", "rows", "items"]) {
      if (Array.isArray(json[name])) return json[name]
    }
  }
  throw new Error(
    "The JSON must be an array of product objects (or { products: [...] })."
  )
}

function readRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null
  const fields = new Map(
    Object.entries(row).map(([name, value]) => [key(name), value])
  )
  const pick = (aliases) =>
    text(
      aliases
        .map((alias) => fields.get(key(alias)))
        .find((v) => v !== undefined)
    )

  const name = pick(ALIASES.name)
  if (!name) return null
  const status = pick(ALIASES.status)
  const type = pick(ALIASES.type)
  const price = pick(ALIASES.price)
  return {
    name,
    ingredient: pick(ALIASES.ingredient),
    manufacturer: pick(ALIASES.manufacturer),
    packaging: pick(ALIASES.packaging),
    type,
    status,
    mills: parseMills(price),
    lossy: losesPrecision(price),
  }
}

function dictionary(values) {
  const canonical = new Map()
  for (const value of values) {
    if (value && !canonical.has(key(value))) canonical.set(key(value), value)
  }
  const list = [...canonical.values()].sort(compare)
  const indexes = new Map(list.map((value, index) => [key(value), index]))
  return {
    list,
    indexOf: (value) => (value ? (indexes.get(key(value)) ?? NONE) : NONE),
  }
}

function build(json) {
  const source = rowsFrom(json)
  const seen = new Set()
  const rows = []
  let invalid = 0
  let duplicates = 0
  let needsReview = 0

  for (const raw of source) {
    const row = readRow(raw)
    if (!row) {
      invalid += 1
      continue
    }
    if (row.status && row.status.trim().toLowerCase() === REVIEW_STATUS) {
      needsReview += 1
      continue
    }
    const identity = [
      row.name,
      row.ingredient,
      row.manufacturer,
      row.packaging,
      row.mills,
    ]
      .map((v) => key(String(v)))
      .join("|")
    if (seen.has(identity)) {
      duplicates += 1
      continue
    }
    seen.add(identity)
    rows.push(row)
  }
  if (rows.length === 0)
    throw new Error("No valid products found (a Product Name is required).")

  rows.sort(
    (a, b) => compare(a.name, b.name) || compare(a.manufacturer, b.manufacturer)
  )

  const manufacturers = dictionary(rows.map((row) => row.manufacturer))
  const packaging = dictionary(rows.map((row) => row.packaging))
  const types = dictionary(rows.map((row) => row.type))
  const prices = rows.map((row) => row.mills).filter((mills) => mills !== NONE)
  const min = prices.length > 0 ? Math.min(...prices) : 0
  const max = prices.length > 0 ? Math.max(...prices) : 100_000

  return {
    stats: {
      duplicates,
      invalid,
      needsReview,
      noPrice: rows.length - prices.length,
      rounded: rows.filter((row) => row.lossy).length,
      source: source.length,
    },
    artifact: {
      format: FORMAT,
      priceBounds: [min, max > min ? max : min + 1],
      manufacturers: manufacturers.list,
      packaging: packaging.list,
      types: types.list,
      products: rows.map((row) => [
        row.name,
        row.ingredient,
        manufacturers.indexOf(row.manufacturer),
        packaging.indexOf(row.packaging),
        types.indexOf(row.type),
        row.mills,
      ]),
    },
  }
}

const encode = (artifact, keyBytes) => {
  const gzipped = gzipSync(Buffer.from(JSON.stringify(artifact), "utf8"), {
    level: 9,
  })
  const masked = gzipped.map(
    (byte, index) => byte ^ keyBytes[index % keyBytes.length]
  )
  return Buffer.concat([MAGIC, masked])
}

/* ── Google Apps Script support ─────────────────────────────────────── */

/** 1 -> A, 26 -> Z, 27 -> AA */
function columnLetter(n) {
  let letters = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

/** Builds a request URL with query params (robust against existing params / stray quotes). */
function withParams(base, params) {
  const url = new URL(base)
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value)
  }
  return url.toString()
}

/** GET + parse JSON, with a timeout and retries for network hiccups. */
async function getJson(url, label) {
  let lastError
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`HTTP status ${response.status}`)
      const body = await response.text()
      try {
        return JSON.parse(body)
      } catch {
        throw new Error(
          "response was not JSON (is the web app deployed with access set to 'Anyone'?)"
        )
      }
    } catch (error) {
      lastError = error
      if (attempt < FETCH_ATTEMPTS) await sleep(1000 * attempt)
    }
  }
  throw new Error(`${label}: ${describe(lastError)}`)
}

function requireOk(result, label) {
  if (!result || !result.ok) {
    throw new Error(
      `${label}: ${result && result.error ? `Apps Script error: ${result.error}` : "Apps Script did not return ok:true"}`
    )
  }
  return result
}

/** Asks the Apps Script how big the tab is. */
async function fetchSheetInfo(base, tab) {
  const info = requireOk(
    await getJson(withParams(base, { info: "1", sheet: tab }), "Sheet info"),
    "Sheet info"
  )
  if (!Number.isInteger(info.lastRow) || !Number.isInteger(info.lastColumn)) {
    throw new Error(
      "The deployed Apps Script is out of date (it doesn't report the row count). " +
        "Paste the new sheet_editor.gs, then Deploy > Manage deployments > edit > New version > Deploy."
    )
  }
  return info
}

/** Downloads rows 1..lastRow (all columns that have data) as a 2D array. */
async function fetchAllCells(base, tab, info) {
  const lastCol = columnLetter(Math.max(info.lastColumn, 1))
  const cells = []
  for (let start = 1; start <= info.lastRow; start += CHUNK_ROWS) {
    const end = Math.min(start + CHUNK_ROWS - 1, info.lastRow)
    const range = `A${start}:${lastCol}${end}`
    const label = `Rows ${start.toLocaleString()}-${end.toLocaleString()}`
    const result = requireOk(
      await getJson(withParams(base, { range, sheet: tab, table: "1" }), label),
      label
    )
    const expected = end - start + 1
    if (!Array.isArray(result.data) || result.data.length !== expected) {
      throw new Error(
        `${label}: expected ${expected.toString()} rows but got ${Array.isArray(result.data) ? result.data.length.toString() : "none"}.`
      )
    }
    for (const row of result.data) cells.push(row)
    process.stdout.write(
      `\r  downloaded ${Math.min(end, info.lastRow).toLocaleString()} / ${info.lastRow.toLocaleString()} rows`
    )
  }
  process.stdout.write("\n")
  return cells
}

/** Turns [[headers...], [row...], ...] into objects keyed by header; skips fully blank rows. */
function rowsFromCells(cells) {
  if (cells.length === 0) return []
  const headers = cells[0].map((cell) =>
    cell === undefined || cell === null ? "" : String(cell).trim()
  )
  const hasName = headers.some((h) =>
    ALIASES.name.some((a) => key(a) === key(h))
  )
  if (!hasName) {
    throw new Error(
      `Row 1 doesn't look like a header row (no Product Name column). Found: ${headers.filter(Boolean).join(", ") || "(empty)"}`
    )
  }
  const objects = []
  for (let r = 1; r < cells.length; r++) {
    const row = cells[r]
    const obj = {}
    let blank = true
    for (let c = 0; c < headers.length; c++) {
      if (!headers[c]) continue
      const cell = row[c] === undefined || row[c] === null ? "" : row[c]
      if (text(cell) !== "") blank = false
      obj[headers[c]] = cell
    }
    if (!blank) objects.push(obj)
  }
  return objects
}

/**
 * Downloads every row of the tab. Re-checks the row count afterwards and starts
 * over if the sheet was edited mid-download, so the snapshot is consistent.
 */
async function fetchSheetRows(rawUrl) {
  const base = rawUrl.trim().replace(/^['"]+|['"]+$/g, "")
  try {
    new URL(base)
  } catch {
    throw new Error(`Not a valid Apps Script URL: ${base}`)
  }
  const tab = DEFAULT_SHEET_TAB

  for (let pass = 1; pass <= 3; pass++) {
    const info = await fetchSheetInfo(base, tab)
    console.log(
      `Sheet "${info.sheet}": ${info.lastRow.toLocaleString()} rows x ${info.lastColumn.toString()} columns`
    )
    if (info.lastRow < 2) return []
    const cells = await fetchAllCells(base, tab, info)
    const after = await fetchSheetInfo(base, tab)
    if (after.lastRow === info.lastRow) return rowsFromCells(cells)
    console.log("Sheet changed while downloading, fetching again...")
  }
  throw new Error("The sheet kept changing while downloading. Try again.")
}

/* ── env / output helpers ──────────────────────────────────────────── */

async function updateEnv(file, name, value) {
  let content = ""
  try {
    content = await readFile(file, "utf8")
  } catch {
    // New file.
  }
  const line = `${name}=${value}`
  const pattern = new RegExp(`^${name}=.*$`, "m")
  const next = pattern.test(content)
    ? content.replace(pattern, line)
    : `${content}${content && !content.endsWith("\n") ? "\n" : ""}${line}\n`
  await writeFile(file, next)
}

function loadEnvFiles() {
  for (const name of [".env", ".env.production"]) {
    try {
      process.loadEnvFile(path.join(ROOT, name))
    } catch {
      // Optional file.
    }
  }
}

async function removeStale(dir, pattern, keep) {
  let names = []
  try {
    names = await readdir(dir)
  } catch {
    return 0
  }
  const stale = names.filter((name) => pattern.test(name) && name !== keep)
  await Promise.all(stale.map((name) => unlink(path.join(dir, name))))
  return stale.length
}

async function main() {
  const { values } = parseArgs({
    options: {
      clean: { type: "boolean" },
      help: { short: "h", type: "boolean" },
      input: { short: "i", type: "string" },
      output: { default: "public/data", short: "o", type: "string" },
      sheet: { type: "string" },
      "write-env": { type: "boolean" },
    },
  })

  // Existing environment variables win; .env then .env.production fill gaps.
  loadEnvFiles()
  const sheetUrl = values.sheet?.trim() || process.env.CATALOG_SHEET_URL?.trim()

  if (values.help || (!values.input && !sheetUrl)) {
    console.log(
      "Usage: node scripts/build-catalog.mjs -i <source.json> | [--sheet <apps-script-url>] [-o public/data] [--clean] [--write-env]"
    )
    console.log(
      "Without -i/--sheet, the sheet URL is read from CATALOG_SHEET_URL."
    )
    return
  }

  const xorKey = process.env[KEY_NAME]?.trim()
  if (!xorKey)
    throw new Error(
      `Missing ${KEY_NAME} (set it in .env or .env.production). Note: it ships in the browser bundle, so it only obfuscates.`
    )

  let json
  if (sheetUrl) {
    json = await fetchSheetRows(sheetUrl)
  } else {
    const input = path.resolve(ROOT, values.input)
    json = JSON.parse((await readFile(input, "utf8")).replace(/^\uFEFF/, ""))
  }

  const outputDir = path.resolve(ROOT, values.output)
  const { artifact, stats } = build(json)
  const payload = encode(artifact, Buffer.from(xorKey, "utf8"))
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 8)
  const fileName = `catalog.${hash}.dat`

  await mkdir(outputDir, { recursive: true })
  await writeFile(path.join(outputDir, fileName), payload)

  // Save the raw source snapshot beside the catalog, sharing the same version hash.
  const extrasDir = path.join(ROOT, "extras")
  const sourceName = `source.${hash}.json`
  await mkdir(extrasDir, { recursive: true })
  await writeFile(
    path.join(extrasDir, sourceName),
    JSON.stringify(json, null, 2)
  )

  if (values.clean) {
    const removed =
      (await removeStale(
        outputDir,
        /^(catalog|manufacturers|packaging)\.[\w-]+\.dat$/,
        fileName
      )) + (await removeStale(extrasDir, /^source\.[\w-]+\.json$/, sourceName))
    if (removed > 0) console.log(`Removed ${removed.toString()} stale file(s).`)
  }

  const dataUrl = `/${path.relative(path.join(ROOT, "public"), path.join(outputDir, fileName)).split(path.sep).join("/")}`
  if (values["write-env"]) {
    await updateEnv(path.join(ROOT, ".env.production"), URL_NAME, dataUrl)
    console.log("Updated .env.production")
  }

  console.log(`Wrote ${fileName} (${payload.length.toLocaleString()} bytes)`)
  console.log(`Wrote extras/${sourceName}`)
  console.log(
    `Products: ${artifact.products.length.toLocaleString()} of ${stats.source.toLocaleString()} rows`
  )
  console.log(
    `Skipped: ${stats.invalid.toLocaleString()} invalid, ${stats.duplicates.toLocaleString()} duplicates, ${stats.needsReview.toLocaleString()} needs review`
  )
  console.log(
    `Without a usable price: ${stats.noPrice.toLocaleString()} (shown, but can't be added to a checkout)`
  )
  console.log(
    `Prices rounded to 3 decimals (source had more): ${stats.rounded.toLocaleString()}`
  )
  console.log(
    `Manufacturers: ${artifact.manufacturers.length.toLocaleString()}, packaging options: ${artifact.packaging.length.toLocaleString()}`
  )
  console.log(
    `Price range: $${(artifact.priceBounds[0] / 1000).toFixed(3)} to $${(artifact.priceBounds[1] / 1000).toFixed(3)}`
  )
  if (!values["write-env"]) console.log(`Set ${URL_NAME}=${dataUrl}`)
}

main().catch((error) => {
  console.error(`Catalog build failed: ${describe(error)}`)
  process.exitCode = 1
})
