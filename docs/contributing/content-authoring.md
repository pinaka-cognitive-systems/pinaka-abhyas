# Content authoring guide

For everyone authoring CA Foundation Paper 3 content. The diagnosis engine is
only as good as the tagging discipline here. Read the rules; the engine cannot
fix what authoring gets wrong.

This guide is repo canon. It was ported from design-team/v2/Content Authoring
Guide.html and reconciled with the content pipeline (specs/content-pipeline.md)
and the pilot report (packs/ca-foundation-qa/audit/pilot/PILOT_REPORT.md).
Rules that are enforced mechanically by a validator or lint are marked
**[enforced: ...]**.

---

## 01 The unit of authoring

A question is authored against exactly one **leaf taxonomy node** (for example
`compound_interest`, not "Mathematics of Finance") and one **difficulty**:

| Level | Meaning | Test |
|---|---|---|
| L1 | Recall / single formula | One step, no method choice |
| L2 | Application | Multi-step or a method choice |
| L3 | Trap / multi-concept | A plausible wrong method exists and is baited |

ICAI Paper 3 is application-level throughout. The bank should be roughly 20% L1,
55% L2, and 25% L3 per node. The authoring stock target (20/55/25 per node) and
the fixed per-form mock draw (26% L1 / 66% L2 / 8% L3, ADR 0024 superseding
ADR 0022's mix) are different quantities; the stock must be deep enough to serve
the draw without substitutions.

Difficulty labels are estimates at authoring time and are recalibrated from
telemetry after launch (ADR 0006). Do not rely on a label to decide whether a
question is hard; use the L1/L2/L3 test in the table above.

**[enforced: Tier 2 cross-record check]** Node id must exist in the taxonomy and
must be a leaf. Abstract-node targets are rejected.

---

## 02 The misconception rule

Every wrong option must carry exactly one misconception id from the closed canon
(`misconceptions.json`). Not zero, not two. The id names the wrong-answer
path: the specific reasoning that produces that number.

- Work backwards. Compute the number a student gets if they make the error, and
  make that the distractor. A distractor that no specific error produces is a
  wasted option.
- Choose the **most specific** id whose `families` scope includes the question's
  node. See the tag-discipline table in section 07 for worked examples.
- `arithmetic_slip` is the fallback for a pure computational slip only. It is
  never used for a conceptual error.
- Never invent an id inline. If no canon entry fits, flag it. Adding one is a
  canon version bump with product review.

Good example: a compound-interest question at 10% for 2 years. Distractor A =
4,000 is the simple-interest answer, so its id is `compound_interest_confusion`.
Distractor D = 4,420 is the three-period answer, so its id is
`rate_period_mismatch`.

Bad example: distractors that are "the right answer plus or minus a random
amount." They have no error path, no diagnosis value, and no distractor
derivation.

**[enforced: Tier 2 cross-record check]** Every distractor's misconception id
must exist in the canon and its `families` scope must include the question's
taxonomy node. Violations are a hard reject.

**[enforced: solution harness, W3-1]** The harness re-derives the answer key
from `solve()` in CI; a mismatch is a hard reject. It does not execute
distractor derivations. Distractor values, each the value its tagged
misconception produces, are verified by the pipeline's Stage 3 blind verify
and Stage 5 audit (specs/content-pipeline.md), not by the CI harness. This
requirement was added after the pilot found two distractors whose stated error
paths did not produce their printed values; it was caught only by the
adversarial audit, not by the earlier gates.

---

## 03 Writing the stem

- One question per stem. Do not use "which of the following is NOT" unless the
  node specifically tests negation.
- Numbers must be realistic for the domain. Rupee amounts use Indian grouping
  at lakh scale (1,00,000 not 100,000).
- Data-bearing questions declare an `exhibit` (table) rather than embedding data
  in prose. The exam hall renders exhibits in a dedicated pane.
- Stem length must be under 60 words. The real paper is terse; ours must be too.

**[enforced: B1 readability lint, W3-5]** Sentence length, clause depth, and
vocabulary band are checked mechanically. Violations are flagged before
submission and are gating for generated batches.

**[enforced: notation lint, W3-5 per ADR 0015]** Notation must follow the
unicode-first allowlist. Superscripts beyond the two and three characters and
the degree sign use word forms instead.

---

## 04 Writing the explanation

`explanation` is short prose, computed honestly, that must actually produce
the answer. It is not a numbered-steps format.

Every servable item also carries `explanation_sections`, four required
sub-fields (ADR 0017):

- **Punchline**: one or two sentences naming why the keyed answer wins.
  Always visible in the UI.
- **Approach**: how to attack this question type from a cold read.
- **Lesson**: the transferable take-home rule.
- **Timing**: how long this should take and what to cut first.

Every servable item also carries `explanation_kind`, one of six reasoning
archetypes (ADR 0023: `derivation`, `formula_selection`, `counting`,
`deductive_trace`, `model_compute`, `concept`). The kind sets what `approach`
must foreground and how `per_option_rationale` proves the key; see ADR 0023
for the per-kind contract.

- Voice rules apply throughout: short sentences, "do not" not "don't", no
  contractions, no em-dashes, no exclamation marks, no "Imagine".

**[enforced: solution harness, W3-1]** `solve()` in the solution file must
produce the key value when executed. A mismatch is a hard reject.

**[review]** Section content and voice are reviewed by a human at audit time.
The B1 readability lint checks sentence length and clause depth mechanically
but cannot assess tone.

---

## 05 Blueprint discipline

Mock assembly draws from the bank by ICAI section weighting (`blueprint.json`):
Business Mathematics 40 marks, Logical Reasoning 20 marks, Statistics 40 marks,
with a 5% within-part deviation allowed. Authors fill coverage gaps first. A
node with under 15 bank questions cannot support drills, reviews, and mocks
simultaneously. Target depth: 25 or more per high-weight node (Finance,
Probability, Central Tendency), 15 or more elsewhere.

The pipeline targets uncovered leaf nodes ordered by blueprint mark weight
(specs/content-pipeline.md, stage 0). Do not author into a node that already
has sufficient depth until coverage gaps are closed.

**[review]** Blueprint adherence is checked by the pipeline targeting step and
reported per batch in the funnel report. It is not a validator gate.

---

## 06 Review checklist (per question)

1. Node and difficulty assigned; difficulty matches the L1/L2/L3 test in
   section 01.
2. Exactly one correct option; verified by independent re-solve.
3. Every wrong option traces to a named error path with its canon id.
4. Every wrong option's value matches what its tagged misconception produces.
5. The explanation and its four sections reproduce the answer.
6. Stem under 60 words; exhibit declared if data-bearing; Indian number
   formatting.
7. Voice check: no banned phrases, no scolding, sentence case, no contractions,
   no em-dashes.

Items 2 and 3 are checked mechanically by the solution harness and the
blind verifier. Item 4 is checked by the pipeline's Stage 3 blind verify and
Stage 5 audit, not the solution harness. Items 1, 5, 6, and 7 are checked by
the lint gates. Item 7 is also checked by a human at the audit stage.

---

## 07 Tag-discipline table

The pilot found generic misconception ids used where specific ids applied, in
both adversarial audits. The table below gives worked examples drawn from the
actual pilot re-tags. Use the most specific id whose `families` scope includes
the question's node.

| Question type | Error made by student | Generic id (do not use) | Specific id (use this) | Why |
|---|---|---|---|---|
| Set operations: A union B asked, student intersects instead | Confuses union with intersection | `misread_quantity` | `set_operation_confused` | The error is a conceptual confusion about the operation, not a misread of a number. |
| Compound interest: student uses simple-interest formula | Applies I = Prt instead of A = P(1+r)^n | `wrong_formula` | `compound_interest_confusion` | The error has a specific name in the canon and is scoped to Finance. |
| Percentage base: index of 125 means 125% rise, not 25% | Reads index value as the percentage change | `misread_quantity` | `percentage_base_confusion` | The student misunderstands the base, not the number printed in the question. |
| Permutations: treats ordered arrangement as unordered | Applies combination formula to a permutation question | `wrong_formula` | `permutation_combination_confusion` | The error is the operation choice, not a formula transcription error. |
| Conditional probability: computes P(A given B) when P(B given A) is asked | Reverses the conditioning | `misread_quantity` | `conditional_reversed` | The conditioning direction is the conceptual error. |

The rule for generic ids: use `arithmetic_slip` only when a student sets up the
method correctly and makes a pure computational slip (wrong arithmetic on
correct intermediate values). Use `misread_quantity` only when a student
mis-reads a number directly from the question stem. Any conceptual error has a
more specific id.

**[enforced: adversarial audit, W4-4 and W4-5]** Tag accuracy is checked
against the 85% threshold on the audited sample. Batches that fail the threshold
are repaired and re-verified before promotion.

---

## 08 How enforcement works

| Rule | Enforced by | Gate type |
|---|---|---|
| Node is a leaf in the taxonomy | Tier 2 validator (`schema/validator/run_checks.py`) | Hard reject |
| Misconception id exists in canon | Tier 2 validator (`schema/validator/run_checks.py`) | Hard reject |
| Misconception id is family-scoped to the question's node | Tier 2 validator | Hard reject |
| Executable solution reproduces the key | Solution harness (W3-1) | Hard reject |
| Distractor values reproduce what their tagged misconception produces | Stage 3 blind verify and Stage 5 audit (specs/content-pipeline.md), not the solution harness | Hard reject (Stage 3, every item); sampled reject (Stage 5 audit) |
| Blind verifier agrees with the key | Blind verification pass (specs/content-pipeline.md, stage 3) | Hard reject |
| Stem: per-sentence length max 25 words (B1 gate; `quality.py` `B1_MAX_WORDS_PER_SENTENCE`) | B1 readability lint (W3-5) | Hard reject for generated batches; advisory for hand-authored items until lint ships. Note: the 60-word total stem length is a style guideline, not a machine-enforced gate. |
| Indian number formatting in money contexts | Notation lint (W3-5 per ADR 0015) | Hard reject for generated batches; advisory until lint ships |
| No banned voice patterns (contractions, exclamation marks) | Fellow-voice lint (W7-6) | Planned; not yet implemented (build-spec W7-6) |
| No em-dashes | Notation lint `NOTATION_VIOLATION` (ADR 0015 allowlist) | Hard reject |
| Tag accuracy above 85% on audited sample | Adversarial audit (W4-4, W4-5) | Gate A pass/fail |
| Blueprint coverage gaps closed first | Pipeline targeting (W4-3) | Process control; not a validator |
| Difficulty label plausible | Human review at audit | Review; recalibrated from telemetry after launch |
