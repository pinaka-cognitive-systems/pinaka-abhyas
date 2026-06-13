# ADR 0024: Mock difficulty mix mirrors the real ICAI paper

Date: 2026-06-13
Status: Accepted. Supersedes the difficulty-mix target of ADR 0022 (mock form
comparability). The rest of ADR 0022 — the comparability mechanism, the two-mock
exposure window, and the hard-mock variant — remains in force.

## Context

ADR 0022 set the standard and pace mock difficulty draw at 20% L1 / 60% L2 / 20% L3.
Measured against the ICAI-modelled reference vault and the calibrated bank, the real
CA Foundation Paper 3 is about 26% L1 / 66% L2 / 8% L3 — far fewer hard items than
20%. Two problems followed from the 20% L3 target.

1. Fidelity. A 20%-L3 mock is materially harder than the exam it simulates, so its
   score is not a faithful readiness signal. The product's purpose is to prepare
   students for the actual paper, which means the mock should mirror it.
2. Supply. At 20% L3, each 100-question mock needs 20 hard items. Genuine L3 items
   are scarce and hard to author: a difficulty audit of a dedicated L3 generation run
   found only about 28% of "L3"-labelled items were genuinely hard. Sustaining 10
   distinct mocks at 20% L3 would need roughly 200 genuine L3 items; the bank holds
   about 69. The 20% target put 10 fresh mocks out of reach without an impractical
   hard-item manufacturing effort.

## Decision

The standard and pace mock difficulty mix becomes 26% L1 / 66% L2 / 8% L3, mirroring
the real ICAI paper. `DIFFICULTY_MIX` in `app/src/flows/mock/assembler.ts` is the
single source of truth; the assembler test reads it, so the change propagates without
a separate test edit. The hard-mock variant is unchanged: still L3-weighted, still
excluded from the readiness estimate. The comparability mechanism and the two-mock
exposure window from ADR 0022 are unchanged.

## Consequences

- Standard mocks are faithful exam simulations; the readiness signal improves.
- L3 stops being the binding supply constraint. At 8 L3 per mock against about 69 L3
  in the bank, with the two-mock exposure window excluding only ~16 L3 at a time, the
  current 749-item bank assembles 10 or more genuinely fresh mocks with no forced L3
  reuse. No additional questions are required to reach 10 mocks.
- The genuine L3 items stay valuable for drills and for the hard-mock variant.
- This is a data-only change. No item content changes; no item identity churn.
