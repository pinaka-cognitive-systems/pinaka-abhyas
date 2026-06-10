# ADR 0005: Machine-verified item pipeline

Date: 2026-06-10
Status: Accepted

## Context

A diagnosis app is only as good as its questions. A wrong answer key or a
mislabeled misconception teaches the student the wrong thing and destroys trust.
The bank is AI-generated, so it needs verification that does not itself depend on a
model agreeing with itself. The product gate Gate A is exactly this: the content
must be correct and cheap before any app work proceeds.

## Decision

Every item passes a verification pipeline before it can ship.

- Every quantitative item ships with an executable Python solution that computes
  the answer and machine-verifies the stated key. A mismatch rejects the item.
- Logical reasoning items are verified with constraint solvers or brute-force
  enumeration wherever the item structure allows it.
- Distractors are derived from specific, named common student mistakes, not chosen
  at random. Each wrong option maps to a misconception in the closed canon.
- Generation uses cross-model checks. An item that one model produces is checked
  against another.
- The operator spot-checks a 5 to 10 percent random sample by re-solving blind.
- Rejection rates are published honestly. We report how many generated items fail
  verification rather than hiding the funnel.

Gate A exit criteria: wrong-key rate under 0.5 percent after verification,
misconception-tag accuracy at or above 85 percent on the audited sample, and a
known cost per question.

## Alternatives considered

Trust model output with human spot-checks only. Rejected. Spot-checks alone do not
catch the long tail of subtle arithmetic and sign errors that a code solution
catches deterministically.

Single-model generation without cross-checks. Rejected. A single model's
confidence correlates with its own errors. A second model and an executable solver
are independent signals.

Hide the rejection rate. Rejected. The honesty of the published number is part of
the showcase and part of the trust contract with students.

## Consequences

- Quantitative correctness is machine-checked, not asserted. The wrong-key rate is
  measured, not assumed.
- Every wrong option carries a real diagnostic meaning, because distractors come
  from named mistakes. This is what makes per-option diagnosis possible.
- Throughput is bounded by verification, not by raw generation speed. Cutting
  syllabus breadth under schedule pressure is allowed; cutting verification rigor
  is not.
- The pipeline produces a publishable quality number, which feeds the technical
  write-ups.
