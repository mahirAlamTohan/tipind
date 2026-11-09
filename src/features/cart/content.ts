import type { CartContent } from "./types"

export const cartContent = {
  eyebrow: "Shopping cart",
  title: "Your cart",
  description:
    "Review your selected products and quantities before proceeding to checkout.",
  cartNotice:
    "Prices are based on the listed catalog rates. Product availability, final pricing, shipping costs, and payment options will be confirmed during order confirmation.",
  emptyTitle: "Your cart is empty",
  emptyDescription:
    "Browse our product catalog and add items to your cart to get started.",
  resizeAriaLabel: "Resize the cart sidebar",
  productsHeading: "Cart items",
  lineTotalLabel: "Line total",
  totalLabel: "Cart subtotal",
  singlePacketPriceLabel: "Price per packet",
  packLabel: "Pack",
  packPriceNote: "Prices are based on the listed catalog rate for each pack.",
  clearAction: "Clear cart",
  closeAction: "Close cart",
  packetCountLabel: "Total packets",
  loadingCartMessage: "Loading your cart…",
  storageUnavailableNotice:
    "Browser storage is unavailable. Your cart will remain available only until you close this tab.",
  removeItemAriaLabel: "Remove {product} from your cart",
  decreaseQuantityAriaLabel: "Decrease quantity for {product}",
  increaseQuantityAriaLabel: "Increase quantity for {product}",
  setQuantityAriaLabel: "Set quantity for {product}",
  proceedToCheckoutAction: "Proceed to checkout",
  productSingular: "product",
  productPlural: "products",
  packetSingular: "packet",
  packetPlural: "packets",
  listedPackLabel: "listed pack",
  clearedToastTitle: "Cart cleared",
  packetTotalNote: "{count} total",
} satisfies CartContent
