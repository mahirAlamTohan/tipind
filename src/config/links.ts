/**
 * Links derived from `siteConfig.contact`.
 *
 * These are *computed*, not stored: keeping `phoneHref` next to `phone` in the
 * config meant the same fact existed twice and could drift (a phone number
 * edited in one place, the `tel:` link still pointing at the old one).
 *
 * Every helper returns `#contact` when the channel is not configured, so a
 * missing env value degrades to the contact section instead of a dead link.
 */
import { siteConfig } from "./site"

const FALLBACK = "#contact"

export const contactLinks = {
  phone(): string {
    const digits = siteConfig.contact.phone.replace(/[^\d+]/g, "")
    return digits ? `tel:${digits}` : FALLBACK
  },

  whatsapp(): string {
    const { whatsappNumber } = siteConfig.contact
    return whatsappNumber ? `https://wa.me/${whatsappNumber}` : FALLBACK
  },

  email(): string {
    const { email } = siteConfig.contact
    return email ? `mailto:${email}` : FALLBACK
  },

  telegram(): string {
    const { telegramUsername } = siteConfig.contact
    return telegramUsername ? `https://t.me/${telegramUsername}` : FALLBACK
  },
} as const

/** In-page anchor for a section id. */
export const sectionHref = (id: string) => `/#${id}`
