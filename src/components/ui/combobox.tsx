"use client"

import { Combobox as Base } from "@base-ui/react/combobox"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  readonly value: string
  readonly label: string
}

interface ComboboxProps {
  describedBy?: string | undefined
  emptyText: string
  id: string
  invalid?: boolean
  inputClassName?: string
  items: readonly ComboboxOption[]
  placeholder?: string
  value: string
  onBlur?: () => void
  onValueChange: (value: string) => void
}

/** Searchable dropdown: type to filter, arrow keys to move, Enter to pick. */
export function Combobox({
  describedBy,
  emptyText,
  id,
  inputClassName,
  invalid = false,
  items,
  onBlur,
  onValueChange,
  placeholder,
  value,
}: ComboboxProps) {
  const selected = items.find((item) => item.value === value) ?? null

  return (
    <Base.Root
      autoHighlight
      isItemEqualToValue={(a, b) => a.value === b.value}
      items={items}
      itemToStringLabel={(item) => item.label}
      onValueChange={(next) => {
        onValueChange(next?.value ?? "")
      }}
      value={selected}
    >
      <div className="relative">
        <Base.Input
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          autoComplete="off"
          className={cn("pr-10", inputClassName)}
          id={id}
          onBlur={onBlur}
          placeholder={placeholder}
        />
        <Base.Trigger
          aria-label="Show options"
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </Base.Trigger>
      </div>

      <Base.Portal>
        <Base.Positioner className="z-100 outline-none" sideOffset={6}>
          <Base.Popup className="w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Base.Empty className="px-3 py-6 text-center text-sm text-muted-foreground empty:hidden">
              {emptyText}
            </Base.Empty>
            <Base.List className="max-h-72 overflow-y-auto overscroll-contain p-1.5 outline-none">
              {(item: ComboboxOption) => (
                <Base.Item
                  className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-semibold"
                  key={item.value}
                  value={item}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <Base.ItemIndicator>
                    <Check
                      aria-hidden="true"
                      className="size-4 text-primary-text"
                    />
                  </Base.ItemIndicator>
                </Base.Item>
              )}
            </Base.List>
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  )
}
