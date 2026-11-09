# 0006 — Prices as integer thousandths of USD

Date: 2026-11-09
Status: Accepted

## Context

The sheet lists rates such as `$0.665` and `$2.831`. Multiplying floats and
summing them produces values like `0.6650000000000001`, which look wrong in a
price column and break equality checks. Some products are quoted at a third
decimal, so cents are not enough.

## Decision

Store money as **mills**: integer thousandths of a US dollar. `$2.831 → 2831`.
Parse with string matching (no float math), round half-up past the third decimal,
cap at $100,000 per packet and use `-1` as the "no price" sentinel. Format for
display with `Intl.NumberFormat` at exactly three decimals.

## Consequences

- All cart maths is integer addition and multiplication; totals are exact and
  comparable.
- `1/3`-cent precision is preserved as far as the sheet provides it; anything
  finer is rounded and reported at build time by the catalog script.
- Every boundary (storage, build script, UI) must agree on the unit; the
  constant name `unitPriceMills` and the `MAX_UNIT_PRICE_MILLS` cap make it hard
  to mix units accidentally.
- Prices are USD only. A multi-currency future needs a currency field and a
  formatting strategy, not just a different symbol.

## Alternatives considered

- **Floating-point dollars** — rounding drift and unsafe equality in filters.
- **Integer cents** — loses the third decimal the sheet actually uses.
- **A decimal library** — correct, but unnecessary weight when integers plus
  formatting cover the whole domain.
- **`Intl.NumberFormat` with `style: "currency"` on a string** — cannot do maths;
  we still use it for display.
