# Engine specification

Version: 0.2 (2026-06-10). Governs `engine-ts/`. ADRs 0009, 0010, 0012 bind this spec.
The W1-12 cross-check reimplements section 3 from this document alone; if this document
is not enough to reproduce the math, the document is the bug.

## 1. Principles

- Pure and deterministic. The engine is a set of pure functions over an event list, an
  item bank, a clock value, and an optional exam date. No wall clock, no randomness, no
  IO. Same inputs, bit-identical outputs.
- Event sourcing (ADR 0009). All state is rebuilt by replaying events. No derived state
  is authoritative.
- Honesty. Confidence is never above medium. Every point estimate travels with its
  uncertainty. The engine never claims what it cannot back.
- Marks framing. Recommendations are justified in expected marks under the marking
  scheme (+1 correct, -0.25 wrong, 40 to pass, 100 questions, 120 minutes).

## 2. Inputs

**Event** (mirrors `uqs-event-2`): event_id, occurredAtMs (see 2.1), item_id,
item_content_hash, taxonomy_version, tests (node ids), difficulty_label (L1|L2|L3),
item_type (single_best|numeric_entry), mode (practice|drill|review|mock),
correct (boolean), selected_misconception (id or null), response (raw, per ADR 0009),
time_ms, resurfaced (boolean), device_context (optional).

**Bank**: items with id, tests, difficulty_label, item_type, expected_seconds,
verification_status, optional empirical.difficulty_b, optional superseded_by.
Items with status quarantined or retired are tombstones: present for history, never
selectable.

**Clock**: nowMs, always a parameter. **Exam**: examMs, optional ("undecided" path).

### 2.1 Time normalization (W1-2)

ISO-8601 inputs parse to epoch milliseconds at the boundary, once. Strings without an
offset are treated as UTC, by contract. Events are ordered by (occurredAtMs ascending,
event_id ascending as tie-break), never by string comparison.

## 3. Mastery (ADR 0012; implemented, certified, refutation-hardened)

The estimator is a TRACKER, not a static-ability estimator: a learner's ability is
non-stationary, so certainty saturates at a floor and recent evidence dominates.
Order is signal: forty wrongs then sixty rights reads as an improved student, by
contract.

Per node: rating r, deviation rd, slow reference rating sr, on the shared logit
scale of `src/scale.ts` (anchors L1=-1, L2=0, L3=+1; guessing floor c: 0.25
single_best, 0 numeric_entry; prior r=0, rd=1.5; rd bounds [0.25, 1.5]; |r| <= 4).

- Expectation: E = c + (1-c) * sigmoid(r - b), b = empirical.difficulty_b if present
  else the label anchor.
- Update (one-step Laplace with process noise): with p = sigmoid(r-b),
  dEdr = (1-c)p(1-p), var = max(E(1-E), 1e-9), info = dEdr^2/var,
  priorVar = min(rd^2 + Q, 1.5^2) with Q = 0.003 per event,
  prec' = 1/priorVar + info, r' = clamp(r + ((y-E) dEdr/var)/prec'),
  rd' = clamp(sqrt(1/prec')). Steady-state deviation ~0.40; effective evidence
  window ~53 events per skill.
- Slow reference rating: sr equals r while attempts < 3 (a prior-contaminated seed
  would dilute the signal), then sr' = sr + (r' - sr)/80 per event. The drift
  signal r - sr reads "current ability versus early ability" and feeds the
  readiness band extension (section 6).
- Idle drift, applied before each update and on read, ONLY to skills with at
  least one observed event (a never-attempted skill is the prior; its lastEventMs
  sentinel of 0 is not a timestamp): variance grows by ((1.5^2-0.25^2)/90) per
  idle day, capped at prior; r and sr fade toward 0 by
  exp(-max(0, idleDays - 30)/120). The 30-day grace exists so normal practice
  rhythms carry no fade (a weekly student must not be biased low). A state
  missing sr (imported from before the field) reads as "no drift", never NaN.
- An event updates every node in its tests list.

Certified claims (tests/ and refutation/ enforce all of these): stationary
convergence within 0.1 probability at 200 events (0.12 near the anchor, where the
tracker's steady-state error peaks) for abilities |theta| <= 2.5; an improving
student (-1 to +2 over 300 events) is tracked to the current ability, not the
lifetime mean; zero clamp-pinning for |theta| <= 2.5 and at most 5% touch at
theta = 3; the 90% mastery interval covers at >= 85% across simulated students.
Abilities beyond |theta| ~ 2.5 approach the floor/ceiling identifiability limits
of four-option MCQ evidence and carry no precision guarantees.

## 4. Scheduler (W1-4, W1-5; ADR 0009)

Per item, binary outcomes only:

- First correct: due in 1 day. Second consecutive correct: 6 days. Then
  interval = previous * ease. Ease starts 2.5, +0.1 per correct, -0.2 per wrong,
  floor 1.3, cap 3.0.
- Wrong: item becomes a lapse, due in 0.5 days, interval resets to 1 day, streak resets.
- Mock-mode events update mastery but do not create or advance item schedules
  (a mock is measurement, not review practice).
- **Exam awareness.** When examMs is set: due dates cap at examMs minus a 3-day final
  revision buffer; an interval longer than half the days remaining compresses to half
  the days remaining (floor 1 day). No event, no schedule entry, past the exam.
- **Pack transitions.** A scheduled item absent from the bank: if its tombstone names
  superseded_by, the schedule transfers to the successor (same due date, same ease);
  otherwise the entry is dropped. Replay applies the same rule, so import and live
  update agree.

## 5. Selection (W1-5, W1-6, W1-7)

`selectNextAction(state, bank, blueprint, nowMs, sessionLength=20, session?)` returns a
prioritized action with a reason string in marks terms. The blueprint is a parameter
(the engine holds no globals); the optional session-progress value is threaded between
calls so the review budget is enforceable without mutation or a wall clock; examMs is
not a selection input because the scheduler already applied exam capping when producing
due dates. Priorities:

1. **Misconception remediation.** A misconception with >= 2 occurrences whose last
   occurrence is recent (<= 14 days) and whose nodes carry blueprint weight: serve an
   unseen-or-stale item from an affected node targeting that misconception. Remediation
   outranks routine review by design (the audited starvation inversion).
2. **Budgeted review.** Due items, most overdue first, but never more than 50% of the
   session's actions. Reviews are served node-level: prefer a sibling item on the same
   node not seen in 7 days; fall back to the original item only when no sibling exists.
   The original is always used for lapse review (seeing the exact error is the point).
3. **Learnable-band practice.** Nodes with |r - anchor(L2)| inside [-1.2, 0.6] and
   deviation still above 0.5, weighted by blueprint marks; serve the difficulty label
   nearest the student's rating.
4. **Coverage.** Unseen blueprint nodes in descending mark weight; L1 entry items
   first.

Determinism: all candidate orderings end with (score desc, node_id asc, item_id asc).
No dict-order dependence anywhere.

## 6. Readiness (W1-8; Opus implements, this section is the contract)

- Per-node mastery and deviation aggregate to expected marks per blueprint section:
  expected questions per node from the blueprint quotas, P(correct) from mastery
  against the section's difficulty mix, marks EV with negative marking.
- **Attempt policy (W1-7).** Attempting is positive-EV whenever estimated P > 0.20
  (blind guessing breaks even at 0.20 with +1/-0.25; with elimination it is higher).
  The policy: attempt everything when the time budget allows; when expected total time
  exceeds 120 minutes, drop the lowest-EV-per-second questions until it fits, using
  expected_seconds (empirical avg_seconds when present). Skipping is a time decision,
  never an ability verdict. Below-chance P is possible only on nodes with an active
  recurring misconception (worse than guessing is real there).
- **Band.** Variance = the independent binomial exam-day term per question, plus
  the rating-deviation term summed per family before squaring (a node's
  estimation error hits all its questions together). The reported band is the
  score EV +/- 1.645 sigma, floored at +/- 5 marks no matter how much data
  exists, then EXTENDED in the drift direction: driftMarks = 1.5 * sum over
  attempted questions of (P(current rating) - P(slow reference rating)) * swing.
  Positive drift (an improving student) extends the top of the band; negative
  drift extends the bottom. No momentum is added to the point estimate: the
  trailing value stays the claim, the band admits which way the truth likely
  sits, and the note urges a fresh mock when |drift| is material. Finally the
  whole band clamps structurally to the achievable score range
  [-numQuestions * negativePerWrong, numQuestions * marksPerCorrect]. Rounded to
  whole marks. Certified: band coverage >= 85% for stationary, improving, and
  declining simulated students.
- **Mock anchoring.** Completed mocks contribute their actual net scores: the readiness
  point estimate is a precision-weighted blend of the model EV and the recent-mock
  mean (mocks within 21 days, weight by recency). A model that disagrees with real
  mocks loses, visibly. Aggregation contract: mock events group by UTC calendar
  day; days with fewer than 25 answered questions are no anchor at all; each
  qualifying day's net-marks-per-answered rate projects onto the full paper with
  precision recency / (numQuestions^2 * 0.25 * swing^2 / answered), the true
  statistical precision of that projection, so a thin sample is a weak anchor by
  construction and can never dominate the model (W1-11 attack FF).
- **Confidence.** insufficient_data below 20 events or below 25% blueprint coverage.
  Otherwise low when mean deviation > 0.8 or coverage < 60%; else medium. Never higher,
  structurally.

## 7. Replay

`replay(events, bank, nowMs, examMs?)` folds sections 3 and 4 over the ordered event
list, applying ADR 0009 rules: tombstone handling, supersession transfer, taxonomy
migration map when present, and re-scoring (recompute correct/selected_misconception
from raw response when the bank's current key differs from the event's recorded
item_content_hash version) when a re-score table ships with the pack.

## 8. Vectors (W1-10)

`emitVectors(scenarios)` writes JSON: fixed-seed scenario name, inputs (events, bank,
nowMs, examMs), and outputs (per-node mastery {r, rd} rounded to 1e-9, full schedule,
first 10 nextAction ids with reasons, readiness). Scenario families: fresh student,
converging student, lapsing student, idle-gap student, pack transition (removal,
supersession, re-key), cold start, exam-week compression, mock anchoring. Vectors are
regenerated only deliberately; CI replays them on every change.

## 9. Numeric discipline

No Date.now, no Math.random. All exported floats round at the vector boundary to 1e-9.
Internal arithmetic is IEEE double; cross-implementation checks (W1-12) use tolerance
1e-6 on ratings and deviations, exact on integers and orderings.
