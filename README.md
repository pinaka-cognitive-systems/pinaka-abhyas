# pinaka-abhyas

A free, open-source exam-prep engine plus exam packs. A student practises verified
questions and the app diagnoses what they do not know, per topic and per
misconception, resurfaces past mistakes on schedule, tells them the next thing to
do, and shows how close they are to ready.

The app is a static client-side PWA. It works offline after first load, installs to
the device, and keeps your data on your device. Sharing is opt-in and anonymous.

One exam, one paper, one loop. The first pack is CA Foundation Paper 3, Quantitative
Aptitude, the simplest place to prove the core works. Once the loop is undeniable,
we widen to other exams by adding a Profile against the same Core. The LSAT bank is
pack 2, later.

Free for students. App open-source. Works offline.

## Status

Phase 0, foundations, is done. In place: the UQS Core and CA Profile schema, the CA
QA taxonomy from the official ICAI syllabus, the misconception canon, the event-log
record, the marking config, the Python reference engine, and the brand layer. Both
validator tiers are green. Next is content generation (Gate A).

## Layout

- `schema/`: the UQS contract. `core/` is exam-agnostic; `profiles/ca-foundation-qa/`
  is the CA Profile. Validators at `schema/validate.py` and `schema/validator/`.
- `engine/`: the Python reference engine (mastery, scheduling, selection,
  readiness). Ported to TypeScript for the PWA; see ADR 0003.
- `specs/`: `foundation-plan.md` (the plan), `roadmap.md`, `unified-question-schema.md`
  (rationale).
- `docs/adr/`: architecture decision records.
- `docs/brand/`: `brand-core.md` (voice and principles) and `positioning-ca.md`
  (CA positioning).
- `syllabus/`: the official ICAI source.

## Validate

- Tier 1 (structure): `python3 schema/validate.py`
- Tier 2 (cross-record): `python3 schema/validator/run_checks.py`

## Licensing

App code is AGPL-3.0. Question content is CC BY-NC-SA 4.0: free for students, no
commercial use, derivatives stay open. Every shipped question is original, authored
from the public CA Foundation syllabus; we redistribute no exam-board questions. The
content generator (prashna) stays private. See `LICENSING.md`.
