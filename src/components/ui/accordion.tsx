import { Accordion as BaseAccordion } from "@base-ui/react/accordion"
import { ChevronDown } from "lucide-react"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export const Accordion = BaseAccordion.Root

type WithClassName<T> = Omit<T, "className"> & { className?: string }

export function AccordionItem({
  className,
  ...props
}: WithClassName<ComponentProps<typeof BaseAccordion.Item>>) {
  return (
    <BaseAccordion.Item
      className={cn(
        "border-b border-border transition-colors duration-300 last:border-b-0 data-open:bg-accent/40",
        className
      )}
      data-slot="accordion-item"
      {...props}
    />
  )
}

export function AccordionTrigger({
  children,
  className,
  ...props
}: WithClassName<ComponentProps<typeof BaseAccordion.Trigger>>) {
  return (
    <BaseAccordion.Header className="m-0 flex">
      <BaseAccordion.Trigger
        className={cn(
          "group flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:text-primary-text focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 sm:py-5",
          className
        )}
        data-slot="accordion-trigger"
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out group-data-panel-open:rotate-180 group-data-panel-open:text-primary-text motion-reduce:transition-none"
        />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  )
}

export function AccordionContent({
  children,
  className,
  ...props
}: WithClassName<ComponentProps<typeof BaseAccordion.Panel>>) {
  return (
    <BaseAccordion.Panel
      className={cn(
        "h-(--accordion-panel-height) overflow-hidden text-sm text-muted-foreground transition-[height,opacity] duration-300 ease-out data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      data-slot="accordion-panel"
      {...props}
    >
      <div className="pb-5 leading-7">{children}</div>
    </BaseAccordion.Panel>
  )
}
