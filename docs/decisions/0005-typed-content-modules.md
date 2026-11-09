# 0005 — Site copy as typed TypeScript modules, not a CMS

Date: 2026-11-09
Status: Accepted

## Context

Marketing copy, FAQ answers, field labels, tooltips and error messages change
more often than the layout. The site is one page plus checkout, edited by one or
two developers, and every string must be reviewable and greppable.

## Decision

Keep all copy in `src/config/content.ts`, `features/cart/content.ts` and
`features/checkout/content.ts`, typed by `SiteContent`, `CartContent` and
`CheckoutContent`. Components read `siteContent.faq.items`, `copy.details.heading`
and so on, never literal strings (with a few unavoidable exceptions such as the
brand name and the copyright line).

## Consequences

- A missing or renamed string is a `tsc` error, not a blank label in production.
- Copy changes are normal pull requests: diffable, reviewable, lintable.
- Placeholders (`{name}`, `{count}`, `{product}`) keep interpolation out of JSX.
- Non-developers cannot edit copy directly; they ask a developer. That is
  acceptable at two editors, and cheaper than a CMS integration.
- Large content objects make diffs noisier, and unused keys can linger (the
  cleanup pass removed a batch of them).

## Alternatives considered

- **A headless CMS** (Sanity/Contentful) — a second login, schema, API key and
  build trigger for ~60 strings that change monthly.
- **MDX/JSON files** — less type safety, and another format to maintain.
- **Inline copy in JSX** — fastest to write, slowest to review, and impossible to
  keep consistent across tooltips, aria labels and messages.
