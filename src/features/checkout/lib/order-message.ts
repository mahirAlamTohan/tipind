import { cartLineSummary } from "@/features/cart/lib/summary"
import type { CartLineItem } from "@/features/cart/types"
import { formatMills } from "@/lib/format"
import { toSingleLine } from "@/lib/sanitize"

import { checkoutContent } from "../content"
import type { OrderTotals, ShippingDetails } from "../types"
import { findPayment } from "./details"
import { findCountry } from "./countries"

/**
 * Last line of defence for the order message.
 *
 * The schema already strips control characters, but this string is assembled
 * from several sources (cart, sanitised storage, live form state) and is read
 * by a human as an instruction sheet. Flattening line breaks here means a
 * field can never impersonate a section of the message, whatever path the
 * value took to get here.
 */
function inline(value: string) {
  return toSingleLine(value)
}

interface OrderMessageInput {
  details: ShippingDetails
  items: readonly CartLineItem[]
  totals: OrderTotals
}

/** `Label: value`, or nothing when the value is empty. */
const row = (label: string, value: string) =>
  value ? [`${label}: ${inline(value)}`] : []

export function buildOrderMessage({
  details,
  items,
  totals,
}: OrderMessageInput) {
  const m = checkoutContent.message
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
    inline(details.addressLine1),
    ...(details.addressLine2 ? [inline(details.addressLine2)] : []),
    inline(place),
    country?.name ?? "",
    "",
    m.itemsHeading,
    ...items.map(cartLineSummary),
    "",
    ...(details.notes
      ? [m.notesHeading, details.notes.replace(/\n{3,}/g, "\n\n")]
      : []),
    "",
    ...(m.email ? [m.email, details.email] : []),
    "",
    payment?.label ? `Preferred payment: ${payment.label}` : "",
  ].join("\n")
}
