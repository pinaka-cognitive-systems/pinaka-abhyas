# pinaka-abhyas

[![CI](https://github.com/5h1vmani/pinaka-abhyas/actions/workflows/ci.yml/badge.svg)](https://github.com/5h1vmani/pinaka-abhyas/actions/workflows/ci.yml)

A free, open-source exam-prep engine plus exam packs. A student practises verified
questions and the app diagnoses what they do not know, per topic and per
misconception, resurfaces past mistakes on schedule, tells them the next thing to
do, and shows how close they are to ready.

The app is a static client-side PWA. It works offline after first load, installs to
the device, and keeps your data on your device. Sharing is opt-in and collects no personal data (ADR 0014).

One exam, one paper, one loop. The first pack is CA Foundation Paper 3, Quantitative
Aptitude, the simplest place to prove the core works. Once the loop is undeniable,
we widen to other exams by adding a Profile against the same Core. The LSAT bank is
pack 2, later.

Free for students. App open-source. Works offline.

## Status

Phase 0, foundations, is done. In place: the UQS Core and CA Profile schema, the CA
QA taxonomy from the official ICAI syllabus, the misconception canon, the event-log
record, the marking config, the TypeScript engine, and the brand layer. Both
validator tiers are green. Next is content generation (Gate A).

## Layout

- `schema/`: the UQS contract. `core/` is exam-agnostic; `profiles/ca-foundation-qa/`
  holds the CA Profile contracts (schema, taxonomy, misconceptions, marking, blueprint).
  Validators at `schema/validate.py` and `schema/validator/`.
- `packs/ca-foundation-qa/`: CA Foundation Paper 3 QA content (items, solutions,
  manifest, REPORT, ERRATA, build script). Content lives here; contracts stay in schema/.
- `engine-ts/`: the TypeScript engine (mastery, scheduling, selection, readiness).
  This is the canonical engine; see ADR 0010.
- `prototypes/engine-py/`: the archived Python engine prototype. Superseded by engine-ts/.
  Kept as the historical reference; its tests do not run in CI.
- `crosscheck/`: independent Python cross-check of the core engine math.
- `specs/`: `foundation-plan.md` (the plan), `roadmap.md`, `unified-question-schema.md`
  (rationale).
- `docs/adr/`: architecture decision records.
- `docs/brand/`: `brand-core.md` (voice and principles) and `positioning-ca.md`
  (CA positioning).
- `syllabus/`: the official ICAI source (local-only; gitignored; ICAI source materials not distributed).

## Validate

- Tier 1 (structure): `python3 schema/validate.py`
- Tier 2 (cross-record): `python3 schema/validator/run_checks.py`

## Licensing

App code is AGPL-3.0. Question content is CC BY-NC-SA 4.0: free for students, no
commercial use, derivatives stay open. Every shipped question is original, authored
from the public CA Foundation syllabus; we redistribute no exam-board questions. The
content generator (prashna) stays private. See `LICENSING.md`.
