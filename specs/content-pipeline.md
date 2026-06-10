# Content pipeline

Date: 2026-06-10. Status: active, v1. This is the W4-3 design from the master plan:
how items are generated, verified, and accepted, and how the funnel is measured. The
pilot (W4-4) runs exactly this pipeline at a target of 50 accepted items; the owner
reviews cost and quality before any scale-up.

## Principles

- No item ships on trust. Every stage emits a machine-checkable artifact, and the
  artifacts are committed with the pack (`packs/<pack>/audit/`).
- The funnel is published: generated, rejected per stage with reasons, accepted, and
  the measured cost per accepted item. Rejections are a feature, not an embarrassment.
- Generation is build-time AI by agents in this development harness (ADR 0004 keeps
  the runtime clean); the cost unit is agent tokens, recorded per batch.

## Stage 0: targeting

Targets come from the blueprint gap analysis: uncovered v1-scope leaf nodes ordered by
blueprint mark weight, with per-node difficulty quotas of roughly 20% L1, 55% L2,
25% L3 (the authoring guide's distribution). The pilot batch targets uncovered
high-weight nodes only. Precondition for generating into an uncovered area: the
misconception canon covers it with specific ids (the batched canon v3 bump, W4-2).

## Stage 1: generate

A generation agent receives the authoring rubric, which binds: the Content Authoring
Guide (one question per stem, stem under 60 words, exhibits declared, 2 to 4 worked
steps); the misconception rule (every wrong option constructed backward from exactly
one canon id, arithmetic_slip only for computational slips); CEFR B1 English; unicode
notation per ADR 0015 with Indian digit grouping in money contexts; the schema
contract including the per-item executable solution, authored together with the item,
computing the answer from the givens. The agent emits item JSON plus solution file.
Generator identity and batch id land in provenance.

## Stage 2: solve (hard gate)

The solution harness (schema/validator/SOLUTION_HARNESS.md) executes every solution:
the computed answer must reproduce the key; LR solutions must also prove premises
satisfiable and the answer unique. Any failure rejects the item.

## Stage 3: blind verify (hard gate)

An independent verifier agent, fresh context, receives the stem and options ONLY (no
key, no rationales, no solution) and must solve the item. Disagreement with the key
rejects the item. Model-on-model agreement is not certification (the genspike audit
proved that), but as a third independent derivation behind the executable solution and
the generator, a disagreement is a reliable alarm.

## Stage 4: lint (hard gate)

Both validator tiers, the strict quality gates (distractor equals key, stem leakage,
near-duplicate), the notation allowlist, and the B1 readability lint. Per the master
plan W3-3/W3-5; anything advisory today is gating for generated batches.

## Stage 5: audit (sampled, human-anchored)

For the pilot: every LR item gets a logical-consistency enumeration check, and an
adversarial audit agent re-derives a 30% sample blind, checking misconception-tag
fit option by option. The spec owner reviews every rejection and a sample of
acceptances; the owner reviews the pilot wholesale before any scale decision. At
scale (W4-5): the human expert audits 5 to 10 percent, per ADR 0005.

## Acceptance and accounting

An item is accepted when stages 2 through 4 pass and it survives any stage-5 sampling
it received. Per batch, the funnel records: items generated, rejections per stage with
one-line reasons, acceptances, agent token usage (generation plus verification), and
the derived cost per accepted item. The pilot report carries the full funnel plus the
quality observations that decide the scale-up.

## Pilot gate (W4-4, restated from the plan)

Zero wrong keys among accepted items (every key machine-reproduced and blind-agreed);
misconception-tag accuracy at or above 85 percent on the audited sample; a known token
cost per accepted item. The owner reflects on cost and quality before W4-5.
