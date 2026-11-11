/**
 * Text sanitisation for visitor-supplied strings.
 *
 * These helpers work on code points rather than a regular expression full of
 * literal control characters. That is deliberate:
 *
 *  - `no-control-regex` exists because such patterns are easy to get subtly
 *    wrong and hard to review — you cannot see what is in them.
 *  - The ranges below are expressed as numbers, so the intent is readable.
 *
 * What gets removed and why:
 *
 *  C0/C1 controls (0x00–0x1F, 0x7F–0x9F)
 *      The order message is plain text read by a human in WhatsApp. A newline
 *      or carriage return inside a name lets the visitor write their own lines
 *      into that message, e.g. `Doe\n\nPreferred payment: wire to 12345678`,
 *      which reads as though the shop wrote it.
 *
 *  Bidirectional overrides (U+202A–U+202E, U+2066–U+2069)
 *      These reorder displayed text, so a stored name can render as something
 *      other than its bytes ("trojan source" style spoofing).
 *
 *  Zero-width characters and BOM (U+200B–U+200F, U+FEFF)
 *      Invisible in every UI, so they survive review while changing the value.
 */

const isControl = (code: number) =>
  code <= 0x1f || (code >= 0x7f && code <= 0x9f)

const isBidiOverride = (code: number) =>
  (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)

const isZeroWidth = (code: number) =>
  (code >= 0x200b && code <= 0x200f) || code === 0xfeff

/** Newline and tab, kept only where multi-line text is expected. */
const isAllowedBreak = (code: number) => code === 0x0a || code === 0x09

/**
 * Removes invisible and layout-breaking characters.
 *
 * @param value        raw visitor input
 * @param allowLines   keep `\n` and `\t` (free-text areas only)
 */
export function stripControlChars(value: string, allowLines = false) {
  let out = ""
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (isControl(code)) {
      if (allowLines && isAllowedBreak(code)) out += char
      else if (allowLines && code === 0x0d) out += "\n" // normalise CRLF input
      continue
    }
    if (isBidiOverride(code) || isZeroWidth(code)) continue
    out += char
  }
  return out
}

/** Collapses any line break into a single space, for single-line fields. */
export function toSingleLine(value: string) {
  return stripControlChars(value).replace(/\s+/g, " ").trim()
}
