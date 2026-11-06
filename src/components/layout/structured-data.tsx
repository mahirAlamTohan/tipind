import { siteConfig } from "@/config/site"
import { siteContent } from "@/config/content"

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
          "query-input": "required name=search_term_string",
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
      // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- JSON-LD must be raw text; the payload is a serialized object literal, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      type="application/ld+json"
    />
  )
}
