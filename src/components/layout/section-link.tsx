import type { ComponentProps } from "react"

type SectionLinkProps = Omit<ComponentProps<"a">, "href"> & {
  /** Section id without the hash, e.g. "contact". */
  id: string
}

/**
 * In-page link to a section of the home page.
 *
 * A plain anchor is enough: `<html>` already carries `scroll-smooth` and
 * `scroll-pt-32`, so the browser scrolls to the right offset with the user's
 * motion preference respected. This used to be a client component wrapping
 * `next/link` with a click handler, which shipped JavaScript and, once the
 * sections became server components, had to go.
 */
export function SectionLink({ id, ...props }: SectionLinkProps) {
  return <a href={`/#${id}`} {...props} />
}
