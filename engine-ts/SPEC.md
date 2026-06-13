# Engine specification

Version: 0.3 (2026-06-12). Governs `engine-ts/`. ADRs 0009, 0010, 0012, 0020, and
0021 bind this spec.
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
verification_status, optional empirical.difficulty_b, optional superseded_by,
optional targets_misconceptions (misconception ids the item's distractors bait;
a selection aid for section 5 remediation). Items with status quarantined or
retired are tombstones: present for history, never selectable.

**Blueprint**: parts (id, marks, questions) holding sections holding families
(nodeId, quota) — the mark-weighting selection and readiness read.
**Marking**: marksPerCorrect, negativePerWrong, marksPerUnattempted,
numQuestions, passMark, durationMinutes.

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

## 4. Scheduler (W1-4, W1-5; ADR 0009, ADR 0020)

FSRS-4.5 memory model per item, binary outcomes only (the SM-2-lite rules this
section previously specified are superseded by ADR 0020):

- Per-item state: difficulty D in [1, 10] and stability S in days, with
  retrievability R(t, S) = (1 + FACTOR·t/S)^DECAY, DECAY = -0.5,
  FACTOR = 19/81 (so R(S, S) = 0.9 exactly). The interval for target retention
  r is I(r, S) = (S/FACTOR)·(r^(1/DECAY) - 1); the target is the constant 0.9,
  at which I = S exactly.
- Grades: wrong -> again (1), correct -> good (3); hard/easy are unreachable.
  First encounter: S0(G) = w[G-1], D0(G) = clamp(w4 - (G-3)·w5, 1, 10). Review:
  D' = clamp(w7·D0(good) + (1-w7)·(D - w6·(G-3)), 1, 10) (mean reversion);
  success S' = S·(e^w8·(11-D)·S^(-w9)·(e^(w10·(1-R)) - 1) + 1); lapse
  S' = min(S, w11·D^(-w12)·((S+1)^w13 - 1)·e^(w14·(1-R))), never above the
  pre-lapse S. Weights are the FSRS-4.5 population defaults pinned in
  src/fsrs.ts; behavior is pinned by OUR golden vectors, not by bit-parity
  claims against other implementations. Stability floors at 0.01 days.
- A wrong answer marks the entry lapsed (due in S0(again) ≈ 0.49 days on a
  first miss) and resets the streak; a same-day re-answer has R ≈ 1 and earns
  no stability, by construction.
- **Every mode advances schedules, mock included** (ADR 0020, superseding the
  earlier mock-exclusion rule): recalling an item inside a mock is a real
  review and missing one is a lapse that must resurface. Only post-exam events
  are ignored.
- **Workload balancing.** After replay folds all events and reconciles against
  the bank, `balanceSchedules` buckets entries by the UTC day of their due
  date and rolls overflow forward so no day holds more than MAX_DUE_PER_DAY
  (12) entries; an overflowing day keeps its lowest-stability entries (ties by
  item id ascending) and pushes the rest one day at a time, preserving time of
  day. The pass is clock-free: the same event log lands every item on the same
  day on every load; undone reviews age into overdue debt and are never
  re-shuffled. With an exam set, nothing rolls past the buffer edge; the last
  allowed day absorbs the remainder and may exceed the cap.
- **Exam awareness.** When examMs is set: due dates cap at examMs minus a 3-day final
  revision buffer; an interval longer than half the days remaining compresses to half
  the days remaining (floor 1 day). No event, no schedule entry, past the exam.
- **Pack transitions.** A scheduled item absent from the bank: if its tombstone names
  superseded_by, the schedule transfers to the successor (same due date, same memory
  state); otherwise the entry is dropped. Replay applies the same rule, so import and
  live update agree.

## 5. Selection (W1-5, W1-6, W1-7)

### 5.0 Read-time hierarchical pooling (ADR 0021)

Selection and readiness read skills through an empirical-Bayes layer; the
stored section-3 state is never modified (the W1-12 cross-check scope is
unchanged). Real packs tag leaf nodes while the blueprint weighs family nodes,
so an exact-match read saw a fresh prior for every family — pooling closes
that gap and regularizes thin estimates:

- Every attempted node contributes its drifted (rating, deviation, slow
  rating) to each proper ancestor prefix with >= 2 dot segments (part level
  and below; the whole exam is not a pool), precision-weighted by
  1/deviation^2.
- A node's prior is the nearest pool with evidence — its own descendants
  first, then ancestors with the node's own contribution subtracted (a node is
  never its own prior). Pool variance = (member count / summed precision) +
  SIBLING_VARIANCE (0.25, the between-sibling spread on the logit scale).
- Effective skill = w·own + (1-w)·prior with w = n/(n + K), n = own attempts,
  K = SHRINKAGE_PRIOR_STRENGTH (4); variances blend the same way, deviation
  clamped to the section-3 bounds. With no own attempts the prior speaks alone;
  with no neighborhood evidence the own drifted state passes through.
- "Seen" for the tier-3/tier-4 boundary below means any evidence, own or
  descendant. K and SIBLING_VARIANCE are provisional until calibrated.

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
3. **Learnable-band practice.** Nodes with (r - anchor(L2)) inside [-1.2, 0.6] and
   deviation still above 0.5, weighted by blueprint marks; serve the difficulty label
   nearest the student's rating.
4. **Coverage.** Unseen blueprint nodes in descending mark weight; L1 entry items
   first.

Determinism: all candidate orderings end with (score desc, node_id asc, item_id asc).
No dict-order dependence anywhere.

## 6. Readiness (W1-8; this section is the contract)

- Per-node mastery and deviation aggregate to expected marks per blueprint section:
  expected questions per node from the blueprint quotas, P(correct) from mastery
  with every exam question modelled at the L2 anchor (ICAI classifies Paper 3 as
  100% application level; a per-section difficulty mix becomes an input when a
  blueprint ships one), marks EV with negative marking. Family skills are read
  through the section 5.0 pooling layer (ADR 0021), so leaf-tagged practice
  reaches the family-level plan.
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

`replay(events, bank, nowMs, examMs?, options?)` folds sections 3 and 4 over the
ordered event list, applying ADR 0009 rules: tombstone handling, supersession
transfer, taxonomy migration (options.taxonomyMigration, an old-id -> new-id map),
and re-scoring (options.rescoreTable: recompute correct/selected_misconception
from raw response when the bank's current key differs from the event's recorded
item_content_hash version) when a re-score table ships with the pack. After the fold,
schedules pass through bank reconciliation and then workload balancing (section 4);
both passes are clock-free, so the rebuilt schedule map depends only on the events,
the bank, and examMs.

## 8. Vectors (W1-10)

The emitter (`vectors/emit.ts`, run as `npx -y tsx vectors/emit.ts` from
`engine-ts/`; its `buildGolden()` is shared with the regression test) writes
`vectors/golden.json`: fixed-seed scenario name, inputs (events, bank, nowMs,
examMs), and outputs (per-node mastery {r, rd} rounded to 1e-9, full schedule,
first 10 nextAction ids with reasons, readiness). Scenario families: fresh student,
converging student, improving (non-stationary) student, lapsing student, idle-gap
student, pack transition (removal, supersession, re-key), cold start, exam-week
compression, mock anchoring (which also pins mock schedule ingestion per ADR 0020),
and leaf-tagged pooling (production pack shape, ADR 0021). Vectors are regenerated
only deliberately; CI replays them on every change.

## 9. Numeric discipline

No Date.now, no Math.random. All exported floats round at the vector boundary to 1e-9.
Internal arithmetic is IEEE double; cross-implementation checks (W1-12) use tolerance
1e-6 on ratings and deviations, exact on integers and orderings.
