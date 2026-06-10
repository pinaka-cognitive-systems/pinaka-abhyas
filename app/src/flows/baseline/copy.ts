/**
 * Baseline flow copy (W5-8).
 *
 * Voice-checked strings for the cold-start baseline, kept out of the JSX so the
 * tone can be reviewed in one place (matching firstrun/copy.ts). Plain text
 * only (ADR 0015): no HTML, no markdown. The voice is calm and honest — the
 * baseline is framed as a map, not a test; wrong answers are useful, not costly.
 */

export const COPY = {
  /** The one-screen intro shown before the first question. */
  intro: {
    eyebrow: "First session",
    title: "Let's draw your first map.",
    body:
      "About 30 minutes of questions across the paper. This is not a test and " +
      "nothing here counts against you — it just shows us, and you, where you " +
      "stand right now.",
    /** Why wrong answers are fine here. */
    reassure:
      "Wrong answers are useful, not costly. A miss now tells us exactly what to " +
      "work on. Answer honestly; guess only if you would guess on the exam.",
    cta: "Start",
    skip: "I would rather just practise",
  },
  /** The persistent header label while the baseline runs. */
  header: "First session",
  /** The closing screen, leading into the first diagnosis map. */
  close: {
    eyebrow: "First map ready",
    title: "That's your starting point.",
    body:
      "Here is your first honest read. It is rough — a single session can only " +
      "say so much — and it sharpens every time you practise.",
    /** Button that links into the diagnosis map (#/diagnosis). */
    cta: "See my diagnosis",
    /** Secondary action: go practise now. */
    practiceCta: "Start practising",
  },
} as const;
