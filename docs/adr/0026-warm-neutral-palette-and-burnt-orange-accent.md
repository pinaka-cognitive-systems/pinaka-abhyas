# ADR 0026: Warm neutral palette and a burnt orange accent

Date: 2026-09-08
Status: Accepted.

## Context

Abhyas shipped a cool zinc palette with an indigo brand signal. The house brand
moved to a warm neutral palette with a burnt orange accent. The two products
under the Pinaka name should not look like two companies.

Three things in the old palette no longer fit.

1. The neutrals were cool. The house neutrals are warm.
2. The brand signal was indigo. The house signal is burnt orange.
3. There was an info role, coloured to match the brand. Every one of its 23 call
   sites was a selection state on the brand tint, not an alert. It was a second
   name for the accent.

Two colour literals in the app still carried the superseded indigo `#6366F1`.
The mock palette legend was drawn in it while the cell it labelled was drawn in
`#5558E8`, so the legend did not match the thing it described.

## Decision

The palette moves to warm neutral with a burnt orange accent.

- The `--color-*` token vocabulary stays. Only values change. This keeps 600
  call sites untouched and makes the change reviewable as a value diff.
- The brand signal is `#9A3412`. It reads 7.0:1 on the page, and white on it
  reads 7.3:1.
- The info role retires. Its call sites move to the brand family, which is what
  they always meant.
- The warm editorial accent retires. The house brand removes it so that no
  second colour competes with the accent. It had no call sites.
- Chart and matrix colour comes from the neutral ink, never the accent. A
  reading must not change meaning when an accent changes.
- `docs/brand/palette.css` becomes the value source of truth. The gate
  `node tools/verify/tokens.mjs` compares it against
  `app/src/theme/tokens.css` and fails on any difference, so a colour cannot
  change in code without changing in the brand.

One value deviates from the house palette. The house success green is
`#16A34A`. White on it reads 3.30:1, and the correct-answer badge puts a 14px
letter on that fill, which needs 4.5:1. Abhyas ships `#15803D`, one step darker
in the same family, at 5.02:1. This follows ADR 0018 ruling 1: where a brand
value fails WCAG in real use, the corrected value ships.

## Consequences

- Every screen changes colour. No layout, spacing or type changes.
- `app/scripts/check-a11y.mjs` loses the pairs for the retired tokens and gains
  the brand selection pair. All contrast checks pass.
- The dark-section tokens are migrated to warm equivalents. They have no call
  sites in the app today, so nothing renders from them yet.
- Abhyas keeps its own brand documents. The house brand governs the other
  product. Where the two differ, `docs/brand/` governs Abhyas.
