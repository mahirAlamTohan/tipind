/**
 * `cn` comes from the precompiled `cn` package (a drop-in for clsx +
 * tailwind-merge). Everything in the app imports it from here so there is one
 * class-merging implementation; `components/ui/tooltip.tsx` used to import the
 * package directly, which meant two different merge orders in one tree.
 */
export { cn } from "cn"
