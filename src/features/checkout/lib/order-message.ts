import { cartLineSummary } from "@/features/cart/lib/summary"
import type { CartLineItem } from "@/features/cart/types"
import { formatMills, toSingleLine } from "@/lib/format"

import { checkoutContent } from "../content"
import type { OrderTotals, ShippingDetails } from "../types"
import { findCountry } from "./countries"
import { findPayment } from "./details"

interface OrderMessageInput {
  details: ShippingDetails
  items: readonly CartLineItem[]
  totals: OrderTotals
}

/**
 * One line, no forged section markers. Everything the buyer can influence
 * (including a hand-edited localStorage value and a product name from the
 * catalog) passes through here before it becomes part of the message, so a
 * newline can never start a fake "ORDER------" block or a second address.
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

export function buildOrderMessage({
  details,
  items,
  totals,
}: OrderMessageInput) {
  const m = checkoutContent.message
  // Structural words are removed from anything the buyer or the catalog can
  // influence, so no value can imitate a heading even on a single line.
  const clean = scrubber([
    m.orderSeparator,
    m.addressHeading,
    m.itemsHeading,
    m.notesHeading,
    m.subtotalLabel,
    m.shippingLabel,
  ])
  const country = findCountry(details.country)
  const payment = findPayment(details.paymentMethod)

  /** `Label: value`, or nothing when the value is empty. */
  const row = (label: string, value: string) => {
    const safe = clean(value)
    return safe ? [`${label}: ${safe}`] : []
  }

  const place = clean(
    [
      details.city,
      [details.region, details.postalCode].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ")
  )
  const addressLine1 = clean(details.addressLine1)
  const addressLine2 = clean(details.addressLine2)
  const notes = clean(details.notes)

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
    addressLine1,
    ...(addressLine2 ? [addressLine2] : []),
    place,
    clean(country?.name ?? ""),
    "",
    m.itemsHeading,
    ...items.map((item) => clean(cartLineSummary(item))),
    "",
    ...(notes ? [m.notesHeading, notes] : []),
    "",
    ...(m.email ? [m.email, clean(details.email)] : []),
    "",
    payment?.label ? `Preferred payment: ${clean(payment.label)}` : "",
  ].join("\n")
}
