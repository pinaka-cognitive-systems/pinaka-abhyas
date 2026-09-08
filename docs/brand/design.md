# Design system

The visual system. One visual family, used unchanged across every pack. Color, type, motion, components, icons, and the logo lockup. Voice and copy doctrine live in `brand-core.md`. Exam positioning lives in `positioning-ca.md`.

The single most important rule: the artifact is the visual. The readout, the diagnosis, the readiness screen is the image. Never decorate around it.

## Color

> **Shipped palette (ADR 0018 ruling 1).** The app ships the WCAG-corrected
> palette; values in all tables below are the shipped tokens. The design-team
> originals (pre-correction) live in the gitignored design-team drop and are
> not the reference.

Three-layer story. One brand signal.

### Surfaces (warm neutral)

| Token | Hex | Use |
| --- | --- | --- |
| `--color-background` | `#FAFAF9` | Page background |
| `--color-foreground` | `#0C0A09` | Body text. Also the dark-section background |
| `--color-card` | `#FFFFFF` | Cards push to pure white |
| `--color-muted` | `#F5F5F4` | Callout and inset backgrounds |
| `--color-muted-foreground` | `#38342E` | Body text and descriptions. Reads 11.8:1 on the page, 12.4:1 on a card |
| `--color-text-subtle` | `#514C46` | Captions, footnotes |

### Brand (burnt orange, one signal does all the work)

| Token | Hex | Use |
| --- | --- | --- |
| `--color-brand-primary` | `#9A3412` | All accents, primary CTAs, links on light |
| `--color-brand-primary-hover` | `#882500` | Hover. Body-size link color for AA |
| `--color-brand-primary-active` | `#721E00` | Active |
| `--color-brand-secondary` | `#C2593A` | Brand accent on dark sections. Primary is too dark on `#0C0A09` |
| `--color-brand-soft` | `rgba(85,88,232,0.10)` | Focus rings, selected states, the only gradient-like fill |

### Semantic (not interchangeable)

| Meaning | Filled | Soft | Text | Border |
| --- | --- | --- | --- | --- |
| Success (green) | `#15803D` | `#DCFCE7` | `#14532D` | `#15803D` |
| Warning (amber) | `#F5B544` | `#FEF3C7` | `#78350F` | `#F5B544` |
| Danger (rose) | `#E11D48` | `#FEE2E2` | `#8B1A1A` | `#E11D48` |

### Borders

`--color-border-hairline #F5F5F4` (decorative dividers only) · `--color-border #E7E5E4` (cards, inputs) · `--color-border-strong #D6D3D1` (interactive and focused).

### The dark-section palette (inverted)

When a section inverts to near-black (manifesto, primary CTA card, stat callout):

| Role | Hex |
| --- | --- |
| Background | `#0C0A09` |
| Primary text | `#FFFFFF` |
| Body and secondary text | `#D6D3D1` |
| Muted and caption | `#A8A29E` |
| Hairline divider | `#292524` |
| Strikethrough rule | `#57534E` |
| Brand accent (eyebrow, chevron) | `#C2593A` |

Hold to one true dark section per page. A second, like a primary CTA card, is acceptable. Three is not.

### Background rules

No background images. No full-bleed photography. No illustration. No gradients on chrome. No textures, patterns, or grain. Page rhythm comes from vertical space and at most one hard color shift, not decoration. The artifact is the visual interest.

## Type

One family: IBM Plex Sans. IBM Plex Mono is the only secondary cut, used for numbers, scores, data tables, and code.

### Scale (1.25 Major Third, base 16px)

`xs 12` · `sm 14` · `base 16` · `lg 18` · `xl 20` · `2xl 24` · `3xl 30` · `4xl 36` · `5xl 48` · `6xl 60` (hero ceiling, there is no 7xl).

### Metric scale (numeric displays only)

`--text-metric-hero 64px` (stat blocks) · `--text-metric-display 96px` (the peak readout). Mono Semibold reads heavier than Sans Semibold because mono glyphs are denser. This is how the climactic number carries weight without Bold.

### Weight ceiling: Semibold 600

There is no Bold. User-agent `<strong>` and `<h1>` through `<h6>` defaults are overridden to 600. Even the hero.

### Other

- Italics for book titles and technical first-mentions only. Never for emphasis.
- Line-length caps: long-form 65ch, card body 45ch, hero 35ch, sub-hero 50ch.
- Letter-spacing: `--tracking-tight -0.025em` (hero), `--tracking-heading -0.02em`, `--tracking-caps 0.05em` (eyebrows).
- Fonts are self-hosted in production, no CDN. Google Fonts only for prototypes. Email falls back to system sans (`-apple-system, 'Segoe UI', Roboto`) because Outlook strips webfonts. The chevron, the accent, and the voice still carry the brand.

## Motion

Four named primitives, derived from the bow. Default easing `cubic-bezier(0.2, 0.8, 0.2, 1)`.

| Primitive | When | Property |
| --- | --- | --- |
| Draw | Press feedback, focus ring engage | Transform only, decelerate |
| Release | Modal and dropdown entry, page transitions, hover rise | Transform and opacity, decelerate from origin |
| Breath | The peak readout, first paint of a diagnosis | Opacity only, single phase, earned moments only |
| Still | Color shifts, hover backgrounds, theme switch | Color and opacity, no spatial movement |

Durations: instant 100ms, fast 150ms, base 200ms, modal 300ms, page 500ms. Every duration multiplies by `--motion-duration-scalar`, which collapses to 0 under `prefers-reduced-motion: reduce`.

Forbidden: hardcoded ms, parallax, auto-playing motion, confetti, sparkles, particles, loading spinners (use skeletons), hover scale above 1.04, multi-stage climactic orchestration (the peak is one Breath, not three), ambient motion.

## Components and layout

### Spacing ladder (these values only)

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96`px. No 7, 9, 11, 13, 14, 15, 17, 18, 19. They render as nothing in the token system. Content max-width is roughly 720 to 960px long-form, 1200 to 1280px marketing.

### Radii

`sm 4` (chips, inline controls) · `md 6` (buttons, inputs) · `lg 8` (cards) · `xl 12` (dialogs) · `full` (pills only). No 24px or larger pill cards.

### Shadows (almost imperceptible)

`xs` resting buttons · `sm` cards · `md` popovers · `lg` modals only. All `rgba(9,9,11,0.04` to `0.06)`. No inner shadows, no glow, no colored shadows.

### Cards

White on the page surface, `radius-lg`, `--color-border` hairline, optional `--shadow-sm`. Border or shadow, not both heavy. Usually border alone. No colored-left-border accent cards.

### Hover and press

Color-only hover (background to muted or brand-soft, border to strong). Cards may translate up 1 to 2px, never scale above 1.04. Press: scale 1.0 to 0.98 on `:active`, no color flash.

### Buttons

Primary (accent fill), secondary (white plus border), ghost (transparent), inverse (page surface on dark). Sizes sm, md, lg (heights 32, 40, 48). Border-radius `md`.

### Layout rules

- One answer per screen. Never pair a reveal with an upsell.
- Reveal, do not explain. Headlines do not promise the moment. The product builds it.
- Fixed content (decks, OG cards) implements its own scaling. OG cards are 1200 by 630.
- Mobile hit targets at least 44px.

## Iconography

Lucide-style, hand-drawn in `app/src/components/ui.tsx`; no icon library ships. Monoline, even stroke, square caps, miter joins, no fills. Stroke 1.5 to 2px at 24px. `currentColor`. Icons are never the accent colour by default, because the accent is reserved for the chevron mark. Sizes: 24 standard, 16 inline in text, 20 compact UI, 32 empty state. No filled glyphs in production web.

## Imagery and the artifact

No photography. No stock photos. No instructor headshots. No environment imagery. No abstract product shots. No illustration. Surfaces are the warm neutral base and the data on top of it.

The artifact is the ad. The readout, the diagnosis, the readiness screen, the explanation: annotated sometimes, staged never. Marketing surfaces present the product's actual output. When a section feels like it needs an image, the answer is almost always to show a real artifact instead.

Signature artifacts are used as a pattern across surfaces: the peak readout (one mono number, a band, one sentence), the skill or mastery map (the screenshottable identity object), and the explanation walkthrough (the same banded shape on every question). The exact artifacts per pack are defined in that pack's positioning doc and schema.

## Logo lockup

Adopted from design v1, with two refinements.

The lockup, left to right:

1. The chevron mark. Burnt orange stroke (`--color-brand-primary #9A3412`). Two diagonal strokes referencing the bow drawn. Square caps, miter joins.
2. "Pinaka" in IBM Plex Sans 600, in `--color-foreground #0C0A09`.
3. "abhyas" lowercase, set as a tag in regular weight and subtle gray.

Brand work happens through the icon, never through coloring the text. This is the editorial pattern premium publications follow.

Inline SVG for the chevron (square caps, miter joins, 3px stroke):

```html
<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
     stroke="var(--color-brand-primary)" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter">
  <path d="M4 18L12 6" />
  <path d="M16 12L20 18" />
</svg>
```

`var(--color-brand-primary)` resolves to `#9A3412`. It reads 7.0:1 on the page, and white on it reads 7.3:1.

Forms:

| Form | Use |
| --- | --- |
| Full lockup (chevron, "Pinaka", "abhyas" tag) | Default |
| Chevron alone | Favicon, app icon, small surfaces |
| Wordmark alone | When the chevron is already present in context |

### Refinement 1: the tag holds legibility

The "abhyas" tag must never render below 12px. Its color must hold at least 4.5:1 contrast against its background. Subtle gray is the intent, not illegible gray. If the background is dark, lift the tag color until it passes 4.5:1.

### Refinement 2: exam names never enter the lockup

Exam names (CA Foundation, LSAT, any other) never appear adjacent to the lockup or inside any logo treatment. They are descriptive copy only. This generalizes the flagship's trademark rule to every exam body. The full trademark posture is in `positioning-ca.md`.

The name in prose is always "Pinaka Abhyas", both words capitalized. The lowercase "abhyas" is a lockup treatment only, never how the name is written in text.
