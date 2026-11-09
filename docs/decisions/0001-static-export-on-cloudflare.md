# 0001 — Static export on Cloudflare, no backend

Date: 2026-11-09
Status: Accepted

## Context

The site is a catalog plus an order _request_. It has no accounts, no payments,
no inventory mutations and no personal data that must be stored server-side. The
team is small, the traffic is modest and bursty, and the operating budget is a
few dollars a month. Any server would exist only to serve files that rarely
change.

## Decision

Ship the whole site as a Next.js **static export** (`output: "export"`) and host
`out/` as Cloudflare Workers static assets, configured by `wrangler.jsonc`.

## Consequences

- No runtime environment variables: contact details and the catalog URL are
  inlined at build time, so changing them is a rebuild.
- No API routes, server actions or middleware. Anything that looks like a
  backend call must become a client-side operation or a build-time artefact.
- Personal state (cart, address) lives in `localStorage`, so it is per device
  and per browser profile. That is acceptable: the order is completed in a
  message anyway.
- Near-zero hosting cost, trivial scaling, no patching, tiny attack surface.
- The deployable is inspectable: `out/` can be served from anything.

## Alternatives considered

- **Vercel/Next server deployment** — more capability than we use, plus cold
  starts and a bill that scales with requests.
- **A small Node/Express server + database** — introduces availability,
  backups, auth and GDPR obligations for data we do not need.
- **A hosted commerce platform** — adds a dependency and a monthly fee for a
  catalog that changes a few times a week.
