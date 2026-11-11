import { cartLineSummary } from "@/features/cart/lib/summary"
import type { CartLineItem } from "@/features/cart/types"
import { formatMills } from "@/lib/format"
import { toSingleLine } from "@/lib/sanitize"

import { checkoutContent } from "../content"
import type { OrderTotals, ShippingDetails } from "../types"
import { findPayment } from "./details"
import { findCountry } from "./countries"

/**
 * One line, and no structural words. Anything the buyer can influence (notes,
 * a hand-edited localStorage value) or the catalog can inject (product names)
 * passes through here, so no value can imitate a heading of the message.
 */
function scrubber(markers: readonly string[]) {
  return (value: string) => {
    let safe = toSingleLine(value)
    for (const marker of markers) {
      if (marker) safe = safe.replaceAll(marker, " ")
    }
    return safe.replace(/\s+/g, " ").trim()
  }
}

interface OrderMessageInput {
  details: ShippingDetails
  items: readonly CartLineItem[]
  totals: OrderTotals
}

export function buildOrderMessage({
  details,
  items,
  totals,
}: OrderMessageInput) {
  const m = checkoutContent.message
  const clean = scrubber([
    m.orderSeparator,
    m.addressHeading,
    m.itemsHeading,
    m.notesHeading,
    m.subtotalLabel,
    m.shippingLabel,
  ])
  /** `Label: value`, or nothing when the value is empty. */
  const row = (label: string, value: string) => {
    const safe = clean(value)
    return safe ? [`${label}: ${safe}`] : []
  }
  const country = findCountry(details.country)
  const payment = findPayment(details.paymentMethod)
  const place = [
    details.city,
    [details.region, details.postalCode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ")

  return [
    `${m.subtotalLabel}: ${formatMills(totals.subtotalMills)}`,
    `${m.shippingLabel}: ${m.shippingText}`,
    "",
    m.orderSeparator,
    "",
    ...row(m.name, `${details.firstName} ${details.lastName}`.trim()),
    ...row(m.company, details.company),
    "",
    m.addressHeading,
    clean(details.addressLine1),
    ...(details.addressLine2 ? [clean(details.addressLine2)] : []),
    clean(place),
    clean(country?.name ?? ""),
    "",
    m.itemsHeading,
    ...items.map((item) => clean(cartLineSummary(item))),
    "",
    ...(clean(details.notes) ? [m.notesHeading, clean(details.notes)] : []),
    "",
    ...(m.email ? [m.email, clean(details.email)] : []),
    "",
    payment?.label ? `Preferred payment: ${payment.label}` : "",
  ].join("\n")
}
