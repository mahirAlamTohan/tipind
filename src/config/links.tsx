/**
 * Links derived from `siteConfig.contact`.
 */
import { siteConfig } from "./site"
import { toast } from "sonner"
import { CircleAlert } from "lucide-react"

const FALLBACK = "#contact"

export const contactLinks = {
  email(): string {
    const { email } = siteConfig.contact
    return email
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`
      : FALLBACK
  },

  telegram(): string {
    const { telegramUsername } = siteConfig.contact
    return telegramUsername ? `https://t.me/${telegramUsername}` : FALLBACK
  },
} as const

/**
 * Handles opening Gmail compose web URL and falls back to a sonner toast
 * if the browser blocks the popup.
 */
export function handleContactEmail(subject?: string, body?: string) {
  const email = siteConfig.contact.email

  if (!email) {
    toast.error("Contact email is not configured.", {
      position: "bottom-left",
      dismissible: true,
      closeButton: true,
    })
    return
  }

  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email,
  })
  if (subject) params.set("su", subject)
  if (body) params.set("body", body)

  const gmailUrl = `https://mail.google.com/mail/?${params.toString()}`
  const popup = window.open(gmailUrl, "_blank", "noopener,noreferrer")

  // If popup was blocked or failed to open
  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    navigator.clipboard.writeText(email).catch((e: unknown) => {
      console.log(e)
    })

    toast.error(
      `Failed to open Gmail. Please copy ${email} and use it to contact us.`,
      {
        position: "bottom-left",
        dismissible: true,
        closeButton: true,
        icon: (
          <CircleAlert aria-hidden="true" className="stroke-error-500 size-6" />
        ),
        classNames: {
          title:
            "ml-2 text-sm font-semibold text-error-950! dark:text-error-100!",
          closeButton: "bg-error-100! dark:bg-error-900! size-6! shadow",
          toast:
            "bg-error-50! dark:bg-error-950/70! backdrop-blur-sm! shadow-lg! dark:shadow-none!",
        },
      }
    )
  }
}

/** In-page anchor for a section id. */
export const sectionHref = (id: string) => `/#${id}`
