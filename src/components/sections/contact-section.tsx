import {
  ArrowUpRight,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  type LucideIcon,
} from "lucide-react"

import { ButtonLink } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { Reveal } from "@/components/ui/reveal"
import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"
import { contactLinks } from "@/config/links"

const rowClass = "group -mx-3 flex min-w-0 items-center gap-3 rounded-2xl p-3"
const rowHoverClass =
  "transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60"

interface ContactDetailProps {
  href?: string
  icon: LucideIcon
  label: string
  value: string
}

function ContactDetail({ href, icon: Icon, label, value }: ContactDetailProps) {
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-primary-200 transition-colors group-hover:border-white group-hover:bg-white group-hover:text-primary-700">
        <Icon aria-hidden="true" className="size-4.25" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[0.62rem] font-bold tracking-wide text-primary-200 uppercase">
          {label}
        </span>
        <span className="text-xs font-semibold wrap-anywhere text-white">
          {value}
        </span>
      </span>
    </>
  )

  return href ? (
    <a className={`${rowClass} ${rowHoverClass}`} href={href}>
      {body}
    </a>
  ) : (
    <div className={rowClass}>{body}</div>
  )
}

export function ContactSection() {
  const contact = siteContent.contact

  return (
    <section
      className="bg-linear-to-b from-surface-tint to-background py-12 sm:py-16 lg:py-20"
      id="contact"
    >
      <Container>
        <Reveal
          className="relative isolate grid overflow-hidden rounded-2xl bg-linear-to-br from-contact-start via-contact-middle to-contact-end p-5 text-white shadow-2xl shadow-primary-950/20 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.68fr)] lg:gap-12 lg:p-12"
          delay={0.04}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-[20%] -z-10 size-75 rounded-full border border-white/10 max-sm:hidden"
          />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 text-[0.68rem] font-extrabold tracking-[0.12em] text-primary-200 uppercase">
              <MessageCircle aria-hidden="true" className="size-4" />
              {contact.eyebrow}
            </span>
            <h2 className="mt-3 max-w-xl font-display text-[clamp(1.75rem,4vw,2.6rem)] leading-tight font-extrabold tracking-[-0.045em] text-white">
              {contact.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-primary-100">
              {contact.description}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <ButtonLink
                className="min-h-11 w-full bg-white px-4 text-primary-800 shadow-lg shadow-primary-950/20 hover:bg-primary-50 sm:w-auto"
                href={contactLinks.whatsapp()}
                rel="noreferrer"
                size="sm"
                target="_blank"
                variant="secondary"
              >
                <MessageCircle aria-hidden="true" />
                {contact.whatsappLabel}
                <ArrowUpRight aria-hidden="true" />
              </ButtonLink>
              <a
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold text-primary-100 ring-1 ring-white/20 transition-colors hover:bg-white/10 hover:text-white hover:ring-white/40 focus-visible:outline-2 focus-visible:outline-white/60"
                href={contactLinks.email()}
              >
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                <span className="wrap-anywhere">
                  {siteConfig.contact.email || contact.emailFallback}
                </span>
              </a>
            </div>
          </div>

          <div className="relative z-10 mt-6 grid gap-1 border-t border-white/20 pt-5 sm:grid-cols-2 lg:mt-0 lg:grid-cols-1 lg:content-center lg:border-t-0 lg:border-l lg:py-4 lg:pl-8">
            <ContactDetail
              href={contactLinks.phone()}
              icon={Phone}
              label={contact.phoneLabel}
              value={siteConfig.contact.phone || contact.phoneFallback}
            />
            <ContactDetail
              href={contactLinks.email()}
              icon={Mail}
              label={contact.emailLabel}
              value={siteConfig.contact.email || contact.emailFallback}
            />
            <div className="sm:col-span-2 lg:col-span-1">
              <ContactDetail
                icon={Clock3}
                label={contact.supportHoursLabel}
                value={
                  siteConfig.contact.supportHours ||
                  contact.supportHoursFallback
                }
              />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
