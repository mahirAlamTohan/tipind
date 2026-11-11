"use client"

import { Button as BaseButton } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import Link from "next/link"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * Hover lift and press squish are pure CSS (see the `data-lift` / `active:`
 * utilities in the variants below). They used to come from `motion`, which put
 * the whole animation runtime on the critical path of every page because this
 * component is imported almost everywhere.
 */
const LIFT = "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,translate,scale] duration-200 ease-out select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: `${LIFT} bg-primary text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary/90 hover:shadow-lg`,
        destructive: `${LIFT} bg-destructive text-white shadow-md shadow-destructive/15 hover:bg-destructive/90 hover:shadow-lg`,
        outline: `${LIFT} border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md`,
        secondary: `${LIFT} bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md`,
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary-text underline-offset-4 hover:underline active:scale-98 motion-reduce:active:scale-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type BaseButtonProps = Omit<ComponentProps<typeof BaseButton>, "className">

export interface ButtonProps
  extends BaseButtonProps, VariantProps<typeof buttonVariants> {
  className?: string
}

export function Button({
  className,
  size,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      className={cn(buttonVariants({ size, variant }), className)}
      data-slot="button"
      type={type}
      {...props}
    />
  )
}

const EXTERNAL_HREF = /^(?:https?:|mailto:|tel:|\/\/)/

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  /** Rendered as a plain anchor: no client-side routing, no prefetch. */
  target?: string
  rel?: string
} & VariantProps<typeof buttonVariants>

export function ButtonLink({
  className,
  href,
  size,
  variant,
  ...props
}: ButtonLinkProps) {
  const classes = cn(buttonVariants({ size, variant }), className)

  // External, mailto and tel links don't benefit from next/link.
  if (typeof href === "string" && EXTERNAL_HREF.test(href)) {
    return <a className={classes} data-slot="button-link" href={href} {...props} />
  }

  return (
    <Link className={classes} data-slot="button-link" href={href} {...props} />
  )
}
