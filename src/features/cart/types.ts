import type { CatalogProduct } from "../catalog/types"

// main cart types
export interface CartLineItem {
  readonly id: string
  readonly name: string
  readonly ingredient: string
  readonly manufacturer: string
  readonly packaging: string
  /** Dosage form / unit type (e.g. "tablet", "capsule", "injection"). */
  readonly type: string
  /** Price of one packet in mills (1/1000 USD). */
  readonly unitPriceMills: number
  readonly quantity: number
}

export type LineItemDetails = Omit<CartLineItem, "id" | "quantity">

// store types
interface CartActions {
  addProduct: (product: CatalogProduct) => boolean
  setQuantity: (id: string, quantity: number) => void
  setWidth: (width: number) => void
  removeItem: (id: string) => void
  clear: () => void
  setOpen: (open: boolean) => void
  toggle: () => void
}

export interface CartState {
  items: readonly CartLineItem[]
  isOpen: boolean
  /** False until the saved cart has been read (avoids hydration mismatch). */
  isHydrated: boolean
  isStorageAvailable: boolean
  actions: CartActions
  width: number
}

// content types
export interface CartContent {
  eyebrow: string
  title: string
  description: string
  cartNotice: string
  emptyTitle: string
  emptyDescription: string
  resizeAriaLabel: string
  browseCatalogAction: string
  productsHeading: string
  unitPriceLabel: string
  quantityLabel: string
  lineTotalLabel: string
  totalLabel: string
  packPriceNote: string
  clearAction: string
  closeAction: string
  continueBrowsingAction: string
  singlePacketPriceLabel: string
  packLabel: string
  packetCountLabel: string
  copyAction: string
  copiedMessage: string
  copyFailureMessage: string
  loadingCartMessage: string
  storageUnavailableNotice: string
  removeItemAriaLabel: string
  decreaseQuantityAriaLabel: string
  increaseQuantityAriaLabel: string
  setQuantityAriaLabel: string
  proceedToCheckoutAction: string
}
