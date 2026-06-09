# Pinaka Engine — Headless Prototype

A Python reference implementation of the Pinaka exam-diagnosis brain. Reads
UQS event-log records, computes per-node mastery, tracks misconceptions,
schedules spaced-repetition reviews, selects the next action, and produces an
honest readiness estimate.

**Python 3 standard library only. No third-party dependencies.**

---

## How to run

From the repository root:

```bash
# Run the tests
python3 -m pytest engine/tests -v

# Or with stdlib unittest (no pytest needed)
python3 -m unittest discover engine/tests -v

# Run the demo
python3 engine/demo.py
```

From inside `engine/`:

```bash
python3 -m pytest tests/ -v
python3 demo.py
```

---

## Module overview

| Module | Responsibility |
|---|---|
| `types.py` | Shared dataclasses: `Event`, `MasteryState`, `NodeMastery`, `SchedulerState`, `ItemSchedule`, `NextAction`, `ReadinessEstimate` |
| `mastery.py` | Per-node and per-misconception mastery estimation |
| `scheduler.py` | SM-2-lite spaced-repetition scheduling |
| `selector.py` | Next-action selection (review vs. fresh practice) |
| `readiness.py` | Honest readiness estimation with confidence band |
| `synthetic.py` | Synthetic student and event generator |
| `tests/` | pytest / unittest test suite |
| `demo.py` | End-to-end walkthrough with printed output |

---

## Algorithm choices

### Mastery — Elo-style logit update (`mastery.py`)

Maintains `p_node ∈ [0, 1]`, the estimated probability of answering a fresh
median-difficulty (L2) item on that skill node correctly.

**Update rule:**

```
logit(p) = log(p / (1 - p))
target = difficulty_target(difficulty_label)   # L1=0.85, L2=0.65, L3=0.45
outcome = 1 if correct else 0
K = K_SURPRISE (0.40) if surprising else K_NORMAL (0.25)
new_logit = old_logit + K * (outcome - target)
new_p = sigmoid(new_logit)
```

"Surprising" means correct on L3 or wrong on L1 — these are more informative
so the K-factor is higher.

**K-factor rationale:** K=0.25 moves p by at most ~6 percentage points from
the midpoint per event — responsive enough to track learning but stable enough
to resist noise. K_SURPRISE=0.40 is 60% larger, matching the higher information
content of unexpected outcomes.

**Prior:** every unseen node starts at p=0.5 (maximum uncertainty, 0
observations). Aggregation uses a prior weight of 2 pseudo-observations at 0.5,
so a node with 1 real event is not confidently far from the prior.

**Misconception recency:** exponential decay with half-life = 14 days. A
misconception triggered 3 times last week scores much higher than one triggered
10 times a year ago.

### Scheduler — SM-2-lite (`scheduler.py`)

Based on the SuperMemo SM-2 algorithm, simplified:

- **Correct:** `consecutive_correct++`; interval = 1d → 6d → prev × ease;
  ease increases by 0.1 (capped at 4.0).
- **Wrong:** `consecutive_correct = 0`; interval resets to 1.0d (0.5d for
  misconception-linked items); ease decreases by 0.2 (floor 1.3).
- **Due:** item is due when `last_seen + interval ≤ now`.
- **Priority boost:** items that triggered an active misconception get a shorter
  lapse interval (0.5d) and appear first in the due queue.

### Selector (`selector.py`)

1. If any items are due for review → return the top due item (misconception
   items first).
2. Otherwise → score all candidates from the item bank:
   - Predicted success = mean node mastery × difficulty adjustment.
   - Prefer items in the **target band [0.60, 0.80]** (not too easy, not
     too hard — the desirable difficulty zone).
   - Secondary preferences: covers an active misconception; exercises a weak
     node (low average mastery); different topic from the last served item
     (interleaving).
   - Exclude recently served items to prevent back-to-back repetition.

### Readiness estimate (`readiness.py`)

Sources: `schema/profiles/ca-foundation-qa/marking.json` and `blueprint.json`.

**Expected score formula** (assuming all 100 questions attempted):

```
E[contribution_i] = P_correct_i × 1 + (1 - P_correct_i) × (−0.25)
                  = 1.25 × P_correct_i − 0.25

E[total] = Σ_i E[contribution_i]
```

Part P(correct) values come from observation-weighted aggregation of leaf-node
masteries, with a prior of 0.5 on unseen nodes.

**Confidence band:**

```
half_width = (BASE_WIDTH / sqrt(n_events)) × coverage_penalty
coverage_penalty = max(1.0, 3.0 − node_coverage_fraction × 2.0)
```

More events → narrower band. Higher topic coverage → narrower band.

---

## Honesty constraints

These are hard-coded and must never be removed:

1. **`is_estimate: true` always.** The `ReadinessEstimate.is_estimate` field is
   always `True`. There is no code path that sets it to `False`.

2. **`insufficient_data` with sparse data.** If fewer than 20 events have been
   logged, or if the confidence band exceeds 30 marks wide, the label is
   `"insufficient_data"` and `predicted_mark`, `low`, `high`, and
   `distance_to_pass` are all `None`. No number is returned.

3. **Label tied to band, not point estimate.** `on_track` requires the *lower*
   bound of the band to clear the pass threshold (40 marks). `not_ready`
   requires the *upper* bound to be below 40. When the pass threshold falls
   inside the band, the label is `"borderline"` — explicitly acknowledging
   uncertainty.

4. **Assumption stated.** Every `ReadinessEstimate` carries a human-readable
   `assumption` field explaining that the model assumes all 100 questions are
   attempted and is an estimate until empirically calibrated.

5. **No predicted score we cannot back.** Readiness is an estimate until the
   engine accumulates enough events for empirical calibration. The confidence
   band communicates this directly.

---

## CA Foundation Paper 3 constants (sources cited)

| Constant | Value | Source |
|---|---|---|
| Total questions | 100 | `marking.json` (confirmed against ICAI sample paper May 2025) |
| Marks per correct | +1 | `marking.json` |
| Negative per wrong | −0.25 | `marking.json` |
| Pass threshold | 40 / 100 | `marking.json` |
| Part splits | 40 / 20 / 40 | `marking.json`, `blueprint.json` |
| Part prefixes | `qa.bmath`, `qa.lr`, `qa.stats` | `blueprint.json` |
