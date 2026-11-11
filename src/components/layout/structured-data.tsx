import { siteConfig } from "@/config/site"

/**
 * JSON-LD for search engines: who we are and what this site is.
 *
 * Rendered from the same config as the visible page, so a contact change cannot
 * leave the structured data claiming an old phone number. Kept as a plain
 * `<script>` (not next/script) so it is in the static HTML, not a late insert.
 */
export function StructuredData() {
  const contactPoint = [
    siteConfig.contact.phone
      ? {
          "@type": "ContactPoint",
          telephone: siteConfig.contact.phone,
          contactType: "customer service",
          availableLanguage: ["en"],
        }
      : null,
    siteConfig.contact.email
      ? {
          "@type": "ContactPoint",
          email: siteConfig.contact.email,
          contactType: "sales",
          availableLanguage: ["en"],
        }
      : null,
  ].filter((entry) => entry !== null)

  const graph = [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      foundingDate: String(siteConfig.founded),
      ...(contactPoint.length > 0 ? { contactPoint } : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      inLanguage: "en",
      publisher: { "@id": `${siteConfig.url}#organization` },
    },
  ]

  return (
    <script
      // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- JSON-LD must be raw text in a script tag; the input is site config, never user data
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      }}
      type="application/ld+json"
    />
  )
}
