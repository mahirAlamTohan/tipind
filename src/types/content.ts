export interface FAQItem {
  question: string
  answer: string
}

export interface SiteContent {
  header: {
    headerTopIntro: string
    emailFallback: string
    telegramFallback: string
    mainNavigationLabel: string
    mobileNavigationLabel: string
    chatAction: string
  }
  ui: {
    themeToggleLabel: string
    footerNavigationLabel: string
    contactUsAction: string
    callUsAction: string
    emailUsAction: string
    closeContactOptionsLabel: string
    contactOptionsLabel: string
    offlineNotice: string
    cartAction: string
    cartOpenTooltip: string
    cartCloseTooltip: string
    contactOptionsTooltip: string
    whatsappTooltip: string
    errorTitle: string
    errorDescription: string
    errorRetry: string
    errorHome: string
    catalogCrashedTitle: string
    catalogCrashedDescription: string
    cartCrashedTitle: string
    cartCrashedDescription: string
    checkoutCrashedTitle: string
    checkoutCrashedDescription: string
  }
  hero: {
    eyebrow: string
    title: string
    titleAccent: string
    description: string
    proofPrimary: string
    proofSecondary: string
    imageBadge: string
    imageAlt: string
    contactEyebrow: string
    contactDescription: string
    primaryAction: string
    secondaryAction: string
    telegramAction: string
    emailAction: string
  }
  faq: {
    eyebrow: string
    title: string
    description: string
    contactPrompt: string
    items: FAQItem[]
  }
  about: {
    eyebrow: string
    title: string
    description: string
    highlights: string[]
    sinceLabel: string
    serviceTitle: string
    serviceRegions: string
    serviceDescription: string
  }
  contact: {
    eyebrow: string
    title: string
    description: string
    telegramMessageLabel: string
    telegramLabel: string
    emailLabel: string
    supportHoursLabel: string
    telegramFallback: string
    emailFallback: string
    supportHoursFallback: string
    supportCallout: string
  }
  footer: {
    kicker: string
    description: string
    navigationHeading: string
    contactHeading: string
    serviceItems: {
      title: string
      description: string
    }[]
    noticeHeading: string
    notice: string
    supportLink: string
  }
}
