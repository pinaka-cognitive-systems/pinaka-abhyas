# 0020 — FSRS-4.5 scheduler, mock ingestion, and workload balancing

Date: 2026-06-12
Status: decided
Supersedes: the scheduler rules in engine SPEC section 4 as decided under
ADR 0012's era (SM-2-lite, mock exclusion); ADR 0019 (the drill-to-schedule
pool, removed — see Consequences).

## Context

The scheduler was SM-2-lite: fixed 1d/6d openings, a single ease scalar, a
flat 0.5-day lapse. SM-2 is 1987-era; its known failure modes (interval
explosion under streaks, no memory model, ease death spirals) are why every
serious spaced-repetition system moved to FSRS, the published
free-spaced-repetition-scheduler family with a power-law forgetting curve and
a fitted memory model. FSRS runs in constant time per review with seventeen
fixed weights — fully local, zero runtime AI, within ADR 0004.

Separately, SPEC 4 ruled "a mock is measurement, not review practice": mock
events never touched schedules. The owner rejected the consequence (a
mock-only student had an empty queue), ADR 0019 added an app-side pool as a
bridge, and its Context already named the honest fix it was avoiding: engine
ingestion with workload control, deferred because a 100-question mock dumps
~40 same-day lapses on the student.

## Decision

1. **FSRS-4.5 memory model** (`engine-ts/src/fsrs.ts`): per-item stability S
   (days to 90% recall) and difficulty D in [1,10];
   R(t,S) = (1 + (19/81)·t/S)^-0.5; interval at the constant 0.9 retention
   target = S exactly. Binary product grades: wrong -> again, correct -> good;
   hard/easy are structurally unreachable. Weights are the published FSRS-4.5
   population defaults, pinned as named constants. Behavior is pinned by OUR
   golden vectors, not by claimed bit-parity with Anki or ts-fsrs. Per-user
   weight fitting is telemetry-era work, explicitly out of scope.
2. **Mocks ingest** (engine SPEC 4 rewritten): every graded event advances the
   item's schedule, mock mode included. Recalling an item in a mock is a real
   review (previously it earned nothing — the audited smell); missing one is a
   lapse that resurfaces. A skipped question is recorded correct=false and
   schedules as a lapse: it cost marks, and resurfacing it is the product's
   job. Hard/pace mocks (mode "drill", ADR 0018 ruling 11) already behaved
   this way; standard mocks now agree.
3. **Workload balancing** (`balanceSchedules`, run by replay after the bank
   reconcile): due dates bucket by UTC day and overflow rolls forward so no
   day holds more than MAX_DUE_PER_DAY = 12 reviews; an overflowing day keeps
   its lowest-stability (most fragile) entries, ties by item id; the roll
   preserves time of day. The pass is clock-free — the same event log lands
   every item on the same day on every load, and undone reviews age into
   overdue debt rather than being re-shuffled. With an exam set nothing rolls
   past the 3-day buffer edge; the final allowed day absorbs the remainder and
   may exceed the cap. Exam capping/compression and pack-transition transfer
   rules are unchanged.
4. **Schedule shape**: ItemSchedule drops `ease` and gains `stability` and
   `difficulty`; `intervalDays` (= stability at the 0.9 target),
   `consecutiveCorrect`, and `lapsed` stay because the app's review-queue copy
   reads them.

ADR 0019's pool is removed, not retained: schedules are derived state rebuilt
from the event log on every load (ADR 0009), so under ingestion even a
history recorded before this change schedules its mock wrongs on replay — the
pool's "wrong in a mock, no schedule entry" predicate is structurally empty.
The "From your mocks" Review section, the pool view-model, and the
exact-items drill hand-off it required are deleted; the walkthrough's
"Queued in Review · returns in Nd" line is now literally true from the
engine.

## Consequences

- Golden vectors regenerated (SPEC_VERSION 0.3); the diff is the signed-off
  breaking change. The Python cross-check (W1-12) is unaffected: its scope is
  SPEC section 3 mastery math, which this ADR does not touch.
- First-wrong reviews land ~12 hours out (S0(again) ≈ 0.49 d) instead of a
  flat 0.5 d — nearly identical opening cadence, but recovery after a lapse
  now depends on how established the memory was, and intervals grow from a
  fitted curve instead of a fixed ladder.
- A 100-question mock no longer floods a single morning: lapses spread at 12
  a day, most fragile first.
- The student-facing vocabulary is unchanged (interval badges, "missed
  twice", "got it right last time"); no copy claims a memory model, per the
  honesty constraints.
