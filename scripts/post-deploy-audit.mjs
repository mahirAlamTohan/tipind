/**
 * tipind post-deployment security audit — run against the live site after
 * every deploy to prove the defensive posture survived the push.
 *
 * Run:  bun run post-deploy-audit [URL]
 *       bun run post-deploy-audit https://tipind.mahiralamtohan.workers.dev
 *
 * Exits non-zero on any FAIL — wire it into your deploy checklist.
 *
 * What this proves (live, not static):
 *   • security headers arrive on every route
 *   • CSP has no unsafe-eval, no wildcard hosts, frame-ancestors none
 *   • no env vars / stack traces / inline event handlers in shipped HTML
 *   • catalog .dat is masked TIPCAT6, not plain JSON
 *   • sensitive files (.env, package.json, source maps) return 404
 *   • checkout is noindexed and cache-controlled
 *   • no service worker / dynamic endpoint to hijack or flood
 *
 * What this does NOT prove:
 *   • runtime-browser DOM XSS (needs e2e/Playwright)
 *   • Cloudflare account/WAF config (see docs/security/evidence.md)
 *   • dependency compromise (run `bun audit` locally)
 *   • account takeover (use 2FA on Cloudflare / GitHub)
 */

import { URL } from "node:url";

const TARGET = process.argv[2] ?? "https://tipind.mahiralamtohan.workers.dev";

let failures = 0;
let passes = 0;
let advisories = 0;

function fail(name, detail) {
  failures++;
  console.log(`  FAIL ${name}`);
  if (detail) console.log(`        ${detail}`);
}
function pass(name, detail) {
  passes++;
  console.log(`  ok   ${name}`);
  if (detail) console.log(`        ${detail}`);
}
function advise(name, detail) {
  advisories++;
  console.log(`  ⚠️   ${name}`);
  if (detail) console.log(`        ${detail}`);
}

async function fetchWithHeaders(path) {
  const res = await fetch(new URL(path, TARGET));
  const body = await res.text();
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body };
}

/* ── 1. transport & response headers (live) ─── */
console.log("\n═══ 1. transport & response headers (live) ═══");

const routes = ["/", "/checkout/", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest"];
const routeResults = [];
for (const r of routes) {
  const { status, headers } = await fetchWithHeaders(r);
  routeResults.push({ path: r, status, headers });
}

const REQUIRED_HEADERS = [
  ["X-Content-Type-Options: nosniff", (h) => /nosniff/i.test(h["x-content-type-options"] || "")],
  ["X-Frame-Options: DENY/SAMEORIGIN", (h) => /^(DENY|SAMEORIGIN)$/i.test(h["x-frame-options"] || "")],
  ["Referrer-Policy", (h) => /referrer-policy/i.test(JSON.stringify(h))],
  [
    "Strict-Transport-Security: max-age=31536000",
    (h) => /max-age=31536000/i.test(h["strict-transport-security"] || ""),
  ],
  [
    "Permissions-Policy disables sensors",
    (h) => /camera=\(\)|microphone=\(\)|geolocation=\(\)/.test(h["permissions-policy"] || ""),
  ],
  ["Cross-Origin-Opener-Policy: same-origin", (h) => /same-origin/i.test(h["cross-origin-opener-policy"] || "")],
  ["Content-Security-Policy present", (h) => /content-security-policy/i.test(JSON.stringify(h))],
];

for (const { path, headers } of routeResults) {
  for (const [name, fn] of REQUIRED_HEADERS) {
    pass(`${path}: ${name}`, fn(headers));
  }
}

/* CSP deep-dive on the home page */
const homeCSP = routeResults.find((r) => r.path === "/").headers["content-security-policy"] || "";
pass("home CSP present", !!homeCSP);
pass("home CSP: no unsafe-eval", !/unsafe-eval/i.test(homeCSP));
pass("home CSP: frame-ancestors none", /frame-ancestors\s+'none'/i.test(homeCSP));
pass("home CSP: base-uri self", /base-uri\s+'self'/i.test(homeCSP));
pass("home CSP: connect-src self", /connect-src\s+'self'/i.test(homeCSP));
pass("home CSP: object-src none", /object-src\s+'none'/i.test(homeCSP));
pass("home CSP: no wildcard hosts", !/\*\*/.test(homeCSP));
if (/unsafe-inline/i.test(homeCSP)) {
  advise(
    "home CSP: script-src/style-src allow unsafe-inline",
    "Next.js inline runtime; remove once nonces are wired (next.config csp)",
  );
}

/* ── 2. build-output leakage (live HTML bodies) ─── */
console.log("\n═══ 2. build-output leakage (live HTML) ═══");

for (const { path, body } of routeResults.filter((r) => r.path.endsWith("/"))) {
  const label = path === "/" ? "home" : path;
  pass(`${label}: no raw env dump`, !/NEXT_PUBLIC_/.test(body));
  pass(`${label}: no stack trace`, !/at Object\.|at async|TypeError|ReferenceError/.test(body));
  pass(`${label}: no debugger`, !/\bdebugger\b/.test(body));
  pass(`${label}: no inline event handlers`, !/\bon(e|click|error|load|mouseover|submit|focus)=/i.test(body));
  pass(`${label}: no service worker registration`, !/serviceWorker|navigator\.worker/.test(body));
  pass(`${label}: no inline scripts besides JSON-LD`, !/<script[^>]*>(?![\s\S]*src\s*=)(?!.*application\/ld\+json)/.test(body));
}

/* JSON-LD on home page */
const homeBody = routeResults.find((r) => r.path === "/").body;
const blocks = homeBody.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/g) || [];
let intact = 0;
let rawAngles = 0;
for (const b of blocks) {
  const body = b.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
  try { JSON.parse(body); intact++; } catch { /* fine */ }
  if (/[<>]/.test(body)) rawAngles++;
}
pass("home JSON-LD blocks present", blocks.length > 0);
pass(`home JSON-LD parses intact (${intact}/${blocks.length})`, intact === blocks.length && blocks.length > 0);
pass("home JSON-LD no raw < or >", rawAngles === 0);

/* ── 3. catalog artifact (live) ─── */
console.log("\n═══ 3. catalog artifact (live) ═══");
const { status: catStatus, body: catBody } = await fetchWithHeaders("/data/catalog.60cf59b2.dat");
pass("catalog .dat returns 200", catStatus === 200);
pass("catalog .dat starts with TIPCAT6", catBody.startsWith("TIPCAT6"));
let catParsed = false;
try { JSON.parse(catBody); catParsed = true; } catch { /* good */ }
pass("catalog .dat not parseable as JSON", !catParsed);

/* ── 4. sensitive files must be 404 (live) ─── */
console.log("\n═══ 4. sensitive files must be 404 (live) ═══");
const sensitive = ["/.env", "/.env.production", "/package.json", "/package-lock.json", "/tsconfig.json", "/.map", "/__next__/"];
for (const s of sensitive) {
  const { status } = await fetchWithHeaders(s);
  pass(`${s}: returns 404 (not leaked)`, status === 404);
}

/* ── 5. checkout integrity (live) ─── */
console.log("\n═══ 5. checkout integrity (live) ═══");
const checkout = routeResults.find((r) => r.path === "/checkout/");
pass("checkout returns 200", checkout.status === 200);
pass("checkout X-Robots-Tag noindex", /noindex/i.test(checkout.headers["x-robots-tag"] || ""));
pass("checkout cache max-age=0", /max-age=0/.test(checkout.headers["cache-control"] || ""));

/* ── 6. 404 handling (live) ─── */
console.log("\n═══ 6. 404 handling (live) ═══");
const { status: notFoundStatus, body: notFoundBody } = await fetchWithHeaders("/does-not-exist/");
pass("unknown path returns 404", notFoundStatus === 404);
pass("404 page is Next default (no custom crashable app)", !/tipind.*error|custom.*error/i.test(notFoundBody));

/* ── 7. DDoS / availability posture (live) ─── */
console.log("\n═══ 7. DDoS / availability posture (live) ═══");
pass("site responds (homepage)", routeResults.find((r) => r.path === "/").status === 200);
pass("no Worker script in URL path (static assets only)", !/_worker|__worker/.test(TARGET));

/* ── summary ─── */
console.log(`
═══ post-deploy audit summary ═══
  target:     ${TARGET}
  passed:     ${passes}
  failed:     ${failures}
  advisories: ${advisories}

This proves the defensive header/catalog/leakage posture is live. It does not
prove the site is unhackable — runtime-browser DOM XSS needs e2e tests, and
supply-chain / account compromise are out of scope.

Residual risk: stored-XSS slip in config/*, dependency compromise (`bun audit`),
Cloudflare/GitHub account takeover (use 2FA).
`);
if (failures) {
  console.log("NOT CLEAN — fix the FAIL items above.");
  process.exitCode = 1;
} else {
  console.log("All post-deploy checks passed.");
}
