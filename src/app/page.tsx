import { FloatingActions } from "@/components/layout/floating-actions"
import { AboutSection } from "@/components/sections/about-section"
import { ContactSection } from "@/components/sections/contact-section"
import { FAQSection } from "@/components/sections/faq-section"
import FooterSection from "@/components/sections/footer-section"
import { HeroSection } from "@/components/sections/hero-section"
import { CatalogBoundary } from "@/features/catalog/components/catalog-boundary"
import { CatalogExplorer } from "@/features/catalog/components/catalog-explorer"

export default function Home() {
  return (
    <main>
      <HeroSection />
      <CatalogBoundary>
        <CatalogExplorer />
      </CatalogBoundary>
      <FAQSection />
      <AboutSection />
      <ContactSection />
      <FooterSection />
      <FloatingActions />
    </main>
  )
}
