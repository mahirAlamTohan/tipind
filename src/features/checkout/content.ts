import type { CheckoutContent } from "./types"

export const checkoutContent = {
  eyebrow: "Secure checkout",
  title: "Complete your order",
  description:
    "Review your items, add your delivery details, then send the order to our team.",
  loading: "Loading your order…",
  emptyTitle: "Nothing to check out yet",
  emptyDescription:
    "Add products from the catalog to your cart, then come back here.",
  continueShopping: "Browse the catalog",
  stepperLabel: "Checkout progress",
  steps: { review: "Review", details: "Your details", send: "Send order" },
  review: {
    heading: "Review your items",
    hint: "Change quantities or remove items. The summary updates instantly.",
    addMoreAction: "Add more items",
  },
  details: {
    heading: "Delivery details",
    description:
      "We need these to ship internationally. Your details stay on this device until you send the order.",
    contactHeading: "Contact",
    addressHeading: "Shipping address",
    extraHeading: "Preferences",
    optional: "Optional",
    paymentNone: "Decide with the team",
    savedNotice: "Saved on this device as you type, cleared when you finish.",
    notesHint:
      "Delivery instructions only — please don’t include medical or prescription details.",
    clearSaved: "Clear saved details",
    noResults: "No matches",
    showOptionsLabel: "Show options",
  },
  fields: {
    firstName: { label: "First name", placeholder: "Jane" },
    lastName: { label: "Last name", placeholder: "Doe" },
    email: { label: "Email address", placeholder: "jane@example.com" },
    company: { label: "Company", placeholder: "Company name" },
    addressLine1: {
      label: "Street address",
      placeholder: "House number and street",
    },
    addressLine2: {
      label: "Apartment, suite, unit",
      placeholder: "Apartment, suite, etc.",
    },
    city: { label: "City / town", placeholder: "City" },
    region: { label: "State / region", placeholder: "State or region" },
    postalCode: { label: "Postal code", placeholder: "Postal code" },
    country: { label: "Country", placeholder: "Select a country" },
    paymentMethod: {
      label: "Preferred payment method",
      placeholder: "Select…",
    },
    notes: {
      label: "Delivery instructions",
      placeholder: "e.g. leave with the concierge, gate code",
    },
  },
  errors: {
    required: "This field is required.",
    email: "Enter a valid email address.",
    postal: "Enter a valid postal code for {country}.",
    region: "Choose a valid option from the list.",
  },
  summary: {
    heading: "Order summary",
    itemSingular: "item",
    itemPlural: "items",
    subtotal: "Subtotal",
    shipping: "shipping",
    total: "Estimated total",
    pending: "To be confirmed",
    continueAction: "Continue",
    checkoutAction: "Checkout",
    backAction: "Back to items",
    note: "No payment is taken on this site. Our team confirms availability, VAT and cargo before anything is charged.",
  },
  dialog: {
    title: "Your order is almost complete!",
    description:
      "Follow the steps below to finalize and send your order details.",
    optionsHeading: "ORDERING INSTRUCTIONS",
    stepCopyTemplate:
      "Click “Copy message” below to copy your pre-filled order template.",
    stepSend: "Send your copied details through our official channels:",
    emailLabel: "Email (Preferred):",
    telegramLabel: "Telegram:",
    safetyTitle: "Telegram Safety Tip:",
    safetyBody:
      "Beware of fake impersonator accounts with subtle typos. Double-check the handle, or use Email for maximum security.",
    messageHeading: "Your message",
    copyAction: "Copy message",
    copiedAction: "Copied",
    copyFailed: "Couldn't copy. Select the text and copy it manually.",
    editAction: "Edit details",
    finishAction: "Clear cart and finish",
    closeAction: "Close",
  },
  message: {
    itemsHeading: "ITEMS",
    addressHeading: "SHIPPING ADDRESS",
    notesHeading: "NOTES",
    name: "Name",
    email: "Main email",
    company: "Company",
    subtotalLabel: "order subtotal",
    shippingLabel: "order+shipping",
    shippingText:
      "will be calculated at checkout and you will informed how many separate parcels will be shipped.",
    orderSeparator: "ORDER------",
  },
} satisfies CheckoutContent
