import { siteConfig } from "@/config/site"
import { siteContent } from "@/config/content"

/**
 * Escapes the three characters that can terminate a `<script>` element.
 *
 * `JSON.stringify` alone is NOT safe inside an inline script: a value
 * containing `</script>` closes the element early and everything after it is
 * parsed as HTML, so `<img onerror=...>` runs. Every string below comes from
 * `config/*` and `.env.production`, which are reviewed content — but they are
 * still data, and one careless paste from a client questionnaire into
 * NEXT_PUBLIC_SITE_NAME would turn the whole site into a stored XSS vector.
 *
 * Escaping to `\u003c` keeps the output valid JSON: JSON.parse and Google's
 * structured-data parser both read `\u003c` back as `<`.
 */
function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}

/**
 * JSON-LD for the organisation, the site (with the catalog search action) and
 * the FAQ block. The FAQ entries already exist as data in `config/content.ts`,
 * so rich-result eligibility costs nothing here.
 *
 * This is a `<script type="application/ld+json">`, which browsers never execute,
 * so it is safe to render from a server component.
 */
export function StructuredData() {
  const { contact } = siteConfig

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        foundingDate: siteConfig.founded.toString(),
        ...(contact.email ? { email: contact.email } : {}),
        ...(contact.phone
          ? { telephone: contact.phone.replace(/[^\d+]/g, "") }
          : {}),
        sameAs: [contact.telegramHref].filter(
          (href) => href !== "#contact"
        ),
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: { "@id": `${siteConfig.url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteConfig.url}/#catalog`,
          },
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteConfig.url}/#faq`,
        mainEntity: siteContent.faq.items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  }

  return (
    <script
      // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- JSON-LD must be raw text; serializeJsonLd escapes <, > and & so the payload cannot close the script element.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }}
      type="application/ld+json"
    />
  )
}
