import { cartLineSummary } from "@/features/cart/lib/summary"
import type { CartLineItem } from "@/features/cart/types"
import { formatMills } from "@/lib/format"

import { checkoutContent } from "../content"
import type { OrderTotals, ShippingDetails } from "../types"
import { findPayment } from "./details"
import { findCountry } from "./countries"

interface OrderMessageInput {
  details: ShippingDetails
  items: readonly CartLineItem[]
  totals: OrderTotals
}

/** `Label: value`, or nothing when the value is empty. */
const row = (label: string, value: string) =>
  value ? [`${label}: ${value}`] : []

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
    details.addressLine1,
    ...(details.addressLine2 ? [details.addressLine2] : []),
    place,
    country?.name ?? "",
    "",
    m.itemsHeading,
    ...items.map(cartLineSummary),
    "",
    ...(details.notes ? [m.notesHeading, details.notes] : []),
    "",
    ...(m.email ? [m.email, details.email] : []),
    "",
    payment?.label ? `Preferred payment: ${payment.label}` : "",
  ].join("\n")
}
