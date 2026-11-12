#!/usr/bin/env bun
/**
 * tipind full test suite runner.
 *
 * Run everything:
 *   bun test/run-all.mjs
 *
 * Run unit tests only:
 *   bun test/run-all.mjs --unit
 *
 * Run e2e tests only (needs dev server on :3000):
 *   bun test/run-all.mjs --e2e
 *
 * Run security audits only:
 *   bun test/run-all.mjs --security
 */

import { execSync } from "node:child_process"

const args = process.argv.slice(2)
const runUnit = !args.includes("--e2e") && !args.includes("--security")
const runE2E = args.includes("--e2e") || args.includes("--all")
const runSecurity = args.includes("--security") || args.includes("--all")

let failed = 0

function run(label, command) {
  console.log(`\n═══ ${label} ═══`)
  console.log(`$ ${command}`)
  try {
    execSync(command, { stdio: "inherit" })
    console.log(`\n✅ ${label} passed\n`)
  } catch (err) {
    console.log(`\n❌ ${label} failed\n`)
    failed++
  }
}

/* ── unit tests (bun test) ─── */
if (runUnit) {
  run("Unit tests: search ranking", "bun test tests/unit/search-ranking.test.ts")
  run("Unit tests: cart logic", "bun test tests/unit/cart.test.ts")
  run("Unit tests: checkout validation", "bun test tests/unit/checkout-validation.test.ts")
}

/* ── e2e tests (Playwright — needs dev server on :3000) ─── */
if (runE2E) {
  run("E2E: catalog features", "playwright test tests/e2e/catalog-features.spec.ts")
  run("E2E: checkout flow", "playwright test tests/e2e/checkout-flow.spec.ts")
  run("E2E: DOM-XSS surface", "playwright test tests/e2e/dom-xss.spec.ts")
}

/* ── security audits ─── */
if (runSecurity) {
  run("Security: static audit", "bun run security:audit")
  run("Security: content audit", "bun run content:audit")
}

console.log(`\n═══ Test suite complete ═══`)
if (failed) {
  console.log(`❌ ${failed} suite(s) failed`)
  process.exit(1)
} else {
  console.log("✅ All suites passed")
}
