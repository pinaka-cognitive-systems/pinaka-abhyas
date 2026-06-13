> **ARCHIVED** — superseded by the TypeScript engine per ADR 0010.
> See `prototypes/engine-py/ARCHIVED.md` and `engine-ts/SPEC.md` for the current implementation.

# Pinaka engine — v2 design (score-driven)

Supersedes the v1 generic loop. The engine optimizes for ONE thing: the student's
predicted CA Foundation Paper 3 mark. Every recommendation is justified in marks.
Validated on synthetic histories. Python 3 standard library only, pure-functional core,
honest outputs.

## North star

Maximize predicted mark = improve high-value weak areas first, finish the paper on time,
stop losing marks to recurring misconceptions, and retain via spaced review. Parameters
are SIMPLE and PROVISIONAL; real calibration (the reserved IRT fields) comes from the
beta cohort, not from constants tuned today. The engine's v1 job is to be sane, honest,
and goal-aligned, proven on synthetic data. It stays a clean reference; the production
port to the app stack is later, so do not gold-plate.

## Exam facts (constants; cite marking.json and blueprint.json)

- Marking +1 correct, -0.25 wrong, 0 unattempted. 100 questions. Pass 40.
- Parts by marks: `qa.bmath` 40, `qa.lr` 20, `qa.stats` 40.
- Per-question time target from `expected_seconds` (L1 45, L2 75, L3 110). Paper budget 120 min.

## Item bank

`{item_id: {tests:[node], difficulty_label, expected_seconds}}`. The synthetic generator
builds it; in production it comes from the content packs.

## Signals (`mastery.py`)

- Node mastery `p` in [0,1], Elo-on-logit streaming update (keep v1).
- **Time-decay at query time** (forgetting): `effective_p = 0.5 + (p - 0.5) * 0.5 ** (days_since_last_seen / DECAY_HALFLIFE_DAYS)`, `DECAY_HALFLIFE_DAYS = 30`. Provisional.
- **Speed per node**: running mean of `pace_ratio = (time_ms/1000) / expected_seconds`. `pace_status` = on_pace if mean pace_ratio <= 1.0 else slow.
- Misconception hits: recency-weighted (keep v1); recurring if >= 3 hits and recent.

## Readiness (`readiness.py`) — smart strategy + time feasibility

1. Section P_correct from decayed node mastery (prior 0.5 unseen).
2. Per-question expected value `EV = 1.25 * P - 0.25`. **Attempt policy**: attempt if `EV > 0` (P > 0.2); otherwise skip (contributes 0, never negative).
3. **Time feasibility**: estimated paper time = sum over attempted questions of their expected pace (use the student's measured pace_ratio x expected_seconds where known, else expected_seconds). If > 120 min, the student cannot attempt all; greedily keep the highest-EV questions that fit the budget, skip the rest. Section-level approximation is fine.
4. `predicted_mark` = sum of EV over the attempted set under the policy. Also compute `naive_attempt_all_mark` for comparison, so the app can show the value of skipping and finishing on time.
5. **Honest band**: margin grows when data is thin or coverage is low. Round `predicted_mark` to an integer and the band to the nearest 5. `confidence` in {low, medium}. Return `insufficient_data` (no number) when events < 20 or the band is too wide. `is_estimate` always true. Include a short plain-English `note`. No false precision.
6. Also return `time_feasible` (bool), `est_minutes`, and `marks_lost_to_recurring_misconceptions` (rough estimate) so the app can coach.

## Exam value and priority (new: `value.py`)

- `part_weight(node)` by prefix: qa.bmath 0.40, qa.lr 0.20, qa.stats 0.40.
- `headroom(node) = max(0, TARGET_MASTERY - effective_p)`, `TARGET_MASTERY = 0.8`.
- `base_priority(node) = part_weight * headroom`.
- `est_marks_gain(node)` ~ `(part_marks / n_inscope_leaf_nodes_in_part) * 1.25 * headroom` — a ROUGH figure for the reason string only; label it approximate.

## Next action (`selector.py`) — score-driven, in priority order

1. **Due reviews** (spaced retention protects banked marks) -> action `review`.
2. **Active recurring misconception** that is costing marks -> action `remediate_misconception`: serve practice targeting that misconception's node(s) until it stops recurring.
3. **Accurate but slow** on a high-value node -> action `speed_drill`: timed practice to fix pace.
4. Else -> action `practice`: the node with the highest `base_priority` among LEARNABLE items (predicted success in a soft band ~0.40-0.85 so it is improvable, not hopeless), interleaved across parts, excluding recently served.

Return `action`, `target` (node and/or item), and a **marks-framed `reason`**, e.g. "high-weight area, ~N marks of headroom", or "this misconception has cost ~M marks; let's kill it", or "you are accurate but slow here, and at this pace you will not finish the paper".

## Smart-attempt guidance (for the app, surfaced by the engine)

Skip only when you would be guessing among all four options AND you are short on time. If
you can eliminate even one option, P rises and attempting is positive EV. The engine
exposes, per practiced item, whether attempting was the right call, so the habit is taught.

## Synthetic data (`synthetic.py`)

Extend to emit `time_ms` per event from a per-node true pace times `expected_seconds`, so
speed and feasibility are testable. Keep true per-node mastery and prone misconceptions.

## Tests (`tests/`)

Keep the v1 assertions that still hold, plus:
- **Score-driven**: two equally-weak nodes, one in a 40-mark part and one in the 20-mark part, selector prefers the 40-mark one. A near-mastered high-weight node is deprioritized vs a weak one.
- **Speed**: an accurate-but-slow node yields a `speed_drill`; readiness flags `time_feasible=False` when pace is slow across the paper.
- **Smart strategy**: `predicted_mark >= naive_attempt_all_mark`; a section with P < 0.2 contributes 0 (skipped), never negative.
- **Misconception extinction**: a recurring misconception triggers `remediate_misconception`; once its hits age out, its priority drops.
- **Honesty**: sparse log -> `insufficient_data`; band is coarse; `is_estimate` always true.

## Deliverables

- Updated `engine/` modules (+ new `value.py`); keep `scheduler.py` (SM-2, it is retention).
- `engine/tests/` updated, all passing under `python3 -m pytest engine/tests` (or unittest).
- `prototypes/engine-py/demo.py` prints recommendations framed in marks (predicted mark, what to do next and why, time feasibility, top recurring misconception).
- `prototypes/engine-py/README.md` updated: the score-driven design and the provisional-parameter caveat.
