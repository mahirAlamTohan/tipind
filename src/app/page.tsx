"use client"

import { FloatingActions } from "@/components/layout/floating-actions"
import { AboutSection } from "@/components/sections/about-section"
import { ContactSection } from "@/components/sections/contact-section"
import { FAQSection } from "@/components/sections/faq-section"
import FooterSection from "@/components/sections/footer-section"
import { HeroSection } from "@/components/sections/hero-section"
import { siteConfig } from "@/config/site"
import { CatalogExplorer } from "@/features/catalog/components/catalog-explorer"

export default function Home() {
  return (
    <main>
      <HeroSection />
      <CatalogExplorer catalogDataUrl={siteConfig.catalog.dataUrl} />
      <FAQSection />
      <AboutSection />
      <ContactSection />
      <FooterSection />
      <FloatingActions />
    </main>
  )
}
