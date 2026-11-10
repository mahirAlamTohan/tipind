"use client"

import { ErrorBoundary } from "@/components/error-boundary"
import { ErrorPanel } from "@/components/error-fallback"
import { FloatingActions } from "@/components/layout/floating-actions"
import { AboutSection } from "@/components/sections/about-section"
import { ContactSection } from "@/components/sections/contact-section"
import { FAQSection } from "@/components/sections/faq-section"
import FooterSection from "@/components/sections/footer-section"
import { HeroSection } from "@/components/sections/hero-section"
import { Container } from "@/components/ui/container"
import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"
import { CatalogExplorer } from "@/features/catalog/components/catalog-explorer"

export default function Home() {
  return (
    <main>
      <HeroSection />
      <ErrorBoundary
        fallback={(reset) => (
          <section
            className="bg-linear-to-b from-surface-tint to-background py-16 sm:py-20 lg:py-24"
            id="catalog"
          >
            <Container>
              <ErrorPanel
                description={siteContent.ui.catalogCrashedDescription}
                onRetry={reset}
                title={siteContent.ui.catalogCrashedTitle}
              />
            </Container>
          </section>
        )}
        label="catalog"
      >
        <CatalogExplorer catalogDataUrl={siteConfig.catalog.dataUrl} />
      </ErrorBoundary>
      <FAQSection />
      <AboutSection />
      <ContactSection />
      <FooterSection />
      <FloatingActions />
    </main>
  )
}
