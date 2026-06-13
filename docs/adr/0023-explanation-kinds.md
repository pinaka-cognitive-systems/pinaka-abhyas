# ADR 0023: Explanation kinds and the per-archetype teaching contract

Date: 2026-06-13
Status: Accepted. Extends ADR 0017 (structured explanation sections); does not supersede it.

## Context

ADR 0017 gave the Core a four-section teaching block (`punchline`, `approach`,
`lesson`, `timing`), uniform across every item. The structure is sound and 105 of
the 106 CA QA items carry it. But it is archetype-blind: a compound-interest item
and a seating-arrangement puzzle are held to the same contract, which beyond a
minimum length is nothing. What makes an explanation correct differs by the
reasoning the question demands.

- Computational items turn on the decision: which formula, model, or measure, and
  how the givens map to it. The arithmetic is mechanical, and its slips are already
  captured per distractor in `per_option_rationale`.
- Logical-reasoning items have no executable answer-key proof behind the teaching.
  The solution harness (ADR 0005) proves an LR item's constraints are satisfiable
  and unique, but the post-answer teaching is only as trustworthy as its
  falsification of each wrong option. There the per-option rationale is the proof,
  not a courtesy.

A state-of-the-art explanation is matched to the question's reasoning type, and the
bar is enforced rather than hoped for.

## Decision

1. The Core gains one optional field, `explanation_kind`, an exam-agnostic enum of
   six reasoning archetypes: `derivation`, `formula_selection`, `counting`,
   `deductive_trace`, `model_compute`, `concept`. It is exam-agnostic, so it lives in
   the Core (the Core never changes to fit one exam; the per-exam defaults do not
   live here).

2. `explanation_sections` (ADR 0017) is unchanged. `explanation_kind` adds and
   renames nothing; it defines, per archetype, what the four sections must carry:

   | kind | `approach` must foreground | `per_option_rationale` distractor = |
   |---|---|---|
   | `derivation` | the transformation plan: setup, then each step | the manipulation error (sign, ratio inverted, extraneous root) |
   | `formula_selection` | the formula chosen and why this one, then each given mapped to a variable with period and unit | wrong formula, rate/period mismatch, simple-vs-compound, decimal slip |
   | `counting` | the order-and-repetition classification, then the decomposition | permutation-vs-combination, overcount, off-by-one |
   | `deductive_trace` | the order clues are applied and the chain they force | the specific clue each wrong option violates |
   | `model_compute` | the model or distribution identified and the assumptions stated | independence assumed, complement, wrong measure, n vs n-1 |
   | `concept` | the precise definition or property, and the confusable one it is contrasted against | the swapped or confused definition |

3. The `per_option_rationale` obligation sharpens by kind. For `deductive_trace`
   and `concept`, each distractor's rationale must name the specific violated clue or
   swapped definition. These kinds have no numeric key-proof, so the rationales are
   the correctness argument.

4. The kind is resolved per item by a default hierarchy held in the Profile
   blueprint, not the Core (it is exam-specific): a per-item `explanation_kind`
   overrides a family override, which overrides the section `default_explanation_kind`.
   Heterogeneous ICAI Section III defaults to `derivation` and is refined per family
   (`permutations_combinations` to `counting`, `sets_functions` to `concept`).

5. Enforcement is staged across the gates we already have. We do not pretend a regex
   judges teaching quality.
   - Tier 1 (schema): `explanation_kind`, when present, must be one of the enum.
   - Tier 2 (pack lint): `EXPLANATION_KIND_WITHOUT_SECTIONS`. A declared kind must
     carry the four `explanation_sections`. Structural and mechanical.
   - Generator (prashna): the kind selects the explanation template, so future runs
     produce the contract natively.
   - Model audit (Stage 5, the content pipeline): the adversarial auditor checks
     archetype fidelity. Does `approach` foreground the archetype's decisive move, and
     for `deductive_trace` does every distractor get falsified. Content quality lives
     here, behind a model, not a pattern.

6. `explanation_kind` does not enter the content hash. Identity is the problem, not
   the teaching (spec section 9, consistent with ADR 0017).

## Consequences

- Optional now; 0 of 106 items carry it, so the change is non-breaking and the new
  Tier-2 gate fires on nothing yet. The backfill assigns a kind to every item by the
  blueprint resolution, corrects the definitional minority by audit rather than by
  rule, and fixes the one item still missing `explanation_sections`. After that pass,
  `explanation_kind` and `explanation_sections` both flip to required and the Tier-2
  gate becomes universal.
- The CA Foundation QA blueprint gains `default_explanation_kind` per section and a
  family override map.
- The prashna generation spec gains kind-routed explanation templates, and the
  Stage-5 audit gains the archetype-fidelity criterion.
- App rendering of `explanation_sections`, specified in ADR 0017 but not yet built,
  should become archetype-aware (for example `deductive_trace` surfaces the per-option
  falsification prominently). Tracked as product work; not blocked by this ADR.
