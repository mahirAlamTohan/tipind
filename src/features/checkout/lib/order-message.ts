import { cartLineSummary } from "@/features/cart/lib/summary"
import type { CartLineItem } from "@/features/cart/types"
import { formatMills } from "@/lib/format"

import { siteConfig } from "@/config/site"
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

  const emailLine = siteConfig.contact.email
    ? `${m.email}: [${siteConfig.contact.email}](${siteConfig.contact.emailHref})`
    : ""

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
    ...(emailLine ? [emailLine] : []),
    "",
    "```",
    `Preferred payment: ${payment?.label ?? ""}`,
    "```",
  ].join("\n")
}
