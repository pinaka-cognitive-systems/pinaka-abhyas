/**
 * Baseline flow copy (W5-8).
 *
 * Voice-checked strings for the cold-start baseline, kept out of the JSX so the
 * tone can be reviewed in one place (matching firstrun/copy.ts). Plain text
 * only (ADR 0015): no HTML, no markdown. The voice is calm and honest; the
 * baseline is framed as a map, not a test; wrong answers are useful, not costly.
 *
 * The intro phase has been removed (value-first order: baseline starts at
 * question 1). The close screen is now the commitment moment: it carries the
 * readiness payoff first, then the attempt card, then the install card.
 */

export const COPY = {
  /** The persistent header label while the baseline runs. */
  header: "First session",
  /** The closing screen: payoff, then commitment cards (attempt + install). */
  close: {
    eyebrow: "First map ready",
    title: "That is your starting point.",
    body:
      "Here is your first honest read. It is rough, because a single session " +
      "can only say so much, and it sharpens every time you practise.",
    /** Button that links into the diagnosis map (#/diagnosis). */
    cta: "See my diagnosis",
    /** Secondary action: go practise now. */
    practiceCta: "Start practising",
  },
} as const;
