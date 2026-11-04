import type { PaymentMethod, SERVICED_COUNTRY } from "./types"
import { DELIVERY_COUNTIES, NEED_OR_HAS_REGION } from "@/config/site"

export const STORAGE_KEY = "tipind:checkout:v1"
export const STORAGE_VERSION = 1
export const FORM_ID = "checkout-details-form"
export const MAX_FIELD_LENGTH = 200
export const MAX_NOTES_LENGTH = 1_000

/** Cargo fee by ISO country code, in mills (15_000 = $15.000). Missing = "To be confirmed". */
export const SHIPPING_MILLS: ReadonlyMap<string, number> = new Map<
  string,
  number
>([
  // ["US", 15_000],
])

/** Countries you actively ship to. Others can order, but see a notice. */
export const SERVICED_COUNTRIES = DELIVERY_COUNTIES

/** Countries where an address needs a state or province. */
export const REGION_REQUIRED = new Set<SERVICED_COUNTRY>(NEED_OR_HAS_REGION)

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: "btc", label: "Bitcoin (BTC)" },
  { id: "usdt-trc20", label: "USDT (TRC-20)" },
  { id: "usdt-erc20", label: "USDT (ERC-20)" },
  { id: "eth", label: "Ethereum (ETH)" },
  { id: "usdc-erc20", label: "USDC (ERC-20)" },
]
