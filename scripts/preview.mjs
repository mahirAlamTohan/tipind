#!/usr/bin/env node
/**
 * Local preview that behaves like the Cloudflare deployment.
 *
 *   node scripts/preview.mjs [--port 8090] [--dir out]
 *
 * Why this exists rather than `npx serve`:
 *
 *   1. It parses public/_headers and applies the SAME Cache-Control and
 *      security headers Cloudflare will apply, so "does my CSP break the page"
 *      is answerable locally instead of after a deploy.
 *   2. It emulates Workers `not_found_handling: "404-page"` — a real 404 status
 *      with the exported 404.html body, not a 200.
 *   3. It logs every request, which makes hydration observable without a
 *      browser: the catalog is fetched ONLY from client JavaScript (an
 *      IntersectionObserver fires after React hydrates), so a
 *      `GET /data/catalog.*.json` line is proof that the client bundle loaded,
 *      parsed and executed.
 *
 * Exits non-zero on a port conflict rather than silently serving nothing.
 */
import { createReadStream } from "node:fs"
import { readFile, stat } from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : fallback
}

const PORT = Number(flag("port", "8090"))
const DIR = path.resolve(ROOT, flag("dir", "out"))
const HOST = "0.0.0.0"

const TYPES = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
}

/* ── _headers parsing ────────────────────────────────────────────────────
   Cloudflare's format: a path pattern on its own line, then indented
   `Name: value` lines. Rules match the REQUEST path and every matching rule
   applies, later ones winning on a duplicate name (Cloudflare comma-joins;
   for a preview, last-wins is the closer approximation of "the more specific
   rule wins", and this file is written so the two agree). */
async function loadRules() {
  let text
  try {
    text = await readFile(path.join(DIR, "_headers"), "utf8")
  } catch {
    return []
  }

  const rules = []
  let current = null
  for (const raw of text.split("\n")) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue
    if (!/^\s/.test(raw)) {
      current = { headers: [], pattern: raw.trim() }
      rules.push(current)
      continue
    }
    const match = /^\s+([\w-]+):\s*(.*)$/.exec(raw)
    if (match && current) current.headers.push([match[1], match[2]])
  }
  return rules
}

/** Cloudflare path patterns support `*` (any run of characters) and `:splat`. */
function toRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
  return new RegExp(`^${escaped}$`)
}

function headersFor(pathname) {
  const applied = new Map()
  for (const rule of rules) {
    if (!toRegExp(rule.pattern).test(pathname)) continue
    for (const [name, value] of rule.headers) {
      if (value.startsWith("!")) applied.delete(name)
      else applied.set(name, value)
    }
  }
  return applied
}

const rules = await loadRules()

/* ── static file resolution ──────────────────────────────────────────── */

async function resolve(pathname) {
  const clean = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "")
  const target = path.join(DIR, clean)
  if (!target.startsWith(DIR)) return null

  try {
    const info = await stat(target)
    if (info.isDirectory()) {
      const index = path.join(target, "index.html")
      if (await stat(index).catch(() => null)) return { file: index, status: 200 }
      return null
    }
    return { file: target, status: 200 }
  } catch {
    // Cloudflare's own behaviour: `/foo` serves `/foo.html` when it exists.
    const html = `${target}.html`
    if (await stat(html).catch(() => null)) return { file: html, status: 200 }
    return null
  }
}

const started = Date.now()
let requests = 0

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)
  const pathname = url.pathname
  requests += 1

  const resolved = await resolve(pathname)

  if (!resolved) {
    const notFound = await readFile(path.join(DIR, "404.html")).catch(() => null)
    const extra = headersFor(pathname)
    extra.set("Content-Type", TYPES[".html"])
    extra.set("Cache-Control", "public, max-age=0, must-revalidate")
    res.writeHead(404, Object.fromEntries(extra))
    res.end(notFound ?? "Not found")
    log(404, pathname)
    return
  }

  const { file, status } = resolved
  const type = TYPES[path.extname(file)] ?? "application/octet-stream"
  const headers = headersFor(pathname)
  if (!headers.has("Content-Type")) headers.set("Content-Type", type)

  const info = await stat(file)
  res.writeHead(status, {
    ...Object.fromEntries(headers),
    "Content-Length": info.size,
  })

  if (req.method === "HEAD") {
    res.end()
    log(status, pathname)
    return
  }
  createReadStream(file)
    .on("error", () => res.destroy())
    .pipe(res)
  log(status, pathname)
})

function log(status, pathname) {
  const colour = status >= 400 ? "\u001b[31m" : "\u001b[32m"
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(
    `  ${colour}${status}\u001b[0m  ${pathname}  \u001b[2m+${elapsed}s\u001b[0m`
  )
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\n  Port ${PORT} is already in use.\n`)
    process.exit(1)
  }
  throw error
})

server.listen(PORT, HOST, () => {
  console.log(`\n  tipind preview — ${requests.toString()} requests so far`)
  console.log(`  serving ${path.relative(ROOT, DIR)}/ with ${rules.length.toString()} _headers rules`)
  console.log(`  http://localhost:${PORT}/\n`)
})
