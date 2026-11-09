import { Globe2, Pill, ShieldCheck } from "lucide-react"

import { Container } from "@/components/ui/container"
import { Reveal } from "@/components/ui/reveal"
import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"
import { replaceSiteTokens } from "@/lib/site-tokens"

export function AboutSection() {
  const about = siteContent.about

  return (
    <section
      className="overflow-x-clip bg-linear-to-b from-background to-surface-tint py-16 sm:py-20 lg:py-24"
      id="about"
    >
      <Container className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)] md:gap-14 lg:gap-24">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-[0.68rem] font-extrabold tracking-[0.12em] text-primary-text uppercase">
            <Pill aria-hidden="true" className="size-4" />
            {replaceSiteTokens(about.eyebrow)}
          </span>
          <h2 className="mt-3 max-w-xl font-display text-[clamp(2rem,4vw,2.9rem)] leading-tight font-extrabold tracking-[-0.045em] text-ink">
            {about.title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-[0.94rem] sm:leading-8">
            {replaceSiteTokens(about.description)}
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            {about.highlights.map((highlight, index) => (
              <div
                className="inline-flex items-center gap-2 text-xs font-bold text-ink-soft"
                key={highlight}
              >
                {index === 0 ? (
                  <ShieldCheck
                    aria-hidden="true"
                    className="size-5 text-primary-text"
                  />
                ) : (
                  <Globe2
                    aria-hidden="true"
                    className="size-5 text-primary-text"
                  />
                )}
                {highlight}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal
          aria-label={`${siteConfig.name} service details`}
          className="relative isolate flex min-h-82.5 items-center justify-center sm:min-h-90"
          delay={0.12}
          role="group"
        >
          <span
            aria-hidden="true"
            className="absolute -z-10 size-[min(78vw,315px)] rounded-full bg-[radial-gradient(circle_at_34%_32%,var(--about-disc-start),var(--about-disc-middle)_68%,var(--about-disc-end)_100%)]"
          />
          <span
            aria-hidden="true"
            className="absolute -right-1 bottom-[8%] -z-10 size-22.5 rotate-12 rounded-xl border border-primary-100 bg-card shadow-xl shadow-primary-950/10 dark:border-primary-900"
          />
          <span
            aria-hidden="true"
            className="absolute -z-10 h-56.25 w-[min(92vw,380px)] -rotate-26 rounded-[50%] border border-dashed border-primary-300/80 dark:border-primary-800"
          />
          <span
            aria-hidden="true"
            className="absolute -z-10 h-47 w-[min(76vw,300px)] rotate-34 rounded-[50%] border border-dashed border-primary-300/80 dark:border-primary-800"
          />

          <div className="relative z-10 flex min-h-62.5 w-[min(300px,76%)] -rotate-3 flex-col items-start justify-center rounded-xl border border-white/80 bg-linear-to-br from-primary-600 to-primary-900 px-7 py-6 text-white shadow-2xl shadow-primary-950/25">
            <span className="grid size-11 place-items-center rounded-md border border-white/20 bg-white/10 text-primary-100">
              <Pill aria-hidden="true" className="size-5" />
            </span>
            <span className="mt-5 font-display text-[2.7rem] leading-none font-extrabold tracking-[-0.07em]">
              {siteConfig.founded}
            </span>
            <span className="mt-1.5 text-xs font-semibold text-primary-100">
              {about.sinceLabel}
            </span>
            <span className="mt-4 h-0.5 w-9 bg-primary-300" />
            <p className="mt-2.5 max-w-55 text-[0.7rem] leading-5 text-primary-50">
              {about.serviceDescription}
            </p>
          </div>

          <div className="absolute right-0 bottom-5 z-20 flex max-w-[min(285px,82%)] items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 shadow-xl shadow-primary-950/10 sm:bottom-7">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Globe2 aria-hidden="true" className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col leading-snug">
              <strong className="text-[0.7rem] font-extrabold text-ink-soft">
                {about.serviceTitle}
              </strong>
              <span className="mt-1 text-[0.58rem] text-muted-foreground">
                {about.serviceRegions}
              </span>
            </span>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
