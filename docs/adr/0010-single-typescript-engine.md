# ADR 0010: One engine, in TypeScript

Date: 2026-06-10
Status: Accepted. Supersedes ADR 0003.

## Context

ADR 0003 decided a Python reference engine, a TypeScript port, and CI-enforced exact
golden-vector conformance between the two. The 2026-06-10 deep audit
(`docs/audit/2026-06-10-deep-audit.md`) changed the facts under that decision:

- The Python engine never earned reference status. It was an exploration prototype
  written by a single agent. Its central mastery update was divergent (finding ENG-01),
  its tests pinned direction but never values (ENG-07), and its datetime handling was
  host-dependent (ENG-04). A reference is something proven, not something named.
- Exact two-language conformance manufactures its own friction: last-digit float
  differences between Python and JavaScript math libraries, and tie-breaking that
  depends on dict insertion order (ENG-03). These problems exist only because there are
  two implementations.
- The work that genuinely belongs in Python (content pipeline, future IRT calibration,
  simulations) reads event logs and item parameters. None of it needs the full engine.
- A solo-operator project pays every engine change twice, forever, under the two-engine
  model.

## Decision

The engine is written once, in TypeScript, as a standalone package with its own test
suite, designed fresh. The Python engine is demoted to prototype: mined for its good
ideas (honesty gates, tier structure, the expected-value model, test intent) and
archived.

Golden vectors remain, with an honest job description. The TypeScript engine emits
fixed-seed synthetic histories and their full outputs as committed vectors; CI replays
them on every change. Vectors prove stability: no change alters student-facing behavior
unnoticed. They are also the public artifact third parties can port against.

Correctness is proven by separate mechanisms, because vectors cannot prove it and the
author must not certify the author:

1. Convergence and calibration suites: simulated students of known ability; the engine
   must find the truth, and the stated coverage of the readiness band must hold.
2. An independent fresh-context adversarial pass that attempts to refute those claims
   before any vector freezes.
3. An independent implementation of the core mathematics only (a few hundred lines, in
   Python, by an agent that never saw the TypeScript code), run on the same simulated
   students in CI, agreeing within a stated tolerance.

## Alternatives considered

- Keep ADR 0003 (two full engines, exact conformance). Stronger implementation
  diversity, but double maintenance forever and a conformance contract that would have
  frozen the audited estimator bug into CI had vectors been emitted first.
- Rust compiled to WASM. Browsers run it, but for one or two thousand lines of
  arithmetic it adds build complexity and buys no needed performance.

## Consequences

- Engine work happens directly in TypeScript; the planned port phase is deleted.
- The core-math cross-check preserves implementation diversity exactly where the stakes
  are highest, at a fraction of the cost of a second engine.
- The Python prototype moves to an archived location during the planned repo
  restructure, with a pointer note.
- ADR 0003 stays in place as the historical record, per the ADR policy.
