#!/usr/bin/env node
/**
 * Load / stress harness for the static export. No dependencies, Node >= 20.
 *
 *   node scripts/loadtest.mjs --target https://tipind.mahiralamtohan.workers.dev
 *   node scripts/loadtest.mjs --scenario burst --requests 5000 --concurrency 200
 *   node scripts/loadtest.mjs --scenario soak --duration 60 --rate 50
 *   node scripts/loadtest.mjs --scenario catalog --requests 500
 *
 * Scenarios
 *   cold      Every resource a first visit fetches (HTML, JS, CSS, fonts, hero,
 *             catalog). This is the number a new visitor actually pays.
 *   catalog   The catalog artifact alone. It is the biggest single transfer and
 *             the one a Cloudflare cache miss hurts most.
 *   burst     Fixed request count at a fixed concurrency. Finds the cliff.
 *   soak      Fixed rate for a duration. Finds leaks and slow degradation.
 *
 * Flags
 *   --target <url>        Base URL (default: the production deployment).
 *   --scenario <name>     cold | catalog | burst | soak        (default: cold)
 *   --requests <n>        Request budget for cold/catalog/burst (default 200)
 *   --concurrency <n>     Parallel in-flight requests          (default 50)
 *   --duration <s>        Seconds for soak                     (default 30)
 *   --rate <n>            Requests per second for soak         (default 50)
 *   --max-error-rate <r>  Fail (exit 1) above this 0..1 ratio   (default 0.01)
 *   --max-p95 <ms>        Fail (exit 1) above this p95         (default 0 = off)
 *   --json                Machine-readable output
 *
 * Exit codes: 0 pass, 1 threshold breached, 2 usage/connection error.
 *
 * WHAT THIS CANNOT TELL YOU (read before trusting a number)
 * ---------------------------------------------------------
 * Pointing this at a local static server is a smoke test, not a benchmark. A
 * localhost run has no TLS handshake, no DNS, no geographic RTT, no CDN cache
 * and no cold start, so it reports single-digit milliseconds and passes every
 * threshold. The only runs that mean anything are against the deployed URL:
 *
 *     npm run loadtest -- --target https://tipind.mahiralamtohan.workers.dev
 *
 * And even then, remember the deployment is an assets-only Worker: Cloudflare
 * serves the bytes and the real ceiling is the visitor's connection, not this
 * machine. What these scenarios are actually good for:
 *
 *   - catching a cache-header regression (a burst that suddenly logs
 *     cf-cache-status: MISS shows up as a latency cliff),
 *   - confirming the 404/error rate stays at zero under concurrency,
 *   - measuring the real cold-visit transfer from a real edge location,
 *   - proving a deploy did not break a route.
 *
 * A localhost run is only useful for "did I break the server", which is why
 * the harness labels the target and refuses to present local results as a
 * capacity number.
 */

const DEFAULTS = {
  concurrency: 50,
  duration: 30,
  maxErrorRate: 0.01,
  maxP95: 0,
  rate: 50,
  requests: 200,
  scenario: "cold",
  target: "https://tipind.mahiralamtohan.workers.dev",
}

function parseArgs(argv) {
  const args = { ...DEFAULTS, json: false }
  const alias = {
    c: "concurrency",
    d: "duration",
    n: "requests",
    r: "rate",
    s: "scenario",
    t: "target",
  }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (!token.startsWith("--")) continue
    let name = token.slice(2)
    if (alias[name]) name = alias[name]
    if (name === "json") {
      args.json = true
      continue
    }
    if (name === "help") {
      args.help = true
      continue
    }
    const value = argv[i + 1]
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`)
    }
    i++
    const numeric = [
      "concurrency",
      "duration",
      "max-error-rate",
      "max-p95",
      "rate",
      "requests",
    ]
    if (numeric.includes(name)) {
      const parsed = Number(value)
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`--${name} must be a non-negative number, got ${value}`)
      }
      if (name === "max-error-rate") args.maxErrorRate = parsed
      else if (name === "max-p95") args.maxP95 = parsed
      else args[name.replace(/-/g, "")] = parsed
    } else {
      args[name] = value
    }
  }
  return args
}

/* ── percentiles ─────────────────────────────────────────────────────── */

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  )
  return sorted[index]
}

function summarize(samples) {
  const ok = samples.filter((sample) => sample.ok)
  const latencies = ok.map((sample) => sample.ms).sort((a, b) => a - b)
  const bytes = ok.reduce((sum, sample) => sum + sample.bytes, 0)
  return {
    bytes,
    errorRate: samples.length === 0 ? 0 : 1 - ok.length / samples.length,
    failures: samples.length - ok.length,
    max: latencies.at(-1) ?? 0,
    mean:
      latencies.length === 0
        ? 0
        : latencies.reduce((sum, value) => sum + value, 0) / latencies.length,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    samples: samples.length,
  }
}

/* ── HTTP ────────────────────────────────────────────────────────────── */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function hit(url, timeoutMs = 30_000) {
  const started = performance.now()
  try {
    const response = await fetch(url, {
      // Ask for compression so `content-length` reflects real wire bytes.
      headers: {
        "accept-encoding": "gzip, br",
        "user-agent": "tipind-loadtest/1.0",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    })
    // Read the body: a request is only finished once the bytes arrive.
    const body = await response.arrayBuffer()
    const declared = Number(response.headers.get("content-length"))
    return {
      // content-length is the compressed size; the body we decode is not.
      bytes: Number.isFinite(declared) && declared > 0 ? declared : body.byteLength,
      ms: performance.now() - started,
      ok: response.ok,
      status: response.status,
    }
  } catch (error) {
    return {
      bytes: 0,
      error: error instanceof Error ? error.message : String(error),
      ms: performance.now() - started,
      ok: false,
      status: 0,
    }
  }
}

const absolute = (target, path) => new URL(path, target).toString()

/* ── discovery: what a cold visit really fetches ─────────────────────── */

async function discoverColdResources(target) {
  const response = await fetch(target, { redirect: "follow" })
  if (!response.ok) {
    throw new Error(`Target returned ${response.status.toString()} for ${target}`)
  }
  const html = await response.text()
  const collect = (pattern) =>
    [...html.matchAll(pattern)].map((match) => match[1]).filter(Boolean)

  const resources = new Set(["/"])

  // Attribute order varies (`href` before or after `as`/`rel`), so read each
  // <link> tag as a whole and pick out the attributes we care about.
  for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
    const href = /\bhref="([^"]+)"/.exec(tag)?.[1]
    if (!href) continue
    const rel = (/\brel="([^"]*)"/.exec(tag)?.[1] ?? "").toLowerCase()
    const as = (/\bas="([^"]*)"/.exec(tag)?.[1] ?? "").toLowerCase()
    const wanted =
      rel.split(/\s+/).some((value) =>
        ["icon", "manifest", "stylesheet", "apple-touch-icon", "preload"].includes(value)
      ) && (rel.includes("stylesheet") || rel.includes("icon") || rel.includes("manifest") || ["font", "image", "script", "style"].includes(as))
    if (wanted) resources.add(href)
  }

  for (const source of collect(/<script[^>]+src="([^"]+)"/g)) resources.add(source)

  // The catalog URL is baked into the JS bundle, not the HTML.
  const bundleText = await Promise.all(
    [...resources]
      .filter((path) => path.endsWith(".js"))
      .map(async (path) => {
        try {
          return await (await fetch(absolute(target, path))).text()
        } catch {
          return ""
        }
      })
  ).then((chunks) => chunks.join("\n"))

  for (const match of bundleText.matchAll(/["'](\/(?:data|assets)\/[^"']+\.dat)["']/g)) {
    resources.add(match[1])
  }
  return [...resources]
}

/* ── scenarios ───────────────────────────────────────────────────────── */

async function runCold(args) {
  const resources = await discoverColdResources(args.target)
  const started = performance.now()
  const samples = await Promise.all(
    resources.map((path) => hit(absolute(args.target, path)))
  )
  const wall = performance.now() - started
  return {
    extra: {
      parallelWallMs: Number(wall.toFixed(1)),
      resources,
    },
    samples,
    title: `cold first load (${resources.length.toString()} resources)`,
  }
}

async function runCatalog(args) {
  const resources = await discoverColdResources(args.target)
  const catalog = resources.find((path) => path.endsWith(".dat"))
  if (!catalog) throw new Error("No catalog artifact found in the build output")
  const samples = []
  for (let i = 0; i < args.requests; i += args.concurrency) {
    const batch = Math.min(args.concurrency, args.requests - i)
    samples.push(
      ...(await Promise.all(
        Array.from({ length: batch }, () => hit(absolute(args.target, catalog)))
      ))
    )
  }
  return { extra: { resource: catalog }, samples, title: `catalog artifact x${args.requests.toString()}` }
}

async function runBurst(args) {
  const samples = []
  let issued = 0
  const started = performance.now()

  async function worker() {
    while (issued < args.requests) {
      issued++
      samples.push(await hit(args.target))
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(args.concurrency, args.requests) }, worker)
  )
  const seconds = (performance.now() - started) / 1000
  return {
    extra: { rps: Number((samples.length / seconds).toFixed(1)), seconds: Number(seconds.toFixed(2)) },
    samples,
    title: `burst ${args.requests.toString()} @ ${args.concurrency.toString()} conns`,
  }
}

async function runSoak(args) {
  const samples = []
  const total = Math.max(1, Math.round(args.rate * args.duration))
  const interval = 1000 / args.rate
  const start = performance.now()
  const pending = new Set()

  for (let i = 0; i < total; i++) {
    const due = start + i * interval
    const wait = due - performance.now()
    if (wait > 0) await sleep(wait)
    const task = hit(args.target).then((sample) => {
      samples.push(sample)
      pending.delete(task)
    })
    pending.add(task)
  }
  await Promise.all(pending)

  const seconds = (performance.now() - start) / 1000
  return {
    extra: { rps: Number((samples.length / seconds).toFixed(1)), seconds: Number(seconds.toFixed(2)) },
    samples,
    title: `soak ${args.duration.toString()}s @ ${args.rate.toString()} rps`,
  }
}

/* ── output ──────────────────────────────────────────────────────────── */

const ms = (value) => `${value.toFixed(1).padStart(8)} ms`
const pct = (value) => `${(value * 100).toFixed(2).padStart(6)}%`

const isLocal = (target) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(target)

function report(result, args) {
  const stats = summarize(result.samples)
  const verdict =
    stats.errorRate > args.maxErrorRate ||
    (args.maxP95 > 0 && stats.p95 > args.maxP95)
      ? "FAIL"
      : "PASS"

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          extra: result.extra,
          scenario: args.scenario,
          stats,
          localTarget: isLocal(args.target),
          target: args.target,
          title: result.title,
          verdict,
        },
        null,
        2
      )
    )
    return verdict
  }

  console.log(`\n  ${result.title}`)
  console.log(`  target          ${args.target}`)
  if (isLocal(args.target)) {
    console.log(
      "  ⚠ LOCAL TARGET: no TLS, no CDN, no network latency. These numbers are a\n" +
        "    smoke test only. Re-run against the deployed URL for anything real."
    )
  }
  console.log(`  requests        ${stats.samples.toString()}`)
  console.log(`  failures        ${stats.failures.toString()}  (${pct(stats.errorRate)})`)
  console.log(`  transferred     ${(stats.bytes / 1024 / 1024).toFixed(2)} MiB`)
  if (result.extra.rps !== undefined) {
    console.log(`  throughput      ${result.extra.rps.toString()} req/s over ${String(result.extra.seconds)}s`)
  }
  if (result.extra.parallelWallMs !== undefined) {
    console.log(`  parallel wall   ${String(result.extra.parallelWallMs)} ms`)
  }
  console.log(`  latency  mean ${ms(stats.mean)}`)
  console.log(`           p50  ${ms(stats.p50)}`)
  console.log(`           p95  ${ms(stats.p95)}`)
  console.log(`           p99  ${ms(stats.p99)}`)
  console.log(`           max  ${ms(stats.max)}`)
  if (Array.isArray(result.extra.resources)) {
    console.log(`\n  resources`)
    for (const path of result.extra.resources) console.log(`    ${path}`)
  }
  console.log(
    `\n  ${verdict}  (limits: error <= ${pct(args.maxErrorRate).trim()}${
      args.maxP95 > 0 ? `, p95 <= ${args.maxP95.toString()} ms` : ""
    })\n`
  )
  return verdict
}

function usage() {
  console.log(
    [
      "Usage: node scripts/loadtest.mjs [--target <url>] [--scenario cold|catalog|burst|soak]",
      "",
      "  --requests <n>        cold/catalog/burst request budget (default 200)",
      "  --concurrency <n>     parallel connections               (default 50)",
      "  --duration <s>        soak length                        (default 30)",
      "  --rate <n>            soak requests per second           (default 50)",
      "  --max-error-rate <r>  fail above this ratio              (default 0.01)",
      "  --max-p95 <ms>        fail above this p95                (default off)",
      "  --json                machine-readable output",
      "",
      "The default target is the production deployment. Use a preview URL for",
      "staging, or a local static server for a baseline with no CDN in front.",
    ].join("\n")
  )
}

async function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`\n  ${error instanceof Error ? error.message : String(error)}\n`)
    usage()
    process.exitCode = 2
    return
  }
  if (args.help) {
    usage()
    return
  }
  if (!args.target.startsWith("http")) {
    console.error("  --target must start with http:// or https://")
    process.exitCode = 2
    return
  }

  const runner = {
    burst: runBurst,
    catalog: runCatalog,
    cold: runCold,
    soak: runSoak,
  }[args.scenario]
  if (!runner) {
    console.error(`  Unknown scenario: ${args.scenario}`)
    process.exitCode = 2
    return
  }

  let result
  try {
    result = await runner(args)
  } catch (error) {
    console.error(
      `\n  Could not run scenario "${args.scenario}": ${
        error instanceof Error ? error.message : String(error)
      }\n`
    )
    process.exitCode = 2
    return
  }

  process.exitCode = report(result, args) === "FAIL" ? 1 : 0
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 2
})
