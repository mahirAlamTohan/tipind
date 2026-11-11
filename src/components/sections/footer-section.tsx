import {
  ArrowUpRight,
  Clock3,
  Globe2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import { BrandLogo } from "@/components/layout/logo"
import { SectionLink } from "@/components/layout/section-link"
import { Container } from "@/components/ui/container"
import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"
import { contactLinks } from "@/config/links"

const SERVICE_ICONS: readonly LucideIcon[] = [
  MessageCircle,
  Globe2,
  ShieldCheck,
]

const headingClass =
  "text-[0.68rem] font-extrabold tracking-[0.075em] text-footer-foreground uppercase"
const labelClass =
  "text-[0.58rem] font-extrabold tracking-[0.09em] text-footer-muted/70 uppercase"
const rowClass =
  "group -mx-2 flex min-w-0 flex-col gap-1 rounded-xl px-2 py-1.5"
const rowHoverClass =
  "transition-colors hover:bg-footer-card focus-visible:bg-footer-card focus-visible:outline-2 focus-visible:outline-footer-accent"
const pillLinkClass =
  "-mx-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-footer-muted transition-colors hover:bg-footer-card hover:text-footer-accent focus-visible:bg-footer-card focus-visible:text-footer-accent focus-visible:outline-2 focus-visible:outline-footer-accent"

interface FooterContactProps {
  href?: string
  icon: LucideIcon
  label: string
  value: string
}

function FooterContact({ href, icon: Icon, label, value }: FooterContactProps) {
  const body = (
    <>
      <span className={labelClass}>{label}</span>
      <span className="flex items-center gap-2">
        <Icon
          aria-hidden="true"
          className="size-4 shrink-0 text-footer-accent transition-transform group-hover:scale-110 motion-reduce:transition-none"
        />
        <span className="text-xs font-bold wrap-anywhere text-footer-foreground transition-colors group-hover:text-footer-accent">
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

interface ServiceItemProps {
  description: string
  icon: LucideIcon
  title: string
}

function ServiceItem({ description, icon: Icon, title }: ServiceItemProps) {
  return (
    <div className="group flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-footer-border bg-footer-card text-footer-accent transition-colors group-hover:border-footer-accent/60 group-hover:bg-footer-accent group-hover:text-footer-start">
        <Icon aria-hidden="true" className="size-4.25" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <strong className="text-[0.7rem] font-extrabold text-footer-foreground">
          {title}
        </strong>
        <small className="text-[0.62rem] leading-5 text-footer-muted">
          {description}
        </small>
      </span>
    </div>
  )
}

export default function FooterSection() {
  const contact = siteContent.contact
  const footer = siteContent.footer

  return (
    <footer className="relative bg-linear-to-br from-footer-start via-footer-middle to-footer-end text-footer-foreground before:absolute before:inset-x-0 before:top-0 before:h-0.75 before:bg-linear-to-r before:from-footer-accent before:via-footer-accent/70 before:to-footer-border before:content-['']">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 sm:gap-x-10 sm:py-12 lg:grid-cols-[minmax(250px,1.2fr)_minmax(170px,0.7fr)_minmax(260px,1fr)] lg:gap-16">
        <div className="sm:col-span-2 lg:col-span-1">
          <BrandLogo footer />
          <span className="mt-5 block text-xs font-extrabold text-footer-accent">
            {footer.kicker}
          </span>
          <p className="mt-2 max-w-md text-xs leading-6 text-footer-muted">
            {footer.description}
          </p>
        </div>

        <nav aria-label={siteContent.ui.footerNavigationLabel}>
          <span className={headingClass}>{footer.navigationHeading}</span>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-col sm:items-start sm:gap-y-0.5">
            {siteConfig.navigation.map((item) => (
              <SectionLink
                className={pillLinkClass}
                id={item.id}
                key={item.id}
              >
                {item.footerLabel}
              </SectionLink>
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <span className={headingClass}>{footer.contactHeading}</span>
          <div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-1">
            <FooterContact
              href={contactLinks.phone()}
              icon={Phone}
              label={contact.phoneLabel}
              value={siteConfig.contact.phone || contact.phoneFallback}
            />
            <FooterContact
              href={contactLinks.email()}
              icon={Mail}
              label={contact.emailLabel}
              value={siteConfig.contact.email || contact.emailFallback}
            />
            <FooterContact
              icon={Clock3}
              label={contact.supportHoursLabel}
              value={
                siteConfig.contact.supportHours || contact.supportHoursFallback
              }
            />
          </div>
          <a
            className="-mx-2 inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-[0.7rem] font-extrabold text-footer-accent transition-colors hover:bg-footer-accent hover:text-footer-start focus-visible:outline-2 focus-visible:outline-footer-accent"
            href={contactLinks.whatsapp()}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            {contact.supportCallout}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </Container>

      <Container>
        <div className="grid gap-5 border-y border-footer-border py-5 sm:grid-cols-3 sm:gap-4">
          {footer.serviceItems.map((item, index) => (
            <ServiceItem
              description={item.description}
              icon={SERVICE_ICONS.at(index) ?? ShieldCheck}
              key={item.title}
              title={item.title}
            />
          ))}
        </div>
      </Container>

      <Container className="mt-5">
        <div className="grid gap-1.5 rounded-xl border border-l-[3px] border-footer-border border-l-footer-accent bg-footer-card/70 px-4 py-3 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
          <strong className="text-[0.62rem] font-extrabold tracking-[0.07em] text-footer-accent uppercase">
            {footer.noticeHeading}
          </strong>
          <p className="m-0 text-[0.62rem] leading-5 text-footer-muted">
            {footer.notice}
          </p>
        </div>
      </Container>

      <Container className="mt-5">
        <div className="flex flex-col items-start justify-center gap-1 border-t border-footer-border py-4 text-[0.62rem] text-footer-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {siteConfig.copyrightYear} {siteConfig.name}. All rights reserved.
          </span>
          <SectionLink
            className="-mx-2 rounded-full px-3 py-1.5 font-bold text-footer-foreground transition-colors hover:bg-footer-card hover:text-footer-accent focus-visible:outline-2 focus-visible:outline-footer-accent sm:mx-0"
            id="contact"
          >
            {footer.supportLink}
          </SectionLink>
        </div>
      </Container>
    </footer>
  )
}
