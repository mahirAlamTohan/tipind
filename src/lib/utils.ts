/**
 * `cn` comes from the precompiled `cn` package (a drop-in for clsx +
 * tailwind-merge). Everything in the app imports it from here so there is one
 * class-merging implementation; `components/ui/tooltip.tsx` used to import the
 * package directly, which meant two different merge orders in one tree.
 */
export { cn } from "cn"

import type { CountryCode } from "libphonenumber-js"

/* ── env helpers ──────────────────────────────────────────────────────────── */

/**
 * A public env value, or the fallback when unset/blank.
 */
function publicValue(value: string | undefined, fallback = "") {
  const trimmed = value?.trim()
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must fall through; `??` would keep "".
  return trimmed ? trimmed : fallback
}

/** An env value that must be HTTPS; throws at build time if it is not. */
function publicSiteUrl(value: string | undefined, fallback: string) {
  const url = new URL(publicValue(value, fallback))
  if (url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS.")
  }
  return url.origin
}

/** `2012` / `"2012"` → 2012. Rejects anything that is not a plausible year. */
function publicYear(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(publicValue(value), 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < 1800 || parsed > 2200) {
    throw new Error(
      `NEXT_PUBLIC_FOUNDED_YEAR must be a four-digit year, got "${String(value)}".`
    )
  }
  return parsed
}

/** Comma-separated ISO country codes → validated list. */
function publicCountryCodes(
  value: string | undefined,
  fallback: readonly CountryCode[]
) {
  const raw = publicValue(value)
  if (!raw) return fallback
  return raw
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean) as CountryCode[]
}

/* ── stored-XSS guardrails ───────────────────────────────────────────────── */
const HTML_SCRIPT_RE = /[<>&"']/ // any character that can break out of HTML text or an attribute
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // eslint-disable-line regexp/no-super-linear-backtracking
// Telegram usernames: 5–32 chars, alphanumeric + underscores only
const TELEGRAM_RE = /^\w{5,32}$/

/** Rejects any value that could break out of HTML text or an attribute. */
function noHtml(value: string | undefined, label: string) {
  const raw = publicValue(value)
  if (raw && HTML_SCRIPT_RE.test(raw)) {
    throw new Error(
      `${label} contains HTML-breaking characters (<, >, &, ", '). Refusing to build.`
    )
  }
  return raw
}

/** Validates an email address shape; rejects anything that could inject into a mailto: href. */
function safeEmail(value: string | undefined, label: string) {
  const raw = publicValue(value)
  if (!raw) return raw
  if (!EMAIL_RE.test(raw) || HTML_SCRIPT_RE.test(raw)) {
    throw new Error(
      `${label} is not a safe email address: "${raw}". Refusing to build.`
    )
  }
  return raw
}

/** Validates a Telegram username shape; rejects anything that could inject into a t.me/ href. */
function safeTelegram(value: string | undefined, label: string) {
  const raw = publicValue(value)
  if (!raw) return raw
  // Strip a single leading "@" — the same normalization the raw value had before.
  const username = raw.replace(/^@/, "")
  if (!TELEGRAM_RE.test(username)) {
    throw new Error(
      `${label} is not a safe Telegram username: "${raw}". Refusing to build.`
    )
  }
  return username
}

export {
  publicValue,
  publicSiteUrl,
  publicYear,
  publicCountryCodes,
  noHtml,
  safeEmail,
  safeTelegram,
}
