"use client"

import { ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { siteContent } from "@/config/content"
import { cn } from "@/lib/utils"

import { SIDEBAR_ID } from "../constants"
import { useCartStore, selectPacketCount } from "../cart-store"

export function CartTrigger({ className }: { className?: string }) {
  const count = useCartStore(selectPacketCount)
  const isHydrated = useCartStore((state) => state.isHydrated)
  const isOpen = useCartStore((state) => state.isOpen)
  const toggle = useCartStore((state) => state.actions.toggle)

  const label = siteContent.ui.cartAction
  const showCount = isHydrated && count > 0

  return (
    <Button
      aria-controls={SIDEBAR_ID}
      aria-expanded={isOpen}
      aria-label={showCount ? `${label} (${count.toString()})` : label}
      className={cn("relative size-9 md:h-10 md:w-auto md:px-3", className)}
      onClick={toggle}
      size="icon"
      title={label}
      variant="outline"
    >
      <ShoppingCart aria-hidden="true" />
      <span className="hidden md:inline">{label}</span>
      {showCount && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.58rem] leading-5 font-extrabold text-primary-foreground shadow-sm"
        >
          {count > 99 ? "99+" : count.toString()}
        </span>
      )}
    </Button>
  )
}
