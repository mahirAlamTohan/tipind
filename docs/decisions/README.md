# Decision records

Short, append-only notes on the choices that shape the codebase. Each one states
the context, the decision, the consequences and the alternatives that were
rejected. If a decision changes, add a new record that supersedes the old one
instead of editing history.

| #                                                       | Decision                                                | Status   |
| ------------------------------------------------------- | ------------------------------------------------------- | -------- |
| [0001](./0001-static-export-on-cloudflare.md)           | Static export on Cloudflare, no backend                 | Accepted |
| [0002](./0002-sheet-to-versioned-artifact.md)           | Google Sheet → versioned masked artifact                | Accepted |
| [0003](./0003-custom-search-index.md)                   | Purpose-built search index instead of a library         | Accepted |
| [0004](./0004-messenger-order-handoff.md)               | Orders leave through email/Telegram, not a checkout API | Accepted |
| [0005](./0005-typed-content-modules.md)                 | Site copy as typed TypeScript modules, not a CMS        | Accepted |
| [0006](./0006-integer-mill-pricing.md)                  | Prices as integer thousandths of USD                    | Accepted |
| [0007](./0007-base-ui-and-token-based-tailwind.md)      | Base UI + token-driven Tailwind v4                      | Accepted |
| [0008](./0008-split-catalog-pipeline-from-site-repo.md) | Catalog pipeline and deploy move to CI, secrets split   | Proposed |

## Template

```md
# NNNN — Title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by NNNN

## Context

What situation forced a choice?

## Decision

What did we do?

## Consequences

What gets easier, what gets harder, what we accept.

## Alternatives considered

- Option — why not.
```
