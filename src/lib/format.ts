const price = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 3,
  minimumFractionDigits: 3,
  style: "currency",
})
const integer = new Intl.NumberFormat("en-US")

/** A mill is 1/1000 of a dollar. Prices are stored as whole mills. */
export function formatMills(mills: number) {
  return price.format(mills / 1000)
}

export function formatNumber(value: number) {
  return integer.format(value)
}

export function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural
}

/** Replaces `{key}` placeholders in content strings. */
export function formatMessage(
  template: string,
  values: Readonly<Record<string, string>>
) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template
  )
}

// C0/C1 controls except tab, newline and carriage return.
// eslint-disable-next-line no-control-regex, regexp/control-character-escape -- stripping control characters is the point
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g

/** Drops control characters (tabs, bells, BOMs) but keeps line breaks. */
export function stripControl(value: string) {
  return value.replace(CONTROL, "")
}

/**
 * Text that must occupy exactly one line: control characters removed, every
 * whitespace run (including U+2028) collapsed, ends trimmed. Used for names,
 * addresses and anything pasted into the order message.
 */
export function toSingleLine(value: string) {
  return stripControl(value).replace(/\s+/g, " ").trim()
}

/** Lowercases and strips diacritics. */
export function normalizeText(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
}

/** Normalized text with every space and symbol removed ("A. S Life" -> "aslife"). */
export function compactText(value: string) {
  return normalizeText(value).replace(/[^\p{L}\p{N}]/gu, "")
}
