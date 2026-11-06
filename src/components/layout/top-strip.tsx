import { Mail, Phone } from "lucide-react"

import { Container } from "@/components/ui/container"
import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"

const linkClass =
  "inline-flex min-h-6 min-w-0 items-center gap-1.5 py-0.5 transition-colors hover:text-white dark:hover:text-primary-300"
const iconClass = "size-3.5 shrink-0 text-primary-200 dark:text-primary-300"

export function TopStrip() {
  const { contact } = siteConfig

  return (
    <div className="h-9 bg-linear-to-r from-primary-700 via-primary-600 to-primary-700 text-[11px] tracking-[0.015em] text-white dark:from-primary-950 dark:via-neutral-900 dark:to-primary-950 dark:text-neutral-200">
      <Container className="flex size-full items-center justify-between gap-3 md:gap-4">
        <p className="hidden items-center gap-2 text-primary-50 md:flex dark:text-neutral-300">
          <span
            aria-hidden="true"
            className="status-dot size-1.5 rounded-full bg-success-300 ring-4 ring-success-300/20 dark:bg-success-400 dark:ring-success-400/15"
          />
          {siteContent.ui.headerIntro} {siteConfig.founded}
        </p>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 md:flex-none md:justify-end md:gap-6">
          <a className={`${linkClass} shrink-0`} href={contact.phoneHref}>
            <Phone aria-hidden="true" className={iconClass} />
            <span className="whitespace-nowrap">
              {contact.phone || siteContent.ui.phoneFallback}
            </span>
          </a>
          <a className={linkClass} href={contact.emailHref}>
            <Mail aria-hidden="true" className={iconClass} />
            <span className="truncate">
              {contact.email || siteContent.ui.emailFallback}
            </span>
          </a>
        </div>
      </Container>
    </div>
  )
}
