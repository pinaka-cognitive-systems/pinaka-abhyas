# pinaka-abhyas

A free, open-source, offline desktop app where a student practises verified questions and the app diagnoses what they do not know, per topic and per misconception, resurfaces past mistakes on schedule, tells them the next thing to do, and shows how close they are to ready.

One exam, one section, one loop. We start with CA Foundation, Quantitative Aptitude, the simplest place to prove the core works. Once the loop is undeniable, we widen to other exams by adding a Profile against the same Core.

Free. Open source. Works offline. Your data stays on your device; sharing is opt-in and anonymous.

## Status

Phase 0, foundations. In place: the UQS Core and CA Profile schema, the CA QA taxonomy from the official ICAI syllabus, the misconception canon, the event-log record, the marking config, and the brand layer. Both validator tiers are green. Next is content generation (Gate A).

## Layout

- `schema/` — the UQS contract. `core/` is exam-agnostic; `profiles/ca-foundation-qa/` is the CA Profile. Validators at `schema/validate.py` and `schema/validator/`.
- `specs/` — `foundation-plan.md` (the approved plan), `roadmap.md`, `unified-question-schema.md` (rationale).
- `docs/brand/` — `brand-core.md` (voice and principles) and `positioning-ca.md` (CA positioning).
- `syllabus/` — the official ICAI source.

## Validate

- Tier 1 (structure): `python3 schema/validate.py`
- Tier 2 (cross-record): `python3 schema/validator/run_checks.py`

## Relationship to the paid LSAT product

The paid LSAT flagship is a separate product and codebase. pinaka-abhyas shares its brand voice and learns from its methods, but takes none of its code. The content generator (prashna) stays private; this app and the questions it ships are open.
