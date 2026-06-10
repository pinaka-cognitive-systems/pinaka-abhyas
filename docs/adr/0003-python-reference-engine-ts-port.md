# ADR 0003: Python reference engine with a TypeScript port and golden-vector conformance

Date: 2026-06-10
Status: Accepted

## Context

The diagnosis brain computes per-node mastery, schedules spaced review, selects
the next action, and produces a readiness estimate. A working Python
implementation exists, with Elo-style mastery, SM-2-lite scheduling, a four-tier
selector, and an honest readiness estimate, all tested against synthetic
histories.

The app is a TypeScript PWA with no backend. The engine must run in the browser.
So the logic has to exist in TypeScript. The risk is that two implementations of
the same math drift apart and produce different recommendations for the same
history.

## Decision

The Python engine is the reference implementation. It is the canonical definition
of the algorithms and stays clean and well-tested.

The engine is ported to TypeScript to run in the PWA. The Python engine emits
golden test vectors: input event logs paired with the exact mastery maps,
schedules, selector outputs, and readiness estimates it produces. CI requires the
TypeScript port to reproduce those vectors exactly. A divergence fails the build.

## Alternatives considered

Run the Python engine in the browser with Pyodide. Rejected. The Pyodide runtime
is over 10MB and has a slow cold start on the low-end laptops this app targets,
which is the opposite of the offline-fast experience we want.

A single TypeScript engine, no Python. Rejected. The Python version already exists,
is tested, and is the clearer place to reason about and calibrate the math. Keeping
it as the reference and conforming the port against it is cheaper than re-deriving
the logic in TypeScript and trusting it without a reference.

Manual parity checks instead of golden vectors. Rejected. Manual checks miss drift.
A generated vector set checked in CI is the only way to keep two implementations
provably in step.

## Consequences

- Two implementations exist on purpose. The Python one is the reference; the
  TypeScript one ships.
- The golden-vector set is a build artifact and a test fixture. Regenerating it is
  part of any change to the engine math, and both implementations must agree after.
- A change to the algorithm is made in Python first, vectors regenerated, then
  mirrored in the TypeScript port until CI is green.
- Calibration work happens against the Python reference, then flows to the port
  through new vectors.
