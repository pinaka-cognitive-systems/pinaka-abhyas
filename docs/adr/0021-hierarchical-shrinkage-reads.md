# 0021 — Read-time hierarchical shrinkage for skill estimates

Date: 2026-06-12
Status: decided

## Context

Real packs tag items with leaf taxonomy nodes
(`qa.bmath.finance.compound_interest`) while the blueprint weighs family
nodes (`qa.bmath.finance`). Readiness and selection read skills by exact node
id, so on production-shaped data every family read returned the fresh prior:
the readiness model EV was nearly prior-flat (the estimate leaned almost
entirely on the mock anchor) and the selector's learnable-band tier never
fired — coverage served L1 entries forever. The golden vectors masked this
because their scenarios tag family ids directly.

Independently, per-leaf estimates are thin early on (a handful of attempts),
and classical measurement practice for thin estimates under a known hierarchy
is empirical-Bayes shrinkage toward the group.

## Decision

A read-time pooling layer (`engine-ts/src/hierarchy.ts`; SPEC section 5.0),
applied by the selector and readiness only. The stored mastery state is never
modified: the certified section-3 update math and its independent Python
cross-check (W1-12) keep their exact scope.

- Every attempted node contributes its drifted rating to each proper ancestor
  prefix with >= 2 dot segments (part level and below; the whole exam is not a
  pool), precision-weighted by 1/deviation².
- A node's prior is the nearest pool with evidence: its own descendants
  first, then ancestors with the node's own contribution subtracted — a node
  is never its own prior. Pool variance = mean member variance +
  SIBLING_VARIANCE (0.25: siblings are similar, not identical).
- Effective skill = w·own + (1−w)·prior, w = n/(n+K), K = 4 attempts of prior
  strength; variances blend the same way. No own attempts -> the prior speaks
  alone; no neighborhood evidence -> the raw drifted state passes through.
- "Seen" for the selector's learnable/coverage boundary becomes "any evidence,
  own or descendant".

K and SIBLING_VARIANCE are provisional until telemetry-era calibration. The
app's UI mastery chips keep reading raw per-node state (they describe what was
practised, not an inference).

## Consequences

- Readiness on production data now reflects practice: a new
  `leaf_tagged_pooling` golden scenario pins the shape (readiness 17 marks,
  band 4–28, low confidence from 28 leaf-tagged events — versus prior-flat
  before).
- The learnable-band tier fires on families reached through leaves; coverage
  no longer re-serves families the student already works in.
- A one-attempt fluke reads near its siblings' mean (w = 1/5), so remediation
  and practice targeting stop chasing noise; a well-attempted node barely
  moves (w = 100/104).
- Unseen nodes inside a practised family inherit the family estimate with
  honestly widened uncertainty — readiness claims are estimates and say so,
  and the confidence ceiling stays medium.
