# ADR 0006: Elo mastery now, telemetry path to IRT

Date: 2026-06-10
Status: Accepted

## Context

The engine needs a per-node mastery signal from day one, before any real student
data exists. Item difficulty starts as an estimate, not a measured value. A proper
psychometric model such as IRT needs a population of real responses to calibrate,
which the project does not have at launch. The engine must be useful on cold-start
data and must improve as real data arrives, without a rewrite.

## Decision

v1 uses the existing Elo-style mastery update. It is already implemented and
tested, works from the first answer, and needs no calibrated item bank.

Difficulty labels ship as estimates and are recalibrated from real response data
over time. This is stated honestly in public docs. Readiness is presented as an
estimate, never as a predicted mark we cannot back.

The path to better calibration is opt-in anonymized telemetry. A random client id,
no PII, per-item id, the response, and time taken, batched and POSTed when online.
The collector is a Cloudflare Worker on the free tier, built only after the app
works. Every pack carries stable item IDs from day one so that collected responses
can be tied back to items for IRT calibration later.

Glicko-2 is a possible later upgrade to the mastery model.

## Alternatives considered

IRT from the start. Rejected. IRT needs a calibrated item bank and a response
population that does not exist at launch. It cannot run on cold-start data.

No telemetry, ship Elo and stop. Rejected. Without response data, difficulty
estimates never improve and IRT is never reachable. The opt-in collector is the
bridge.

Build the telemetry collector now. Rejected as premature. The app has to work
first. The collector is deferred, but the stable item IDs that make it possible are
not, because retrofitting IDs after content ships is expensive.

## Consequences

- The engine is useful immediately on estimated difficulty and Elo mastery.
- Stable item IDs are a day-one requirement on the pack schema, even though the
  collector that consumes them comes later.
- Difficulty is honestly labeled as an estimate until recalibration, in the product
  and in public docs.
- When telemetry data accumulates, difficulty recalibration and an IRT model become
  possible without a schema migration, because the IDs and event fields are already
  in place.
- Glicko-2 and IRT are future upgrades behind this decision, not commitments in v1.
