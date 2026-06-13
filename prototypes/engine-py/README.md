> **ARCHIVED** — superseded by the TypeScript engine per ADR 0010.
> See `prototypes/engine-py/ARCHIVED.md` and `engine-ts/SPEC.md` for the current implementation.

# Pinaka Engine — v2 (Score-Driven)

A Python reference implementation of the Pinaka exam-diagnosis brain. Reads
UQS event-log records, computes per-node mastery with time-decay, tracks
misconceptions, schedules spaced-repetition reviews, selects the next action
in score-driven priority order, and produces an honest readiness estimate.

**Python 3 standard library only. No third-party dependencies.**

---

## North star

Maximize the student's predicted CA Foundation Paper 3 mark. Every
recommendation is justified in marks. Parameters are SIMPLE and PROVISIONAL;
real calibration (the reserved IRT fields) comes from the beta cohort, not from
constants tuned today.

---

## How to run the archived prototype

From the repository root:

```bash
# Run the tests
python3 -m pytest prototypes/engine-py/tests -v

# Or with stdlib unittest (no pytest needed)
python3 -m unittest discover prototypes/engine-py/tests -v

# Run the demo
python3 prototypes/engine-py/demo.py
```

---

## Module overview

| Module | Responsibility |
|---|---|
| `types.py` | Shared dataclasses: `Event`, `MasteryState`, `NodeMastery` (with pace fields), `SchedulerState`, `ItemSchedule`, `NextAction`, `ReadinessEstimate` (v2 fields) |
| `mastery.py` | Elo-style per-node mastery, time-decay (`effective_p`), per-node speed (`mean_pace_ratio`, `pace_status`), misconception tracking |
| `scheduler.py` | SM-2-lite spaced-repetition scheduling (unchanged from v1) |
| `value.py` | Exam-value helpers: `part_weight`, `headroom`, `base_priority`, `est_marks_gain` |
| `selector.py` | 4-tier score-driven next-action selection |
| `readiness.py` | Honest readiness estimate: smart-attempt policy, time feasibility, coarse band |
| `synthetic.py` | Synthetic student and event generator (v2: emits realistic `time_ms` per node) |
| `tests/` | pytest / unittest test suite |
| `demo.py` | End-to-end walkthrough with marks-framed output |

---

## Algorithm choices

### Mastery — Elo-style logit update + time-decay (`mastery.py`)

Maintains `p_node ∈ [0, 1]`, the estimated probability of answering a fresh
median-difficulty (L2) item on that skill node correctly.

**Elo update rule (kept from v1):**

```
logit(p) = log(p / (1 - p))
target = difficulty_target(difficulty_label)   # L1=0.85, L2=0.65, L3=0.45
outcome = 1 if correct else 0
K = K_SURPRISE (0.40) if surprising else K_NORMAL (0.25)
new_logit = old_logit + K * (outcome - target)
new_p = sigmoid(new_logit)
```

**v2: Time-decay at query time (forgetting) — provisional:**

```
effective_p = 0.5 + (p - 0.5) * 0.5 ** (days_since_last_seen / 30)
```

A node seen 30 days ago has its mastery moved halfway back toward 0.5.
Unseen nodes (p=0.5) are unaffected. `DECAY_HALFLIFE_DAYS = 30` is provisional.

**v2: Per-node speed tracking:**

```
pace_ratio = (time_ms / 1000) / expected_seconds   (per event)
mean_pace_ratio = running mean
pace_status = "on_pace" if mean_pace_ratio <= 1.0 else "slow"
```

`expected_seconds` comes from the item bank (L1=45, L2=75, L3=110 s).

### Scheduler — SM-2-lite (`scheduler.py`)

Unchanged from v1. Based on SuperMemo SM-2:

- **Correct:** interval = 1d → 6d → prev × ease; ease +0.1 (cap 4.0).
- **Wrong:** interval resets to 1.0d (0.5d for misconception-linked items); ease −0.2 (floor 1.3).
- **Priority:** items tied to active misconceptions bubble to the top of the due queue.

### Exam value and priority (`value.py`)

```
part_weight(node):  qa.bmath → 0.40, qa.lr → 0.20, qa.stats → 0.40
headroom(p):        max(0, TARGET_MASTERY - effective_p)   [TARGET_MASTERY = 0.80]
base_priority(node, p): part_weight * headroom
est_marks_gain(node, p): (part_marks / n_nodes) * 1.25 * headroom   [rough, for reason strings]
```

### Selector (`selector.py`) — 4-tier score-driven

1. **Due reviews** (spaced retention protects banked marks) → action `review`.
2. **Active recurring misconception** costing marks → action `remediate_misconception`:
   target the misconception's nodes until it stops recurring.
3. **Accurate but slow** on a high-value node → action `speed_drill`:
   timed practice to fix pace before running out of time in the exam.
4. **Practice** the node with the highest `base_priority` among LEARNABLE items
   (predicted success in `[0.40, 0.85]`, interleaved across parts, excluding
   recently served items) → action `practice`.

All reason strings are framed in marks:
- "high-weight area (~N marks of headroom)"
- "this misconception has cost ~M marks"
- "you are accurate but slow; at this pace you may not finish the paper"

### Readiness estimate (`readiness.py`) — v2

Sources: `schema/profiles/ca-foundation-qa/marking.json` and `blueprint.json`.

**Three v2 improvements over v1:**

1. **Smart-attempt policy** (negative-marking awareness):
   ```
   EV = 1.25 * P - 0.25
   Attempt if EV > 0 (P > 0.20); else skip (contributes 0, never negative)
   ```
   `predicted_mark` is under this policy; `naive_attempt_all_mark` is the naive
   all-100-attempted figure (so the app can show the value of smart skipping).

2. **Time feasibility** (120-min budget):
   ```
   est_time = sum over attempted questions of (pace_ratio * expected_seconds)
   time_feasible = est_time <= 120 min
   ```
   If over budget, greedily keep highest-EV questions that fit; `predicted_mark`
   is recomputed over that set.

3. **Honest coarse band**:
   - `predicted_mark` rounded to integer; band endpoints rounded to nearest 5.
   - `confidence` in `{low, medium}` — never `high`.
   - `insufficient_data` when `total_events < 20` or `band_width > 30`.
   - `is_estimate` always `True`.
   - `marks_lost_to_recurring_misconceptions` (rough estimate) for coaching.

---

## Honesty constraints (must never be removed)

1. **`is_estimate: true` always.** No code path sets it to `False`.
2. **`insufficient_data` with sparse data.** Fewer than 20 events, or band > 30
   marks wide: label is `"insufficient_data"`, numbers are `None`.
3. **Label tied to band, not point estimate.** `on_track` requires the *lower*
   bound to clear 40. `not_ready` requires the *upper* bound below 40. Otherwise
   `"borderline"`.
4. **No false precision.** Band rounded to nearest 5. `confidence` never `high`.
5. **Parameters are provisional.** Real calibration comes from the beta cohort.
   Every tunable constant is named and documented as provisional.

---

## CA Foundation Paper 3 constants (sources cited)

| Constant | Value | Source |
|---|---|---|
| Total questions | 100 | `marking.json` |
| Marks per correct | +1 | `marking.json` |
| Negative per wrong | −0.25 | `marking.json` |
| Pass threshold | 40 / 100 | `marking.json` |
| Part splits | 40 / 20 / 40 | `marking.json`, `blueprint.json` |
| Expected seconds L1/L2/L3 | 45 / 75 / 110 | spec / marking intent |
| Part weights | 0.40 / 0.20 / 0.40 | derived from 40/20/40 marks |
| TARGET_MASTERY | 0.80 | provisional |
| DECAY_HALFLIFE_DAYS | 30 | provisional |

---

## Provisional-parameter caveat

All numeric constants in this engine are starting points, not empirically
calibrated values. The engine's v1 job is to be **sane, honest, and
goal-aligned** on synthetic data. Real calibration (item difficulty parameters,
K-factors, decay rates, band widths) will be derived from the beta cohort's
anonymised event logs. Constants are named and documented so they can be
updated without structural changes.
