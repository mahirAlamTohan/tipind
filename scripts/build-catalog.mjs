#!/usr/bin/env node
/**
 * Builds the catalog artifact from a source JSON file or a Google Apps Script
 * web app that reads the live Google Sheet.
 *
 *   node scripts/build-catalog.mjs -i <source.json> [-o public/data] [--clean] [--write-env]
 *   node scripts/build-catalog.mjs --sheet <apps-script-url> [-o public/data] [--clean] [--write-env]
 *
 * Output: <output>/catalog.<hash>.dat = MAGIC + XOR(gzip(JSON))
 * JSON:   { format: 4, priceBounds: [minMills, maxMills], manufacturers: string[],
 *           packaging: string[],
 *           products: [name, ingredient, manufacturerIdx, packagingIdx, priceMills][] }
 * A mill is 1/1000 USD, so "$0.665" is stored as 665 (3 decimals, exact).
 * Missing index/price is -1. Keep FORMAT/MAGIC in sync with
 * src/features/catalog/constants.ts.
 *
 * Rows whose "status" column is "needs review" are held out of the published
 * catalog (they require manual review first) and are reported in the stats.
 *
 * When --sheet is used, the raw source fetched from the Apps Script is saved to
 * extras/source.<hash>.json using the same <hash> as the output catalog file,
 * so every published catalog can be traced back to its source snapshot.
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
/** Default range asked of the Apps Script (header row + data rows). */
const DEFAULT_RANGE = "A1:Z10000"
/** Default sheet tab name. */
const DEFAULT_SHEET_TAB = "Price List 1 July 2026"

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

/**
 * Appends range + sheet query params to the Apps Script URL so doGet returns
 * the header row plus all data rows as a 2D array.
 */
function appsScriptUrl(url) {
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}range=${encodeURIComponent(DEFAULT_RANGE)}&sheet=${encodeURIComponent(DEFAULT_SHEET_TAB)}`
}

/**
 * The Apps Script doGet returns:
 *   { ok: true, range, data: [[headers...], [row1...], ...], rows: N }
 * Converts that into an array of objects keyed by the header row.
 */
function rowsFromAppsScript(result) {
  if (!result || !result.ok) {
    throw new Error(
      result && result.error
        ? `Apps Script error: ${result.error}`
        : "Apps Script did not return ok:true"
    )
  }
  const raw = result.data
  if (!Array.isArray(raw) || raw.length === 0) return []
  const headers = raw[0]
    .map((cell) => (cell === undefined || cell === null ? "" : String(cell)))
    .map((cell) => cell.trim())
  const objects = []
  for (let r = 1; r < raw.length; r++) {
    const obj = {}
    const cells = raw[r]
    for (let c = 0; c < headers.length; c++) {
      if (!headers[c]) continue
      obj[headers[c]] =
        cells[c] === undefined || cells[c] === null ? "" : cells[c]
    }
    objects.push(obj)
  }
  return objects
}

/** Downloads data from the Google Apps Script web app and returns row objects. */
async function fetchSheetRows(url) {
  const requestUrl = appsScriptUrl(url)
  let response
  try {
    response = await fetch(requestUrl)
  } catch (error) {
    throw new Error(
      `Couldn't reach the Apps Script web app: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  if (!response.ok) {
    throw new Error(
      `Apps Script request failed (status ${response.status.toString()}).`
    )
  }
  let result
  try {
    result = await response.json()
  } catch (error) {
    throw new Error(
      `Apps Script response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  return rowsFromAppsScript(result)
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

  if (values.help || (!values.input && !values.sheet)) {
    console.log(
      "Usage: node scripts/build-catalog.mjs -i <source.json> | --sheet <apps-script-url> [-o public/data] [--clean] [--write-env]"
    )
    return
  }

  try {
    process.loadEnvFile(path.join(ROOT, ".env"))
  } catch {
    // .env is optional if the variable is already set.
  }
  const xorKey = process.env[KEY_NAME]?.trim()
  if (!xorKey)
    throw new Error(
      `Missing ${KEY_NAME} (set it in .env). Note: it ships in the browser bundle, so it only obfuscates.`
    )

  let json
  if (values.sheet) {
    json = await fetchSheetRows(values.sheet)
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
  await mkdir(extrasDir, { recursive: true })
  await writeFile(
    path.join(extrasDir, `source.${hash}.json`),
    JSON.stringify(json, null, 2)
  )

  if (values.clean) {
    const stale = (await readdir(outputDir)).filter(
      (name) =>
        /^(catalog|manufacturers|packaging)\.[\w-]+\.dat$/.test(name) &&
        name !== fileName
    )
    await Promise.all(stale.map((name) => unlink(path.join(outputDir, name))))
    if (stale.length > 0)
      console.log(`Removed ${stale.length.toString()} stale file(s).`)
  }

  const dataUrl = `/${path.relative(path.join(ROOT, "public"), path.join(outputDir, fileName)).split(path.sep).join("/")}`
  if (values["write-env"]) {
    await updateEnv(path.join(ROOT, ".env.production"), URL_NAME, dataUrl)
    console.log("Updated .env.production")
  }

  console.log(`Wrote ${fileName} (${payload.length.toLocaleString()} bytes)`)
  console.log(`Wrote extras/source.${hash}.json`)
  console.log(
    `Products: ${artifact.products.length.toLocaleString()} of ${stats.source.toLocaleString()} rows`
  )
  console.log(
    `Skipped: ${stats.invalid.toLocaleString()} invalid, ${stats.duplicates.toLocaleString()} duplicates, ${stats.needsReview.toLocaleString()} needs review`
  )
  console.log(
    `Without a usable price: ${stats.noPrice.toLocaleString()} (shown, but can't be added to an checkout)`
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
  console.error(
    `Catalog build failed: ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
})
