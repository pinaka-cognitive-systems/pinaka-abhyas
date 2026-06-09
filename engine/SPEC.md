# Pinaka engine — headless prototype spec

The exam-agnostic brain. It reads UQS event-log records and produces, with no UI and
no network: per-node and per-misconception mastery, a spaced-repetition schedule, the
next action to take, and an honest readiness estimate. This is a Python reference
prototype validated by synthetic histories. The production engine will be reimplemented
in the app stack later; this proves the logic and the heuristics.

## Constraints

- Python 3, standard library only. No third-party deps (so it runs anywhere).
- Pure functions in the core; no file or network I/O inside the logic modules.
- Honest by construction: readiness is always an estimate with a confidence band, never
  a guaranteed score. With sparse data it returns "insufficient data", not a confident
  number.

## Inputs

- Event-log records conforming to `schema/core/event-log.schema.json`
  (uqs-event-1). Key fields the engine uses: `item_id`, `tests` (skill node ids),
  `difficulty_label`, `mode`, `correct`, `selected_misconception`, `occurred_at`,
  `time_ms`, `resurfaced`.
- Item bank metadata: item_id -> {tests, difficulty_label}. For tests, synthesize a
  small bank; in production this comes from the content packs.
- Profile facts for readiness (hard-code the CA QA values, cite the source files):
  marking +1 / -0.25, pass 40/100, 100 questions, section split Business Maths 40 /
  Logical Reasoning 20 / Statistics 40 (from blueprint.json and marking.json). Map a
  node id to its part by prefix: `qa.bmath.*`, `qa.lr.*`, `qa.stats.*`.

## Components and algorithms

1. **Mastery per node** (`mastery.py`)
   - Maintain p_node in [0,1], the estimated probability of answering a fresh
     median-difficulty item on that node correctly.
   - Update per response with a difficulty-weighted rule. Suggested: Elo-style on the
     logit, with difficulty mapped L1<L2<L3 to target probabilities; correct moves the
     estimate up, wrong moves it down, and a surprising outcome (correct on hard, wrong
     on easy) moves it more. Document the rule and the K-factor.
   - Aggregate leaf nodes up to family and part by averaging (weighted by number of
     observations, with a low-confidence prior when observations are few).

2. **Mastery per misconception** (`mastery.py`)
   - From `selected_misconception` on wrong events, track per-misconception count and a
     recency-weighted rate. Output a ranked "recurring misconceptions" list, most
     active and recent first. A misconception counts as recurring above a small
     threshold (for example seen >= 3 times and recently).

3. **Spaced-repetition scheduler** (`scheduler.py`)
   - Per item, track an interval and an ease (SM-2-lite). Correct -> interval grows by
     ease; wrong -> interval resets to a short value and ease drops a little. An item is
     due when last_seen + interval <= now. Output the due queue, soonest first.
   - Prioritise resurfacing items the student got wrong and items exercising their
     active misconceptions.

4. **Next-action selector** (`selector.py`)
   - If reviews are due, recommend review. Otherwise recommend a fresh item whose
     predicted success (from node mastery vs item difficulty) sits in a target band
     (about 0.6 to 0.8), weighted toward weak nodes and active misconceptions, and
     interleaved across topics. Avoid recently served items. Return the chosen item (or
     "review") plus a short human-readable reason.

5. **Readiness estimate** (`readiness.py`)
   - For each section, estimate P(correct) from that section's node mastery. Expected
     score = sum over attempted of (P_correct * 1 - (1 - P_correct) * 0.25), assuming
     the student attempts all 100 (state this assumption). Sum to a predicted mark out
     of 100.
   - Confidence band: width driven by how much data backs the estimate (events and node
     coverage). Few events -> wide band or "insufficient data".
   - Output: {predicted_mark, low, high, distance_to_pass = predicted - 40, label}.
     label in {insufficient_data, not_ready, borderline, on_track}, tied to the band
     relative to 40. Always carry `is_estimate: true`.

## Synthetic data (`synthetic.py`)

- A generator that, given a "true student" (true p per node, plus a set of
  misconceptions they are prone to), simulates a sequence of events over time: serves
  items on various nodes/difficulties, decides correct/incorrect by the true p, and on a
  wrong answer emits one of the student's misconceptions as `selected_misconception`.
  Timestamps advance so the scheduler can be exercised.

## Tests (`tests/`, pytest, stdlib `unittest` acceptable)

- Mastery rises with correct streaks and falls with wrong streaks; the weakest true
  node ends with the lowest estimated mastery.
- A repeatedly triggered misconception appears at the top of the recurring list.
- Scheduler: a missed item becomes due sooner than a mastered one; intervals grow on
  repeated success.
- Selector: with reviews due it returns review; otherwise it picks a weak node and stays
  in the success band; it does not repeat the just-served item.
- Readiness: a strong synthetic student predicts at or above 40 with a reasonable band; a
  weak one predicts below 40; a near-empty log returns insufficient_data, not a confident
  number; readiness increases as the same student improves over time.

## Deliverables

- `engine/` package: `types.py`, `mastery.py`, `scheduler.py`, `selector.py`,
  `readiness.py`, `synthetic.py`, `__init__.py`.
- `engine/tests/` with the tests above, all passing under `python3 -m pytest engine/tests`
  (or `python3 -m unittest`).
- `engine/demo.py`: run a synthetic student through the full engine and print mastery,
  due queue, next action, and readiness, so the behaviour is inspectable.
- `engine/README.md`: how to run, the algorithm choices, and the honesty constraints.
