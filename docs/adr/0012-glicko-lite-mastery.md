# ADR 0012: Glicko-lite mastery

Date: 2026-06-10
Status: Accepted. Partially supersedes ADR 0006 (the estimator choice). The telemetry
path to IRT, stable item identifiers, and offline recalibration in ADR 0006 stand.

## Context

ADR 0006 chose Elo for v1 mastery. The 2026-06-10 audit found the shipped estimator was
not Elo and diverged (finding ENG-01), the confidence band had no statistical basis
(ENG-05), and forgetting decayed toward an arbitrary midpoint (PED-07). Plain Elo, even
implemented correctly, leaves two of those three unsolved: it carries no uncertainty, so
the band must be invented, and it has no principled notion of staleness.

## Decision

Per-skill mastery is a Glicko-lite pair: a rating and a deviation (uncertainty).

- The expected outcome is a function of the current rating and the item's difficulty
  anchor, with a 0.25 guessing floor for four-option items.
- The deviation shrinks with evidence and grows with inactivity. It is the principled
  basis of the readiness confidence band, and it expresses forgetting honestly: a
  neglected topic becomes uncertain rather than drifting to a fabricated middle.
- High deviation means large updates (fast cold start); low deviation means small
  updates (stability for known students).
- The ability scale and the L1/L2/L3 difficulty anchors are defined in the engine spec
  so that future IRT fits land on the same scale without breaking history.
- Item difficulty starts as authored anchors and is recalibrated offline from opt-in
  telemetry (IRT, per ADR 0006), shipped back as pack data updates. The student-side
  update rule does not change when that happens; only the item parameters improve.

## Alternatives considered

- Correct plain Elo: simplest, but the band and forgetting would remain ad hoc, which
  the honesty brand cannot carry.
- Full Glicko-2 with volatility: more machinery than a three-month exam horizon needs.
- Online IRT or knowledge tracing now: requires response data across many students,
  which does not exist before telemetry.

## Consequences

- The TypeScript engine (ADR 0010) implements the rating-plus-deviation pair from the
  start; convergence and band-coverage tests certify it.
- The readiness band and the insufficient-data gates derive from deviations instead of
  invented formulas.
- The item schema's empirical block and the per-answer event fields already carry what
  offline IRT needs; no schema break is required for the calibration path.
