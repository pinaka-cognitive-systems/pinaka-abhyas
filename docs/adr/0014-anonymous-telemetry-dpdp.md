# ADR 0014: Telemetry is anonymous by construction

Date: 2026-06-10
Status: Accepted. Details the collection half of ADR 0006; the collector itself is
built post-beta, but the design is binding now because the README and the event schema
already make claims about it.

## Context

ADR 0006 planned "a random client id, no PII" posted to a worker, and the README
promised "opt-in and anonymous." The audit (SEC-04) found the tension: a persistent
install_id plus full timestamps arriving at a server with an IP address is pseudonymous
personal data under India's DPDP Act 2023, not anonymous, and the CA Foundation cohort
includes minors, for whom DPDP demands verifiable parental consent. Two honest designs
exist: build a consent system, or collect nothing personal. For a no-account,
no-backend product, the second is the only proportionate answer.

## Decision

Telemetry, when it ships, is anonymous by construction, not by promise:

- The payload carries per-attempt tuples only: item_content_hash, taxonomy_version,
  difficulty_label, correct, a coarse time bucket (not a timestamp), item_type, mode,
  and device form factor. Nothing else.
- No install_id, no rotating client id, no session id leaves the device. Calibration
  needs per-item response distributions, not per-student trajectories. The cost is
  real and accepted: cross-attempt correlation within a student is unavailable to the
  calibration pipeline (full IRT person-parameters are estimated on-device, where the
  full history lives).
- The collection endpoint discards the source IP before storage; nothing stored can
  link a row to a person or a device. This is verifiable in the worker's open source.
- Opt-in remains explicit, off by default, with a plain-language B1 screen stating
  exactly what the payload contains.
- Because no personal data is processed, DPDP consent machinery (including parental
  consent) is not triggered. This posture is recorded as the project's position, to be
  rechecked against counsel before the collector ships.

The README claim is softened today to match what will be true: opt-in, and no personal
data collected.

## Consequences

- The W8-5 public dataset and benchmark inherit lawfulness by construction.
- Empirical difficulty (IRT item parameters) is computable; person-level longitudinal
  research is not. That trade is accepted and documented.
- Aggregate-only telemetry means smaller statistical power per row; the mitigation is
  volume and the on-device person-parameter estimation.
