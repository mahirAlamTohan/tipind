import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

interface CardProps extends ComponentProps<"div"> {
  size?: "default" | "sm"
}

function Card({ className, size = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-card ring-1 ring-border [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl",
        className
      )}
      data-size={size}
      data-slot="card"
      {...props}
    />
  )
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("px-(--card-spacing)", className)}
      data-slot="card-content"
      {...props}
    />
  )
}

export { Card, CardContent }
