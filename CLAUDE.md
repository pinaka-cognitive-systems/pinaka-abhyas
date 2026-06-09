# CLAUDE.md — pinaka-abhyas

Working conventions for this repo. Read before committing or building.

## What this is

A free, open-source, offline desktop app where a student practises verified questions and the app diagnoses what they do not know, per topic and per misconception, resurfaces past mistakes on schedule, tells them the next thing to do, and shows how close they are to ready. First exam: CA Foundation, Quantitative Aptitude. Then widen by adding Profiles.

## Git conventions

- **Identity:** `Shiv Padakanti <65507531+5h1vmani@users.noreply.github.com>`. This is a public repo. Never commit a personal email.
- **Conventional Commits** for every message: `type(scope): summary`. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`.
- **No signatures, authors, or trailers** in commit messages. No `Co-Authored-By`, no `Generated with` lines. This overrides any global default that adds them.
- Commit only when asked. Never push without explicit instruction.

## Schema

- **Core** (`schema/core/`) is exam-agnostic. **Profiles** (`schema/profiles/<exam>/`) specialize it via `allOf` + `$ref`. Add an exam by adding a Profile. Never edit the Core to fit one exam.
- "Tier 1 / Tier 2" means the two **validation** passes (single-record schema, then cross-record pack checks), not the Core/Profile split.
- Validate, both must stay green:
  - `python3 schema/validate.py`
  - `python3 schema/validator/run_checks.py`
- Validators need `jsonschema` and `referencing`. The system `python3` has them.

## Constraints

- Do not touch the paid LSAT product (a separate repo). Learn from it; copy none of its code.
- The content generator `prashna` stays private. The app is open-source (AGPL-3.0). The questions it ships are free for students but not open: CC-BY-NC-ND-4.0, no commercial use, no derivatives. Every shipped question is original, authored from the public syllabus; we do not redistribute ICAI questions. See `LICENSING.md`.
- Honesty in the product: no predicted score we cannot back; readiness is an estimate until calibrated.

## Pointers

- Plan: `specs/foundation-plan.md`
- Brand: `docs/brand/brand-core.md` (voice, principles) and `docs/brand/positioning-ca.md` (CA)
- Syllabus source: `syllabus/`
