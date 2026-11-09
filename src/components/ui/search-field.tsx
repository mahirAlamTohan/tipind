import type { ComponentProps } from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

interface SearchFieldProps extends Omit<
  ComponentProps<"input">,
  "onChange" | "size" | "type"
> {
  label: string
  onValueChange: (value: string) => void
  size?: "sm" | "md"
}

export function SearchField({
  className,
  label,
  onValueChange,
  size = "md",
  ...props
}: SearchFieldProps) {
  const isLarge = size === "md"

  return (
    <label
      className={cn(
        "flex w-full items-center rounded-xl border border-input bg-background text-muted-foreground shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/10",
        isLarge ? "min-h-11 gap-2.5 px-3.5" : "min-h-10 gap-2 rounded-lg px-3",
        className
      )}
    >
      <Search
        aria-hidden="true"
        className={cn(
          "shrink-0 text-primary-text",
          isLarge ? "size-5" : "size-4"
        )}
      />
      <span className="sr-only">{label}</span>
      <input
        autoComplete="off"
        className={cn(
          "min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
          isLarge ? "h-10 text-sm" : "h-9 text-xs"
        )}
        onChange={(event) => {
          onValueChange(event.target.value)
        }}
        type="search"
        {...props}
      />
    </label>
  )
}
