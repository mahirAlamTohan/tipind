#!/usr/bin/env node
/**
 * Security regression checks.
 *
 * Every case here is an attack that was actually found by probing the built
 * site, not a hypothetical. Run them on every change so a refactor cannot
 * quietly reopen one.
 *
 *   node scripts/security-check.mjs
 *
 * Exit code 1 if any check fails.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const results = []
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`)
}

/* ── 1. JSON-LD must not be able to break out of its <script> ─────────────
   The site serialises config values into an inline script. JSON.stringify
   leaves `<` and `>` alone, so a value containing `</script>` would close the
   element and let the rest of the string be parsed as HTML. */
console.log("\n  structured data (XSS)")

const guardSrc = readFileSync("src/components/layout/structured-data.tsx", "utf8")
// The source contains the two-character escape "\\u003c" (a literal
// backslash followed by u003c), so match on the exact bytes with includes().
const escapesLt = guardSrc.includes(String.raw`replace(/</g, "\\u003c")`)
const escapesGt = guardSrc.includes(String.raw`replace(/>/g, "\\u003e")`)
const escapesAmp = guardSrc.includes(String.raw`replace(/&/g, "\\u0026")`)
check(
  "JSON-LD serializer escapes < > &",
  escapesLt && escapesGt && escapesAmp,
  escapesLt && escapesGt && escapesAmp ? "all three" : `lt=${String(escapesLt)} gt=${String(escapesGt)} amp=${String(escapesAmp)}`
)
check(
  "no raw JSON.stringify into dangerouslySetInnerHTML",
  !/dangerouslySetInnerHTML=\{\{ __html: JSON\.stringify/.test(guardSrc),
  "must go through serializeJsonLd"
)

/* ── 2. Checkout free-text must be length-capped and control-stripped ───── */
console.log("\n  checkout input handling")

const validation = readFileSync("src/features/checkout/lib/validation.ts", "utf8")
check(
  "schema caps field length",
  validation.includes("MAX_FIELD_LENGTH") && /\.max\(/.test(validation),
  "MAX_FIELD_LENGTH applied"
)
check(
  "schema caps notes length",
  validation.includes("MAX_NOTES_LENGTH"),
  "MAX_NOTES_LENGTH applied"
)
const sanitize = readFileSync("src/lib/sanitize.ts", "utf8")
check(
  "shared sanitizer strips control characters",
  sanitize.includes("function stripControlChars") && sanitize.includes("code <= 0x1f"),
  "C0/C1 removed by code point"
)
check(
  "shared sanitizer strips bidi + zero-width",
  sanitize.includes("0x202a") && sanitize.includes("0x200b"),
  "RTL overrides and zero-width removed"
)
check(
  "checkout validation uses the shared sanitizer",
  validation.includes("stripControlChars"),
  "no duplicated char policy"
)
check(
  "required() cannot be bypassed by whitespace-only",
  /required = \(\) => clean\(MAX_FIELD_LENGTH\)\.pipe\(z\.string\(\)\.min\(1/.test(
    validation
  ),
  "min(1) after trim"
)

const orderMessage = readFileSync(
  "src/features/checkout/lib/order-message.ts",
  "utf8"
)
check(
  "order message flattens newlines in single-line fields",
  orderMessage.includes("toSingleLine") &&
    orderMessage.includes("inline(details.addressLine1)") &&
    orderMessage.includes("inline(place)"),
  "toSingleLine applied to name/address"
)

console.log("\n  stored data")

const details = readFileSync("src/features/checkout/lib/details.ts", "utf8")
check(
  "stored details stripped on read",
  details.includes("stripControlChars") && details.includes(".max(MAX_FIELD_LENGTH)"),
  "sanitizeDetails enforces policy"
)

/* ── 3. Build output must not leak internals ──────────────────────────────
   Only runs when out/ exists; skipped (not failed) before a build. */
console.log("\n  build output")

let built = false
try {
  statSync("out/index.html")
  built = true
} catch {
  console.log("  --    out/ not built, skipping output checks")
}

if (built) {
  const walk = (dir, out = []) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) walk(p, out)
      else out.push(p)
    }
    return out
  }
  const files = walk("out")

  check("no source maps shipped", !files.some((f) => f.endsWith(".map")))
  check(
    "no TypeScript sources shipped",
    !files.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
  )
  check("no .env files shipped", !files.some((f) => /(^|\/)\.env/.test(f)))

  const html = readFileSync("out/index.html", "utf8")
  check(
    "no env var names leaked into HTML",
    !/NEXT_PUBLIC_[A-Z_]+/.test(html),
    "checked index.html"
  )

  // The published JSON-LD must be a single, intact script element: the JSON
  // runs from the opening tag to the FIRST "</script", and that slice must
  // parse. If an injected "</script" split it, this fails.
  const ldTag = 'type="application/ld+json"'
  const ldAt = html.indexOf(ldTag)
  check("JSON-LD block is present in published HTML", ldAt !== -1)
  if (ldAt !== -1) {
    const bodyStart = html.indexOf(">", ldAt) + 1
    const bodyEnd = html.indexOf("</script", bodyStart)
    const raw = html.slice(bodyStart, bodyEnd)
    let parsed = false
    try {
      JSON.parse(raw)
      parsed = true
    } catch {
      parsed = false
    }
    check(
      "JSON-LD parses as one intact script body",
      parsed,
      `${raw.length.toString()} chars`
    )
    check(
      "JSON-LD contains no raw < or >",
      !raw.includes("<") && !raw.includes(">"),
      "escaped to \\u003c / \\u003e"
    )
  }

  // Fake Cloudflare files must not be servable content.
  check(
    "_headers exists in out/ (applied by Cloudflare, never served)",
    files.some((f) => f.endsWith("_headers"))
  )
}

/* ── 4. Links opening a new tab must not leak the opener ────────────────── */
console.log("\n  link hygiene")

const srcFiles = []
const walkSrc = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) walkSrc(p)
    else if (/\.tsx?$/.test(entry.name)) srcFiles.push(p)
  }
}
walkSrc("src")

let blankWithoutRel = 0
for (const file of srcFiles) {
  const src = readFileSync(file, "utf8")
  const blanks = (src.match(/target="_blank"/g) ?? []).length
  const rels = (src.match(/rel="(?:noreferrer|noopener)/g) ?? []).length
  if (blanks > rels) blankWithoutRel += blanks - rels
}
check(
  'every target="_blank" has rel="noreferrer"/"noopener"',
  blankWithoutRel === 0,
  `${blankWithoutRel.toString()} missing`
)

/* ── 5. No dangerous sinks beyond the reviewed one ──────────────────────── */
console.log("\n  dangerous sinks")

let sinks = 0
for (const file of srcFiles) {
  const src = readFileSync(file, "utf8")
  if (/innerHTML\s*=|document\.write\(|new Function\(|eval\(/.test(src)) {
    sinks++
    console.log(`        ${file}`)
  }
}
check("no innerHTML / eval / new Function in source", sinks === 0)

/* ── summary ────────────────────────────────────────────────────────────── */
const failed = results.filter((r) => !r.ok)
console.log(
  `\n  ${failed.length === 0 ? "all checks passed" : `${failed.length.toString()} failed`}\n`
)
process.exitCode = failed.length === 0 ? 0 : 1
