# 0019 — Mock mistakes reach Review as a drill-to-schedule pool

Date: 2026-06-12
Status: decided

## Context

The Engineering Handout (section 08) promises that a question enters the
review pool when answered wrong in any source. The engine SPEC (section 4,
ADR 0012) rules that mock-mode events never touch schedules: a mock is
measurement, not review practice. As shipped after ADR 0018, that left a gap
the owner rejected: a student who had only sat mocks had an empty review
queue, and their mock mistakes resurfaced only indirectly through adaptive
drill targeting.

Three options were weighed: (a) change the engine so mock wrongs create
schedule entries — golden-vector churn, cross-check rework, and a 100-question
mock floods the queue with same-day dues; (b) write synthetic practice events
on submit — fabricates attempts the student never made, violating the
event-sourcing honesty of ADR 0009; (c) surface undrilled mock wrongs as a
visible pool in Review, converted into the real spaced schedule by the
student's first drill of each item.

## Decision

Option (c). `mockReviewPool` (app/src/engine/insights.ts) lists every item
answered wrong in a mock that has no schedule entry, named by source mock and
ranked by misconception cost. The Review screen shows the pool under "From
your mocks" with the reason "Missed in {Mock NN} · drill once to schedule
it"; the Today recommendation points at the pool when nothing is due; the
Practice hub names it in the Review half. Drilling a pool item serves exactly
that item (the drill setup carries an item list; serving is restricted by
both a narrowed bank and a narrowed content map so engine review-priority
picks cannot escape the pool) and records an ordinary practice event — the
engine then schedules it by its own rules, and the item leaves the pool.

The engine is unchanged. No event is synthesized. Spacing intervals anchor on
an actual retrieval attempt rather than the exam sitting, which is the
pedagogically defensible anchor.

## Consequences

- The first-mock journey works: mock → mistakes wait in Review → each drill
  starts its spaced schedule. No due-tomorrow flood; the student sets the
  pace (Handout section 01: the student sets the rhythm).
- The reviews-due rail badge still counts scheduled dues only; the pool is
  surfaced through Today's recommendation and the Review screen.
- If a future ruling wants direct engine scheduling of mock wrongs, the pool
  UI remains as the staging surface and this ADR is superseded.
- Supersedes the "open contract conflict" note recorded in
  docs/design/build-spec.md section 8 on 2026-06-12.
