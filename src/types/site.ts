export interface NavigationItem {
  label: string
  mobileLabel: string
  footerLabel: string
  href: string
}

export interface SiteConfig {
  name: string
  url: string
  tagline: string
  description: string
  founded: number
  copyrightYear: number
  navigation: readonly NavigationItem[]
  contact: {
    phone: string
    phoneHref: string
    whatsappNumber: string
    whatsappHref: string
    email: string
    emailHref: string
    telegramUsername: string
    telegramHref: string
    supportHours: string
  }
  catalog: {
    dataUrl: string
    /** Public XOR mask for the artifact. Not a secret — see config/site.ts. */
    xorKey: string
  }
}
