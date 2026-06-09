# Content quality and bank health (deterministic, advisory)

Beyond Tier 1 (single-record schema) and Tier 2 (cross-record correctness), this layer
checks the PEDAGOGICAL quality of a question bank: surface tells a test-taker could
exploit, balance, duplication, and coverage. These produce WARNINGS, not validity
violations — run them as a pre-publish gate when generating or scaling content. Python 3
standard library only, pure functions, fast. Do NOT duplicate Tier 1/Tier 2 correctness
checks; this is quality and advisory only.

Thresholds are named constants at the top of each module, documented and PROVISIONAL
(tune against the beta bank, not now).

## Per-item lint -> warnings per item

- `style`: no em dash; no `$` or `$$` LaTeX; no forbidden filler ("Furthermore",
  "Moreover", "It can be observed that", "Therefore the correct answer is"); no
  `{{asset:` reference (assets disabled in v1).
- `options_distinct`: the four option texts are distinct after whitespace/case
  normalization. Warn on any duplicate.
- `correct_not_longest`: warn if the correct option is the UNIQUE longest option (a
  length tell). Soft warning.
- `rationale_substantive`: every wrong option's rationale is non-trivial (length above a
  small floor and not a stock phrase). The schema requires the field; this checks it says
  something.

## Pack / bank-health report -> metrics + PASS/WARN

- `answer_position_balance`: distribution of `answer_key.correct` over option keys. For a
  pack of at least MIN_PACK (20) items, warn if any key's share falls outside [0.10, 0.40]
  or the max-min spread exceeds 0.25. Report the counts.
- `correct_longest_rate`: fraction of items where the correct option is the unique
  longest. Warn if above 0.35 (chance is ~0.25). List the offending ids.
- `near_duplicates`: cluster items whose normalized-stem word-shingle (k=3) Jaccard
  similarity is at least NEAR_DUP_THRESHOLD (0.80). Report clusters; these are likely the
  same problem reskinned.
- `misconception_usage`: count per misconception id across all wrong options. Warn if any
  single id exceeds OVERUSE_SHARE (0.25) of all tags. List canon ids NEVER used (a
  coverage gap), informational.
- `difficulty_distribution`: counts of L1/L2/L3. Informational; warn only on extreme skew
  (a single level above 0.85 of the pack).
- `blueprint_coverage`: items per taxonomy family and per part (qa.bmath / qa.lr /
  qa.stats prefixes). Report families with zero items (gaps). Compare per-part share to
  the 40/20/40 marks split and warn if a part is badly under-represented.

## Mock assembler

Given a bank, the blueprint, marking, a `size` (default 100), and an integer `seed`
(deterministic):

- Allocate per-part question counts from the blueprint (for size 100: BM 40, LR 20, Stats
  40; scale proportionally otherwise).
- Within a part, allocate across families by the blueprint section weightage midpoints.
- Select items per family: prefer a difficulty spread, exclude near-duplicates of
  already-selected items, cap MAX_PER_SUBTOPIC (2) per subtopic, and balance the
  correct-answer positions across the paper toward ~25% each.
- If the bank cannot fill a family or part, fill what it can and record the SHORTFALL.

Output: `{ items: [ordered ids], by_part, by_family, answer_position_counts, max_marks,
shortfalls: [{scope, needed, available}] }` plus a human-readable summary. Deterministic
for a given seed (use `random.Random(seed)`, no global random, no wall-clock).

With a small bank (the 24-item spike) the assembler will mostly report shortfalls — that
IS the useful output: it quantifies, per family, how far the bank is from producing a mock.

## Deliverables

- `schema/validator/quality.py` — per-item lint + pack/bank-health checks (pure functions).
- `schema/validator/assemble.py` — the mock assembler.
- `schema/validator/run_quality.py` — runner: load a bank directory of item JSONs (or a
  `pack.json`), print the quality report and an assembly dry-run with shortfalls. Always
  exit 0 (advisory), with a clear WARN summary.
- `schema/validator/tests/` — stdlib pytest/unittest covering: balanced vs skewed
  answer-position packs; a length-tell pack; a near-duplicate pair; an overused
  misconception; assembler allocation and shortfall on a small bank; determinism (same
  seed yields the same paper).
- Run `run_quality.py` on `schema/profiles/ca-foundation-qa/genspike/items` and surface the
  real findings.

Constraints: Python 3 stdlib only. Pure-functional core. Named, documented, PROVISIONAL
thresholds. Advisory exit code. No overlap with the Tier 1/Tier 2 correctness validators.
