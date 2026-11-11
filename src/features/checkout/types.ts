import type { SERVICED_COUNTRIES } from "./constants"

export type PaymentMethodId =
  "btc" | "usdt-erc20" | "usdt-trc20" | "eth" | "usdc-erc20"
export type CheckoutStep = "review" | "details"
export type ChannelId = "email" | "whatsapp" | "telegram"
export type ErrorKind = "required" | "email" | "postal" | "region"

export type SERVICED_COUNTRIES_TYPE = typeof SERVICED_COUNTRIES
export type SERVICED_COUNTRY = (typeof SERVICED_COUNTRIES)[number]

export interface PaymentMethod {
  readonly id: PaymentMethodId
  readonly label: string
}

export interface ShippingDetails {
  firstName: string
  lastName: string
  email: string
  company: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  country: SERVICED_COUNTRY
  paymentMethod: PaymentMethodId | ""
  notes: string
}

export type FieldName = keyof ShippingDetails

export interface ChargeLine {
  readonly id: "shipping"
  /** Null means "to be confirmed". */
  readonly amountMills: number | null
}

export interface OrderTotals {
  readonly subtotalMills: number
  readonly charges: readonly ChargeLine[]
  /** Subtotal plus every charge that is already known. */
  readonly totalMills: number
  /** False while any charge is still "to be confirmed". */
  readonly isFinal: boolean
}

export interface CheckoutState {
  details: ShippingDetails
  step: CheckoutStep
  isHydrated: boolean
  actions: {
    setField: (field: FieldName, value: string) => void
    setStep: (step: CheckoutStep) => void
    setCountry: (country: string) => void
    clearDetails: () => void
  }
}

interface FieldCopy {
  readonly label: string
  readonly placeholder: string
}

export interface CheckoutContent {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly loading: string
  readonly emptyTitle: string
  readonly emptyDescription: string
  readonly continueShopping: string
  readonly stepperLabel: string
  readonly steps: {
    readonly review: string
    readonly details: string
    readonly send: string
  }
  readonly review: {
    readonly heading: string
    readonly hint: string
    readonly addMoreAction: string
  }
  readonly details: {
    readonly heading: string
    readonly description: string
    readonly contactHeading: string
    readonly addressHeading: string
    readonly extraHeading: string
    readonly optional: string
    readonly selectPlaceholder: string
    readonly paymentNone: string
    readonly savedNotice: string
    readonly notesHint: string
    readonly clearSaved: string
    readonly noResults: string
    readonly unservicedNotice: string
  }
  readonly fields: Readonly<Record<FieldName, FieldCopy>>
  readonly errors: Readonly<Record<ErrorKind, string>>
  readonly summary: {
    readonly heading: string
    readonly itemSingular: string
    readonly itemPlural: string
    readonly subtotal: string
    readonly shipping: string
    readonly total: string
    readonly pending: string
    readonly continueAction: string
    readonly checkoutAction: string
    readonly backAction: string
    readonly note: string
  }
  readonly dialog: {
    readonly title: string
    readonly description: string
    readonly optionsHeading: string
    readonly pasteHint: string
    readonly messageHeading: string
    readonly copyAction: string
    readonly copiedAction: string
    readonly copyFailed: string
    readonly emailSubject: string
    readonly editAction: string
    readonly finishAction: string
    readonly closeAction: string
  }
  readonly message: {
    readonly itemsHeading: string
    readonly addressHeading: string
    readonly notesHeading: string
    readonly name: string
    readonly email: string
    readonly company: string
    readonly payment: string
    readonly subtotalLabel: string
    readonly shippingLabel: string
    readonly shippingText: string
    readonly orderSeparator: string
  }
}
