# Design system

The visual language is intentionally conservative: blue brand, lots of neutral
surface, large radii, one accent, and motion that only confirms an action. All
of it comes from a single stylesheet plus typed content.

## Token layers

`src/styles/main.css` is the only place raw colors exist. It has three layers:

```
1. Palette        @theme static  → --color-primary-*, --color-neutral-*, …
2. Semantic       :root / .dark  → --background, --card, --ink, --footer-*
3. Tailwind map   @theme inline  → --color-background, --color-card, …
```

Components only use layer 3 as utilities (`bg-card`, `text-ink`,
`border-footer-border`). Consequences:

- Re-branding is a palette swap in one block (the file documents a violet
  alternative for `primary`).
- Dark mode is a second `:root`-shaped block (`.dark`) that remaps semantics,
  not a pile of `dark:` variants in components. Components still use `dark:`
  for the occasional accent that has no semantic token.
- Section gradients (`hero-surface`, `faq-start/middle/end`, `contact-*`,
  `footer-*`) are tokens too, so a section can be re-tinted without touching JSX.

### Palette families

| Family      | Role                                                 | Base               |
| ----------- | ---------------------------------------------------- | ------------------ |
| `primary`   | Brand, links, active states                          | blue-600 `#2563eb` |
| `neutral`   | Surfaces, text, borders (overrides Tailwind's slate) | slate              |
| `highlight` | Secondary accent in gradients                        | cyan-600           |
| `tertiary`  | “Excluded” filter state (deliberately not red)       | violet-600         |
| `success`   | Confirmations, in-stock status                       | emerald            |
| `warning`   | Offline notice, saved-locally hints                  | amber              |
| `danger`    | Errors, destructive actions                          | red                |
| `whatsapp`  | WhatsApp action only                                 | green-500/600      |

### Semantic tokens

Surfaces and text: `background`, `foreground`, `card`, `popover`, `muted`,
`border`, `input`, `ring`, `ink`, `ink-soft`, `primary-text`.

Brand and channel: `primary`, `primary-foreground`, `brand-blue`, `brand-deep`,
`whatsapp`, `whatsapp-hover`.

Sections own their own surface pairs (`hero-surface`, `catalog-surface`,
`faq-*`, `about-*`, `contact-*`, `footer-*`) so each section has a light and dark
treatment without bespoke CSS.

Geometry: `--radius: 1.25rem` with a derived scale (`radius-sm … radius-4xl`),
plus `shadow-soft`, `shadow-card`, `shadow-header-rest`,
`shadow-header-floating`.

Cart chrome: `--cart-width` (saved px), `--cart-panel` (clamped to ≤1/3 viewport),
`--cart-w` (0 or the panel width, consumed by `body { padding-right }` and by the
header/progress bar offsets).

## Typography

| Role                                | Font                                                       | Source                                       |
| ----------------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| Body / UI (`font-sans`)             | **Manrope** (variable 200–800)                             | local `src/fonts/manrope-latin-normal.woff2` |
| Display / headings (`font-display`) | **DM Sans** (variable 100–1000)                            | local `src/fonts/dm-sans-latin-normal.woff2` |
| Numerals                            | `tabular-nums` wherever prices, quantities or counts align | —                                            |

Rules:

- Headings use tight tracking (`tracking-[-0.045em]`) and `font-extrabold`.
- Body copy is 14–16 px with generous leading (`leading-7`) and muted color.
- Sizes are fluid where the layout matters: `text-[clamp(1.95rem,4vw,2.7rem)]`.
- Eyebrows are small, uppercase, extra-bold, letter-spaced
  (`text-[0.68rem] tracking-[0.12em] uppercase`).
- Prices always show three decimals (`formatMills`).

## Spacing, layout and breakpoints

- Page gutter: `Container` (`max-w-300` = 75rem, `px-4 sm:px-5 lg:px-6`).
- Sections: `py-16 sm:py-20 lg:py-24`; tighter for contact.
- Content is capped for reading: `max-w-xl`/`max-w-2xl` in section intros.
- Desktop checkout grid: `lg:grid-cols-[minmax(0,1fr)_24rem]`.
- **Container queries** matter as much as viewport breakpoints:
  - catalog results switch card ↔ table at `@4xl`,
  - cart line cards reflow at `@md`,
  - the cart panel is an `@container` so it re-lays-out when resized.

## Radii, borders and elevation

- Cards: `rounded-xl` + `ring-1 ring-border` + `shadow-card`.
- Interactive pills/buttons: `rounded-full`.
- Inputs and dense controls: `rounded-lg`/`rounded-xl`.
- Elevation is soft and blue-tinted in light mode, black in dark mode; the
  floating header uses `shadow-header-floating` only when scrolled.

## Motion

Library: **Motion** (`motion/react`). Principles:

1. **Every animation is optional.** Each component calls `useReducedMotion()` and
   either skips the transition or renders the final state immediately. Global
   CSS also disables body transitions under `prefers-reduced-motion`.
2. **Animate transform and opacity**, not layout, except for intentional
   height/opacity reveals (accordion, filters, form errors).
3. **Springs for interaction** (`stiffness 420–500`, `damping 26–36`), tweened
   `cubic-bezier(0.22, 1, 0.36, 1)` for reveals.
4. **One shared layout animation at a time**: the nav pill uses `layoutId`.
5. **Theme switch** uses the View Transitions API with a circular clip reveal
   from the button; it falls back to an instant swap when unsupported or when
   the user prefers reduced motion.

## Component inventory (`src/components/ui`)

| Component               | Built on                      | Notes                                                                                                                             |
| ----------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Button` / `ButtonLink` | Base UI Button + cva + Motion | Variants: default, destructive, outline, secondary, ghost, link. Sizes incl. `icon*`. External/mailto/tel links render as `<a>`.  |
| `Card`, `CardContent`   | plain divs                    | `data-size="sm"` tightens the spacing variable.                                                                                   |
| `Container`             | div                           | 75rem max width + responsive gutters.                                                                                             |
| `Combobox`              | Base UI Combobox              | Type-to-filter listbox with portal, keyboard support and `triggerLabel`.                                                          |
| `Accordion*`            | Base UI Accordion             | Used by the FAQ, animated chevron/panel.                                                                                          |
| `RangeSlider`           | Base UI Slider                | Two thumbs, labelled value text, used by the price filter.                                                                        |
| `Tooltip`               | Base UI Tooltip               | Accepts a plain string or a `RichTip` (`title`/`points`/`note`) with `{placeholder}` formatting; `wrap` is for disabled children. |
| `SearchField`           | native input in a label       | Controlled via `onValueChange`, two sizes.                                                                                        |
| `VirtualList`           | windowing over fixed rows     | Manufacturer facet (700 rows, 44 px each).                                                                                        |
| `Reveal`                | Motion `whileInView`          | Scroll-in fade/lift for marketing sections.                                                                                       |
| `Toaster`               | Sonner                        | Themed with popover tokens.                                                                                                       |

Feature components follow the same rules: small, typed props, no inline copy.

## Content and class conventions

- Copy lives in `config/content.ts`, `features/*/content.ts`, and is typed by
  `CartContent` / `CheckoutContent` / `SiteContent`.
- Placeholders use `{name}` and are filled with `formatMessage` or
  `replaceSiteTokens`.
- Class merging always goes through `cn()` in `@/lib/utils` (clsx + tailwind-merge).
- Primitives expose `data-slot="…"` for styling/testing hooks
  (`data-slot="button"`, `"card"`, `"accordion-panel"`, …).
- Variants are declared with `cva` next to the component, not in a global
  stylesheet.
- Icons are `lucide-react`; decorative icons get `aria-hidden`, icon-only
  buttons always have an `aria-label`.

## Accessibility baseline

- Interactive targets are at least 32–44 px; the mobile nav bars use 40 px rows.
- Focus is always visible (`focus-visible:outline-2 … outline-ring` or a ring).
- The cart drawer manages focus in/out and closes on Escape; it is `inert` when
  closed and is not a modal (the page stays usable).
- Live regions announce catalog state, search counts, cart additions and errors.
- Color is never the only signal: include/exclude facets change icon, label and
  text as well as color.

## Adding something new

1. Need a color? Add/choose a palette entry, then a semantic token, then a
   `@theme inline` mapping. Do not use raw hex in JSX.
2. Need a new surface? Give it a named token (light + dark), not a `dark:` pair
   on every element.
3. Need motion? Start from the 4 principles above and test with reduced motion.
4. Need text? Put it in a content module and type it.
