# tipind documentation

This folder is the written plan behind the site: why it exists, what it does,
how it is built, and what is still on the table. It is deliberately short — each
document answers one question, and the whole set can be read in about 35 minutes.

## Read it in this order

| #   | Document                                               | Question it answers                                                  |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| 1   | [Product brief](./product/brief.md)                    | What is tipind, who is it for, how is it made — in one page          |
| 2   | [Requirements & scope](./product/requirements.md)      | What does success look like, and what did we decide not to build     |
| 3   | [User flows](./product/user-flows.md)                  | What does a visitor actually do, screen by screen                    |
| 4   | [Architecture](./engineering/architecture.md)          | How do the pieces fit together at runtime                            |
| 5   | [Catalog pipeline](./engineering/catalog-pipeline.md)  | How do prices get from a Google Sheet into 8,500 searchable rows     |
| 6   | [Data & state](./engineering/data-and-state.md)        | What is stored, where, and what is trusted                           |
| 7   | [Design system](./engineering/design-system.md)        | How colors, type, spacing and motion are decided                     |
| 8   | [Operations](./engineering/operations.md)              | How to run, configure, release and debug it                          |
| 9   | [Decisions](./decisions/README.md)                     | Why these choices and not the obvious alternatives                   |
| 10  | [Roadmap](./product/roadmap.md)                        | What shipped, what is next, what is intentionally out of scope       |
| 11  | [Cleanup log, 2026-11](./changelog/cleanup-2026-11.md) | What changed in the November 2026 tidy-up                            |
| 12  | [Security & privacy](./security/README.md)             | What is exposed today, how it would be exploited, and the fix order  |
| 13  | [Error handling](./engineering/error-handling.md)      | Where failures are caught, what the buyer sees, and the notes policy |

The security section (`security/`) is an **assessment**, not a plan for work
already done: it was written in November 2026 at the owner's request, and no
fixes were applied as part of it. Read the review before changing anything that
touches the environment, the deploy script or the checkout.

## The 30-second version

**tipind** is an online price list for generic and ethical-brand medicines
shipped from India. The site is a catalog, not a shop: it lets an international
buyer search by ingredient, brand, manufacturer or pack size, adjust packet
quantities, and then hand a pre-formatted order (items, address, preferred
crypto payment) to the team over email or Telegram. There is no login, no payment
gateway and no database — the whole thing is a static export on Cloudflare, so it
is cheap, fast, and has almost no attack surface.

## Conventions used here

- **Product docs** (`product/`) describe intent, not implementation.
- **Engineering docs** (`engineering/`) describe how the code currently works. If
  code and docs disagree, the code wins — then fix the doc.
- **Decision records** (`decisions/`) are append-only. Supersede an old record
  with a new one instead of rewriting history.
- **Changelog docs** (`changelog/`) are snapshots of one maintenance pass.
