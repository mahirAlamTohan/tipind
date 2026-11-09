# 0007 — Base UI + token-driven Tailwind v4

Date: 2026-11-09
Status: Accepted

## Context

The UI needs accessible primitives (dialog, combobox, slider, tooltip,
accordion) and a distinctive but restrained look: blue brand, soft elevation,
dark mode, section gradients, reduced-motion support. The team wanted to own the
markup and styling rather than fight a pre-styled kit.

## Decision

Use **Base UI** (`@base-ui/react`) for behaviour and accessibility, style it with
**Tailwind CSS v4** driven by a three-layer token system (palette → semantic →
utilities) declared in `src/styles/main.css`. Variants use `cva`; class merging
uses one `cn()` helper. Motion is added with `motion/react` and gated on
`useReducedMotion()`.

## Consequences

- Full control of the DOM, so aria labels, focus behaviour and copy stay in our
  code and content modules.
- Dark mode is a token remap instead of hundreds of `dark:` overrides; new
  surfaces need one named token pair, not per-element classes.
- Base UI is still young, so API changes are a real upgrade risk; the wrappers in
  `components/ui` are the only place that would need to change.
- Tailwind v4 keeps configuration in CSS (`@theme`), which means the design
  system is one file but tooling must understand it (`tailwindStylesheet`).
- No pre-styled component library means the team maintains ~10 small primitives.

## Alternatives considered

- **shadcn/ui with Radix** — excellent, but it pulls in a wide component surface
  and its defaults (neutral grays, small radii) would need re-theming anyway.
- **MUI/Chakra** — heavy runtime, opinionated visuals, harder to match the brand.
- **CSS Modules / vanilla-extract** — more ceremony for the same result, and no
  utility-level consistency with the ESLint Tailwind rules already in place.
