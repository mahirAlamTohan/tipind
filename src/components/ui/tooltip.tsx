"use client"

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import type { ReactElement, ReactNode } from "react"

import { formatMessage } from "@/lib/format"
import type { RichTip, TipContent } from "@/types/tooltip"
import { cn } from "@/lib/utils"

type Side = "top" | "right" | "bottom" | "left"

/** Fills `{placeholders}` in every line of a rich tip. */
export function formatTip(
  tip: RichTip,
  values: Readonly<Record<string, string>>
): RichTip {
  return {
    ...(tip.title && { title: formatMessage(tip.title, values) }),
    ...(tip.points && {
      points: tip.points.map((point) => formatMessage(point, values)),
    }),
    ...(tip.note && { note: formatMessage(tip.note, values) }),
  }
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <BaseTooltip.Provider closeDelay={80} delay={300}>
      {children}
    </BaseTooltip.Provider>
  )
}

function TipBody({ content }: { content: TipContent }) {
  if (typeof content === "string") return <>{content}</>

  return (
    <div className="flex flex-col gap-1.5">
      {content.title && (
        <p className="m-0 text-[0.8rem] leading-4 font-semibold">
          {content.title}
        </p>
      )}
      {content.points && content.points.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {content.points.map((point) => (
            <li className="flex items-start gap-2" key={point}>
              <span
                aria-hidden="true"
                className="mt-1.5 size-1 shrink-0 rounded-full bg-current opacity-60"
              />
              <span className="min-w-0">{point}</span>
            </li>
          ))}
        </ul>
      )}
      {content.note && <p className="m-0 opacity-70">{content.note}</p>}
    </div>
  )
}

interface TooltipProps {
  /** The element that opens the tooltip. Must accept a ref and event props. */
  children: ReactElement
  content: TipContent
  side?: Side
  /**
   * Wraps the child in a span that owns the tooltip. Use it for disabled
   * buttons, which don't receive pointer events themselves.
   */
  wrap?: boolean
}

export function Tooltip({
  children,
  content,
  side = "top",
  wrap = false,
}: TooltipProps) {
  const getArrowClass = () => {
    if (side === "bottom") return "border-r border-b"
    if (side === "right") return "border-t border-r"

    return ""
  }
  return (
    <BaseTooltip.Root>
      {wrap ? (
        <BaseTooltip.Trigger render={<span className="inline-flex" />}>
          {children}
        </BaseTooltip.Trigger>
      ) : (
        <BaseTooltip.Trigger render={children} />
      )}
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          className="isolate z-100"
          collisionPadding={8}
          side={side}
          sideOffset={8}
        >
          <BaseTooltip.Popup className="relative w-fit max-w-xs origin-(--transform-origin) rounded-xs border border-accent bg-background px-3 py-2 text-xs leading-4.5 text-pretty text-foreground shadow-2xl transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <TipBody content={content} />
            <BaseTooltip.Arrow
              className={cn(
                getArrowClass(),
                "z-50 size-2.5 translate-y-[calc(-50%)] rotate-45 rounded-[2px] border-accent bg-background fill-background data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5"
              )}
            />
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
