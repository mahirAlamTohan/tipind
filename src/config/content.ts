import type { SiteContent } from "@/types/content"
import { siteConfig } from "./site"

/** Country list as a sentence: "the United States, United Kingdom, …". */
const SHIPS_TO = siteConfig.shipping.countriesProse
/** Budget carriers change; keep the human wording in one place. */
const ESTABLISHED = siteConfig.founded.toString()

/** Payment methods list as a sentence: "Bitcoin (BTC), USDT (ERC-20), …". */
const PAYMENT_METHODS_PROSE = siteConfig.payments.map((p) => p.label).join(", ")

export const siteContent = {
  header: {
    headerTopIntro: "Your trusted healthcare partner since",
    emailFallback: "Email our team",
    telegramFallback: "Chat with us on Telegram",
    mainNavigationLabel: "Main navigation",
    mobileNavigationLabel: "Mobile navigation",

    chatAction: "Chat with us",
  },
  ui: {
    themeToggleLabel: "Toggle color theme",
    footerNavigationLabel: "Footer navigation",
    contactUsAction: "Contact Us",
    callUsAction: "Call Us",
    emailUsAction: "Email Us",
    closeContactOptionsLabel: "Close contact options",
    contactOptionsLabel: "Contact options",
    offlineNotice:
      "You're offline. Pages and catalog data already saved on this device may still be available.",
    cartAction: "View cart",
    cartOpenTooltip: "Open your cart",
    cartCloseTooltip: "Close your cart",
    contactOptionsTooltip: "Call or email our team",
    whatsappTooltip: "Chat with us on WhatsApp",
    errorTitle: "Something went wrong",
    errorDescription:
      "This page hit an unexpected error. Your cart and any saved details are still on this device.",
    errorRetry: "Try again",
    errorHome: "Back to the catalog",
    catalogCrashedTitle: "The catalog didn’t load",
    catalogCrashedDescription:
      "Something broke while showing the products. Try again, or reload the page if it keeps happening.",
    cartCrashedTitle: "Your cart couldn’t open",
    cartCrashedDescription:
      "Your items are still saved on this device. Reload the page to use the cart again.",
    checkoutCrashedTitle: "Checkout hit a problem",
    checkoutCrashedDescription:
      "Your cart is safe on this device. Reload the page, or go back to the catalog and try again.",
  },
  hero: {
    eyebrow: "Trusted healthcare partner since",
    title: "Quality Medicines",
    titleAccent: "Affordable Healthcare",
    description:
      "High-Quality pharmaceuticals are essential to effective healthcare. We provide reliable access to generic and branded medications, complemented by dedicated customer support and international shipping from India.",
    proofPrimary: "Quality focused",
    proofSecondary: "Trusted Source and Partner",
    imageBadge: "Carefully sourced healthcare",
    imageAlt: "Medicine bottles image.",
    contactEyebrow: "Here for your healthcare needs",
    contactDescription:
      "For product availability and orders, contact our team directly.",
    primaryAction: "Talk to our team",
    secondaryAction: "Explore catalog",
    telegramAction: "Telegram us",
    emailAction: "Email us",
  },
  faq: {
    eyebrow: "Good to know",
    title: "Frequently asked questions",
    description:
      "Find answers to common questions about our pharmaceutical catalog, products, downloads and supply.",
    contactPrompt: "Still have a question? Get in touch",
    items: [
      {
        question: "How can I pay?",
        answer: `We accept cryptocurrency payments via ${PAYMENT_METHODS_PROSE}. At checkout, you can select your preferred option, though you may pay using any of the supported coins listed above.`,
      },
      {
        question: "How do you ship, and where are orders shipped from?",
        answer:
          "All orders are dispatched directly from India exclusively via India Post.",
      },
      {
        question:
          "What should I do if my order is missing an item or I receive a different brand?",
        answer:
          "Please reach out to us with an unboxing video so we can verify the issue. Once confirmed, we can reship the missing item free of shipping charges, include it with your next order if you prefer, or issue a refund directly to your crypto wallet.",
      },
      {
        question: "Why hasn't my tracking information been updated?",
        answer:
          "Going up to two weeks without a tracking update is normal, and many packages still arrive even after 2–4 weeks of silence due to slower transit processing or missed postal scans. We only consider a package eligible for reshipment if there have been no continuous tracking updates for more than 28 days.",
      },
      {
        question: "What is your reshipment policy?",
        answer:
          "All sales are final and non-refundable once processed. However, we may consider a reshipment if your package is confirmed seized with official documentation, lost in transit, or shows no continuous tracking updates for more than 28 days.",
      },
      {
        question: "What happens if a reshipment is also seized?",
        answer:
          "Since we also absorb the loss on the initial reshipment, we cannot offer further free replacements or refunds if a second package is seized. You will need to accept the loss, though we are happy to let you place a new order at base cost.",
      },
      {
        question: "Which countries are you currently shipping to?",
        answer: `We currently ship exclusively to ${SHIPS_TO}.`,
      },
      {
        question: "How long does processing and delivery take?",
        answer:
          "Orders are packed and dispatched within 10 business days at the latest. International delivery typically takes 2–5 weeks, depending on your destination country and local postal circumstances.",
      },
      {
        question: "Is there a minimum order quantity?",
        answer:
          "No, there is no minimum order quantity or value—you can order any quantity listed in our catalog.",
      },
      {
        question: "Do I need to sign for my package?",
        answer:
          "A signature may be required upon delivery depending on your local postal service's procedures.",
      },
      {
        question: "Do I need to use my real name on the shipping address?",
        answer:
          "Yes, please use your real name and ensure your shipping address has no spelling errors or discrepancies to avoid delivery issues or delays.",
      },
    ],
  },
  about: {
    eyebrow: `About ${siteConfig.name}`,
    title: "Quality and Affordable medicines, built on trust.",
    description: `Since ${ESTABLISHED}, ${siteConfig.name} has been connecting international customers with generic and ethical-brand medications from India—backed by great service, competitive pricing, and dependable worldwide delivery.`,
    highlights: ["Competitive pricing", "Quality focused"],
    sinceLabel: "Serving customers since",
    serviceTitle: "International shipping",
    serviceRegions: siteConfig.shipping.countriesCompact,
    serviceDescription: "Thoughtful service and dependable healthcare supply.",
  },
  contact: {
    eyebrow: "Contact our team",
    title: "We’re here to help you find what you need.",
    description:
      "Questions about products or orders? Contact our team by Telegram or email. We're here to help.",
    telegramMessageLabel: "Message on Telegram",
    telegramLabel: "Telegram",
    emailLabel: "Email",
    supportHoursLabel: "Support hours",
    telegramFallback: "Contact us",
    emailFallback: "Email our team",
    supportHoursFallback: "Contact us for current hours",
    supportCallout: "Here to help",
  },
  footer: {
    kicker: "Reliable Healthcare Supply",
    description: `Trusted since ${ESTABLISHED}, ${siteConfig.name} exports generic and ethical-brand pharmaceuticals from India—offering competitive pricing, attentive support, and worldwide delivery.`,
    navigationHeading: "Quick links",
    contactHeading: "Contact us",
    serviceItems: [
      {
        title: "Responsive Support",
        description: "Assistance for your queries",
      },
      {
        title: "International Shipping",
        description: siteConfig.shipping.countriesCompact,
      },
      {
        title: "Quality Focused",
        description: "Reliable pharmaceutical supply",
      },
    ],
    noticeHeading: "Important notice:",
    notice:
      "Information on this website is for general informational purposes only and should not replace professional medical advice. Prescription medicines should be used only under the guidance of a qualified healthcare professional.",
    supportLink: "Contact support",
  },
} satisfies SiteContent
