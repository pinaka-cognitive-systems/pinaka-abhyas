# Content pilot report

Date: 2026-06-10. Pipeline: specs/content-pipeline.md. Decision owner: Shiva.
Pilot target: 50 accepted items. Delivered: 58 accepted, zero discarded, zero wrong keys.

## What ran

Five generation batches (B1 statistics core, B2 probability and distributions, B3
finance and index numbers, B4 business mathematics with calculus, B5 logical
reasoning), each through the full funnel: Tier 1 schema, Tier 2 cross-record,
sandboxed solution execution, strict quality, notation and B1 readability lints, then
independent blind verification, a 31% adversarial audit, owner review of every
finding, repair, and atomic promotion. All artifacts (funnel reports, blind verdicts)
sit beside this file.

## Results

- **Keys: zero defects at every stage.** 58 of 58 blind-verified in full agreement by
  isolated solvers that never saw a key; 58 of 58 solution harness passes; every
  logical-reasoning item carries an enumeration proof of satisfiability and uniqueness.
- **Bank: 23 to 81 usable items in one pilot.** Taxonomy coverage went from 21 of 69
  v1-scope leaves to 60 of 69. The nine remaining uncovered leaves are equations
  (simple, simultaneous, cubic) and permutations/combinations depth plus
  continuity/domain-range: one focused batch.
- **Quality gates earned their cost.** First-pass funnel rejected 22 of the first 24
  items; both adversarial audits rejected their samples (75% and 77.8% tag accuracy
  against the 85% bar) and every finding was repaired and re-verified before
  promotion. Nothing was waved through.

## Defect taxonomy (what generation gets wrong, and the countermeasures)

1. **Answer-position bias**: generators put the correct option first, always.
   Countermeasure shipped: the deterministic shuffle tool, run before every funnel.
2. **Generic-tag drift**: generic misconception ids (arithmetic_slip,
   misread_quantity, wrong_formula) used where specific ids apply, in both audits.
   Countermeasure for scale: a tag-discipline table with worked examples in the
   generation rubric, plus the structural fix below.
3. **Fabricated distractor derivations** (the most serious finding): two distractors
   whose stated error paths did not produce their printed values. Caught only by the
   adversarial audit. Countermeasure for scale, adopted as a requirement: every wrong
   option gets an executable derivation in the solution file, gated by the harness
   exactly like the key. This single mechanism also kills most generic-tag drift.
4. **Difficulty-label inflation** on two L3 items, downgraded at audit. Labels remain
   estimates until telemetry recalibration (ADR 0006).
5. Minor: notation allowlist friction (superscripts beyond two and three; the degree
   sign), handled with word forms; candidate ADR 0015 refinement.

Canon v5 candidates logged from audit force-fits: "truncated procedure" and "partial
state update after a draw."

## Cost

Agent token usage is metered for every stage: generation, blind verification,
adversarial audit, and one-time tooling. The per-accepted-item figure is tracked as a
Gate A criterion under ADR 0005. Orchestration and repair by the lead model was not
separately metered this run; meter it at scale-up. All of this compute runs at build
time, so it costs a student nothing.

## Recommendation

Scale, with two changes first: (1) implement per-distractor executable derivations as
a harness gate and require them in the generation rubric; (2) add the tag-discipline
table to the rubric. Then one batch closes the nine remaining leaves, and subsequent
batches add depth by blueprint weight toward the 500-item target, with the human
expert audit joining at the 5 to 10 percent rate per ADR 0005.
