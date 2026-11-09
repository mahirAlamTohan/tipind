import type { ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"

import { checkoutContent } from "../content"
import type { FieldName } from "../types"

export const controlClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/10 aria-invalid:border-danger-500 aria-invalid:focus:ring-danger-500/15"

interface FormFieldProps {
  children: ReactNode
  error?: string | undefined
  name: FieldName
  label: string
  optional?: boolean
}

/** Label + control + animated error. The control must use id `checkout-<name>`. */
export function FormField({
  children,
  error,
  label,
  name,
  optional = false,
}: FormFieldProps) {
  const id = `checkout-${name}`

  return (
    <div className="min-w-0">
      <label
        className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-bold text-ink-soft"
        htmlFor={id}
      >
        {label}
        {optional && (
          <span className="text-[0.62rem] font-semibold text-muted-foreground">
            {checkoutContent.details.optional}
          </span>
        )}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            animate={{ height: "auto", opacity: 1 }}
            className="m-0 overflow-hidden text-xs font-medium text-danger-700 dark:text-danger-300"
            exit={{ height: 0, opacity: 0 }}
            id={`${id}-error`}
            initial={{ height: 0, opacity: 0 }}
            role="alert"
          >
            <span className="block pt-1.5">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
