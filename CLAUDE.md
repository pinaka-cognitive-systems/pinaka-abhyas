# CLAUDE.md: pinaka-abhyas

Working conventions for this repo. Read before committing or building.

## What this is

A free, open-source exam-prep engine plus exam packs. A student practises verified
questions and the app diagnoses what they do not know, per topic and per
misconception, resurfaces past mistakes on schedule, tells them the next thing to
do, and shows how close they are to ready. First pack: CA Foundation Paper 3,
Quantitative Aptitude. Then widen by adding Profiles.

Form factor: a static client-side PWA. Vite, React, TypeScript. sqlite-wasm on
OPFS, service-worker offline, installable, one-click progress export and import.
Hosted free on GitHub Pages or Cloudflare Pages. No backend.

## Git conventions

- **Identity:** `Shiv Padakanti <65507531+5h1vmani@users.noreply.github.com>`. This
  is a public repo. Never commit a personal email.
- **Conventional Commits** for every message: `type(scope): summary`. Types:
  `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`.
- **No signatures, authors, or trailers** in commit messages. No `Co-Authored-By`,
  no `Generated with` lines. This overrides any global default that adds them.
- Commit only when asked. Never push without explicit instruction.

## Schema

- **Core** (`schema/core/`) is exam-agnostic. **Profiles** (`schema/profiles/<exam>/`)
  specialize it via `allOf` + `$ref`. Add an exam by adding a Profile. Never edit
  the Core to fit one exam.
- "Tier 1 / Tier 2" means the two **validation** passes (single-record schema, then
  cross-record pack checks), not the Core/Profile split.
- Validate, both must stay green:
  - `python3 schema/validate.py`
  - `python3 schema/validator/run_checks.py`
- Validators need `jsonschema` and `referencing`. The system `python3` has them.

## Engine

- The TypeScript engine in `engine-ts/` is the canonical implementation. The Python
  prototype is archived at `prototypes/engine-py/` and its tests do not run in CI.
  The independent Python cross-check of the core math lives in `crosscheck/`.
  See `docs/adr/0010-single-typescript-engine.md`.

## Licensing

- App code: AGPL-3.0 (`LICENSE`).
- Question content: CC BY-NC-SA 4.0 (`LICENSE-CONTENT.md`). Free for students, no
  commercial use, derivatives stay open. Per-item SPDX is `CC-BY-NC-SA-4.0`.
- Every shipped question is original, authored from the public syllabus. We
  redistribute no ICAI or other exam-board questions.
- The content generator (prashna) stays private. See `LICENSING.md` and
  `docs/adr/0002-dual-license-agpl-and-cc-by-nc-sa.md`.

## Constraints

- All AI runs at build time. Zero runtime AI. Students need no API key and no
  internet after first load. See `docs/adr/0004-build-time-ai-zero-runtime-ai.md`.
- Honesty in the product: no predicted score we cannot back. Readiness is an
  estimate until calibrated. Difficulty starts as an estimate and is recalibrated
  from real telemetry.
- The LSAT flagship is a separate product. Learn from it; copy none of its code.
  Its vault becomes pack 2 later.

## ADR policy

Load-bearing decisions live in `docs/adr/` as numbered records. ADRs are immutable.
Never edit a decided ADR. A decision that changes gets a new ADR that supersedes the
old one and references it; the old ADR stays in place as the historical record.

## Pointers

- Session handoff: `handoff.md` (read first in every new session)
- Decisions: `docs/adr/`
- Plan: `specs/foundation-plan.md` and `specs/roadmap.md`
- Brand: `docs/brand/brand-core.md` (voice, principles), `docs/brand/design.md` (visual system), and `docs/brand/positioning-ca.md` (CA)
- Syllabus source: `syllabus/` (local-only; gitignored; ICAI source materials not distributed)
