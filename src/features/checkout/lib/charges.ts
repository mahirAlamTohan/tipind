import { SHIPPING_MILLS } from "../constants"
import type { ChargeLine, OrderTotals, SERVICED_COUNTRY } from "../types"

export function computeTotals(
  subtotalMills: number,
  country: SERVICED_COUNTRY
): OrderTotals {
  const shipping = SHIPPING_MILLS.get(country) ?? null

  const charges: ChargeLine[] = [{ amountMills: shipping, id: "shipping" }]

  return {
    charges,
    isFinal: charges.every((charge) => charge.amountMills !== null),
    subtotalMills,
    totalMills:
      subtotalMills +
      charges.reduce((sum, charge) => sum + (charge.amountMills ?? 0), 0),
  }
}
