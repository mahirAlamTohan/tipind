import {
  ArrowDown,
  ArrowRight,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react"
import Image from "next/image"

import { ButtonLink } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Container } from "@/components/ui/container"
import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"
import { contactLinks } from "@/config/links"
import heroImage from "@/images/hero-visual.webp"

export function HeroSection() {
  const content = siteContent.hero

  return (
    <section
      aria-label={`${siteConfig.name} healthcare`}
      className="bg-linear-to-b from-hero-surface to-background pb-7 sm:pb-10"
      id="home"
    >
      <div className="relative isolate h-[clamp(510px,72svh,610px)] min-h-125 w-full overflow-hidden bg-hero-image-surface md:h-[clamp(500px,68svh,650px)]">
        <Image
          alt={content.imageAlt}
          blurDataURL="data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA" // tiny 1×1 version
          className="object-cover object-[68%_center] md:object-[center_52%] dark:brightness-65 dark:saturate-80"
          fetchPriority="high"
          fill
          placeholder="blur"
          priority
          sizes="100vw"
          src={heroImage}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-r from-hero-scrim/98 via-hero-scrim/88 via-45% to-transparent"
        />

        <Container className="relative z-10 flex h-full items-center pb-4">
          {/* Entrance animation is CSS (see .hero-enter) so this stays a server
              component and nothing hydrates for a decorative fade. */}
          <div className="hero-enter max-w-172.5 py-8 md:py-11">
            <span className="hidden min-h-9 items-center gap-2 rounded-full border border-primary/20 bg-background/75 px-3.5 py-2 text-[0.62rem] font-extrabold tracking-widest text-primary-text shadow-sm backdrop-blur-xl sm:inline-flex sm:text-[0.68rem]">
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              {content.eyebrow} {siteConfig.founded}
            </span>

            <h1 className="leading-1.02 max-w-162.5 font-display text-[clamp(2.7rem,6.5vw,4.85rem)] font-extrabold tracking-[-0.07em] text-balance text-ink">
              {content.title}
              <br />
              <span className="bg-linear-to-r from-primary-700 via-primary-500 to-highlight-600 bg-clip-text text-transparent dark:from-primary-300 dark:via-primary-200 dark:to-highlight-200">
                {content.titleAccent}
              </span>
            </h1>

            <p className="mt-5 hidden max-w-xl text-sm leading-7 text-pretty text-neutral-600 sm:text-base sm:leading-8 md:block dark:text-neutral-200">
              {content.description}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink
                className="min-h-12 bg-linear-to-r from-primary to-primary-500 px-5 shadow-lg shadow-primary-700/25"
                href={contactLinks.whatsapp()}
                rel="noreferrer"
                size="lg"
                target="_blank"
              >
                <MessageCircle aria-hidden="true" />
                {content.primaryAction}
                <ArrowRight aria-hidden="true" />
              </ButtonLink>
              <ButtonLink
                className="min-h-12 border-neutral-300/80 bg-white/65 px-5 text-primary-950 backdrop-blur-lg hover:bg-white dark:border-neutral-600 dark:bg-neutral-950/45 dark:text-primary-100 dark:hover:bg-neutral-900/80"
                href="/#catalog"
                size="lg"
                variant="outline"
              >
                {content.secondaryAction}
                <ArrowDown aria-hidden="true" />
              </ButtonLink>
            </div>

            <div
              aria-label={`${siteConfig.name} service highlights`}
              className="mt-6 mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-neutral-600 dark:text-neutral-200"
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 text-success-600 dark:text-success-300"
                />
                {content.proofPrimary}
              </span>
              <span aria-hidden="true" className="text-neutral-400">
                ·
              </span>
              <span>{content.proofSecondary}</span>
            </div>
          </div>
        </Container>

        <div className="absolute right-4 bottom-4 z-10 hidden min-h-9 items-center gap-2 rounded-full border border-primary-100/90 bg-white/80 px-3 text-[0.62rem] font-semibold text-primary-800 shadow-lg shadow-primary-950/10 backdrop-blur-xl sm:right-6 md:inline-flex dark:border-primary-900 dark:bg-neutral-950/80 dark:text-primary-200">
          <ShieldCheck
            aria-hidden="true"
            className="size-4 text-success-600 dark:text-success-300"
          />
          {content.imageBadge}
        </div>
      </div>

      <Container className="relative z-10 -mt-8">
        <Card
          className="bg-card/90 p-4 shadow-xl shadow-primary-950/10 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
          size="sm"
        >
          <CardContent className="flex flex-col gap-1">
            <span className="text-[0.58rem] font-extrabold tracking-widest text-primary-text uppercase">
              {content.contactEyebrow}
            </span>
            <p className="m-0 text-xs font-semibold text-ink-soft sm:text-sm">
              {content.contactDescription}
            </p>
          </CardContent>
          <CardContent className="flex flex-nowrap items-center gap-2">
            <ButtonLink
              className="h-9 px-3"
              href={contactLinks.whatsapp()}
              rel="noreferrer"
              size="sm"
              target="_blank"
            >
              <MessageCircle aria-hidden="true" />
              {content.whatsappAction}
            </ButtonLink>
            <ButtonLink
              className="h-9 px-3"
              href={contactLinks.email()}
              size="sm"
              variant="outline"
            >
              <Mail aria-hidden="true" />
              {content.emailAction}
            </ButtonLink>
          </CardContent>
        </Card>
      </Container>
    </section>
  )
}
