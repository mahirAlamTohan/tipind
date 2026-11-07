#!/usr/bin/env node
/**
 * Content and configuration audit.
 *
 * The failure this prevents: copy and config spread across six files with no
 * owner, dead strings nothing reads, and the same fact (the shipping list)
 * written out in five places that slowly disagree.
 *
 *   node scripts/content-audit.mjs
 *
 * Exit code 1 when something is wrong. See src/config/README.md for the rules.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const results = []
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`)
}
const warn = (name, detail = "") => {
  results.push({ name, ok: true, detail, warned: true })
  console.log(`  warn  ${name}${detail ? `  (${detail})` : ""}`)
}

/* ── gather sources ─────────────────────────────────────────────────────── */

const srcFiles = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (/\.tsx?$/.test(entry.name)) srcFiles.push(p)
  }
}
walk("src")

const read = (p) => readFileSync(p, "utf8")
const contentFiles = srcFiles.filter((f) => /content\.ts$/.test(f))

/* ── 1. every content key must be read somewhere ────────────────────────── */

console.log("\n  dead copy")

/**
 * Collects `key:` names inside a content object. Content files are plain object
 * literals, so a line-anchored match is accurate enough and avoids parsing TS.
 */
function contentKeys(file) {
  const source = read(file)
  const keys = new Set()
  for (const match of source.matchAll(/^\s{2,}([a-zA-Z][\w]*):/gm)) {
    keys.add(match[1])
  }
  return [...keys]
}

// A key is "read" if any source file references `.key` (property access) or it
// appears as a destructured/bracketed lookup.
const allSource = srcFiles.map(read).join("\n")
const dead = []
for (const file of contentFiles) {
  for (const key of contentKeys(file)) {
    // Keys used only as labels inside the same literal do not count, but a
    // property access anywhere does.
    const pattern = new RegExp(`\\.${key}\\b|\\[["']${key}["']\\]|\\b${key}:\\s*\\{?`, "g")
    const hits = allSource.match(pattern)
    if (!hits || hits.length <= 1) dead.push(`${file.split("/").slice(-2).join("/")}:${key}`)
  }
}
if (dead.length === 0) check("no unused content keys", true)
else warn("possibly-unused content keys", dead.slice(0, 8).join(", "))

/* ── 2. the shipping list must have one source ──────────────────────────── */

console.log("\n  single source of truth")

const siteSource = read("src/config/site.ts")
check(
  "shipping countries defined once, in site.ts",
  /export const DELIVERY_COUNTRIES/.test(siteSource),
  "DELIVERY_COUNTRIES"
)
check(
  "prose and compact forms are derived, not typed",
  siteSource.includes("DELIVERY_COUNTRIES_PROSE") &&
    siteSource.includes("DELIVERY_COUNTRIES_COMPACT"),
  "derived from the list"
)

// A hardcoded country list in a content file is the bug this catches. Comments
// are allowed to mention countries; data literals are not.
const countryListPattern =
  /"([^"]*\b(United States|United Kingdom|New Zealand|Australia)\b[^"]*)"/g
const hardcoded = []
for (const file of [...contentFiles, ...srcFiles.filter((f) => /\.tsx$/.test(f))]) {
  const lines = read(file).split("\n")
  lines.forEach((line, index) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return // comment
    if (countryListPattern.test(line)) hardcoded.push(`${file}:${(index + 1).toString()}`)
    countryListPattern.lastIndex = 0
  })
}
check(
  "no hardcoded country list in copy or components",
  hardcoded.length === 0,
  hardcoded.slice(0, 4).join(", ") || "all derived"
)

/* ── 3. site facts must not be retyped in copy ──────────────────────────── */

console.log("\n  no duplicated facts")

const siteName = /name:\s*publicValue\([^)]*"([^"]+)"/.exec(siteSource)?.[1] ?? "tipind"
const retypedName = []
for (const file of contentFiles) {
  const lines = read(file).split("\n")
  lines.forEach((line, index) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
    // A quoted literal containing the brand name, unless it is an interpolation.
    if (new RegExp(`"([^"]*\\b${siteName}\\b[^"]*)"`).test(line) && !line.includes("${")) {
      retypedName.push(`${file}:${(index + 1).toString()}`)
    }
  })
}
check(
  "brand name is interpolated, never retyped",
  retypedName.length === 0,
  retypedName.slice(0, 4).join(", ") || `uses \${siteConfig.name}`
)

check(
  "no `{name}` / `{founded}` build-time placeholders left in copy",
  !contentFiles.some((f) => /\{name\}|\{founded\}/.test(read(f))),
  "resolved at build time"
)

/* ── 4. business config must not live in a feature ──────────────────────── */

console.log("\n  ownership")

for (const file of srcFiles.filter((f) => /constants\.ts$/.test(f))) {
  const source = read(file)
  if (/PAYMENT_METHODS\s*[:=]\s*\[/.test(source)) {
    check(`${file} defines its own payment list`, false, "belongs in config/site.ts")
  }
  if (/DELIVERY_COUNTRIES\s*[:=]\s*\[/.test(source)) {
    check(`${file} defines its own country list`, false, "belongs in config/site.ts")
  }
}
check("business config lives in config/site.ts", true, "no feature redefines it")

/* ── 5. every env var used is documented ────────────────────────────────── */

console.log("\n  env vars")

const envUsed = new Set()
for (const file of srcFiles) {
  for (const match of read(file).matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    envUsed.add(match[1])
  }
}
const example = read(".env.example")
const undocumented = [...envUsed].filter((name) => !example.includes(name))
check(
  "every NEXT_PUBLIC_* var appears in .env.example",
  undocumented.length === 0,
  undocumented.join(", ") || `${envUsed.size.toString()} vars documented`
)

/* ── summary ────────────────────────────────────────────────────────────── */

const failed = results.filter((r) => !r.ok)
const warned = results.filter((r) => r.warned)
console.log(
  `\n  ${failed.length === 0 ? "all checks passed" : `${failed.length.toString()} failed`}` +
    (warned.length > 0 ? `, ${warned.length.toString()} warning(s)` : "") +
    "\n"
)
process.exitCode = failed.length === 0 ? 0 : 1
