# 0022 — Mock form comparability: fixed difficulty mix and exposure control

Date: 2026-06-12
Status: decided

## Context

Readiness anchors on mock net scores (SPEC 6) and the data-state classifier
reads mock-to-mock deltas. Two assembly artifacts polluted both signals:

1. **Form difficulty luck.** The assembler drew per-family quotas with no
   difficulty constraint, so one form could land harder than the next and a
   score delta could be the draw, not the student.
2. **Re-exposure.** Items could repeat across consecutive mocks; an item
   answered from memory reads as improvement.

The fix must stay pure, seeded, and offline (no solver; mulberry32 only), and
must never silently pad — shortfalls are declared, per the honesty principle.

## Decision

In `app/src/flows/mock/assembler.ts`:

1. **Fixed per-form difficulty mix** for standard and pace mocks:
   DIFFICULTY_MIX = 20% L1 / 60% L2 / 20% L3 of each family draw, allocated by
   largest-remainder rounding (deterministic, sums exactly to the draw). When
   a label pool runs short the deficit fills from fallback labels in a fixed
   nearest-first order (L1 -> [L2, L3], L2 -> [L1, L3], L3 -> [L2, L1]).
   Hard mocks keep their deliberate L3/misconception weighting — they are
   intentionally not comparable and the UI already says their scores do not
   feed readiness.
2. **Exposure control**: `assembleMock` takes `recentItemIds` — the item ids
   of the two most recent stored mock results, built by MockFlow from the
   sessions' order arrays. Recent items are excluded from draw pools; reuse is
   permitted only when fresh alternatives are exhausted (never to deepen a
   declared shortfall), and the count surfaces as `reusedRecent` on the
   assembled result alongside the existing shortfall accounting.

The pre-mock interstitial discloses reuse when it happens, in the same place
shortfalls are declared.

## Consequences

- Standard-mock score deltas compare like with like: same difficulty shares,
  fresh items first. The mock anchor and the classifier read less noise.
- The mix constants are authoring targets too: families need L1/L2/L3 depth
  for clean draws, and the declared substitution counts show where the bank
  (800-question pre-launch commitment, ADR 0018 ruling 6) is thin.
- ICAI classifies Paper 3 as application-level; the 20/60/20 shares are our
  provisional reading of that against a bank authored across three labels,
  and they recalibrate with the difficulty model once telemetry lands.
