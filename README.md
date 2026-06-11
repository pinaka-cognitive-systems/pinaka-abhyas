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

The foundations are in place and the app is built. The UQS Core and CA Profile
schema, the CA QA taxonomy from the official ICAI syllabus, the misconception canon,
the event-log record, and the marking config are locked, and both validator tiers are
green. The TypeScript engine computes mastery, scheduling, selection, and readiness,
pinned by committed golden vectors. The content pipeline ran a pilot to completion:
the CA Foundation pack holds 82 items, 81 usable, each shipping an executable solution
that re-derives its key in CI. The PWA is built, with the loop decomposed into seven
flows. Next is scaling the verified bank with expert audit, then the closed beta. See
`ROADMAP.md`.

## Layout

- `app/`: the PWA. Vite, React, TypeScript, sqlite-wasm on OPFS, a service worker for
  full offline, an installable manifest, and one-click progress export and import.
- `engine-ts/`: the canonical TypeScript engine (mastery, scheduling, selection,
  readiness), pinned by committed golden vectors. See ADR 0010.
- `packs/ca-foundation-qa/`: CA Foundation Paper 3 QA content (items, solutions,
  manifest, REPORT, ERRATA, verification artifacts under `audit/`, build script).
  Content lives here; contracts stay in `schema/`.
- `schema/`: the UQS contract. `core/` is exam-agnostic; `profiles/ca-foundation-qa/`
  holds the CA Profile contracts (schema, taxonomy, misconceptions, marking, blueprint).
  Validators at `schema/validate.py` and `schema/validator/`.
- `prototypes/engine-py/`: the archived Python engine prototype. Superseded by
  `engine-ts/`. Kept as the historical reference; its tests do not run in CI.
- `crosscheck/`: independent Python cross-check of the core engine math.
- `tools/`: local development and CI helpers (the local CI battery, the dev launcher,
  the funnel reporter).
- `docs/`: architecture decision records (`adr/`), the brand layer (`brand/`), the
  engineering build spec and adherence spec (`design/`), and the content authoring
  guide (`contributing/`).
- `specs/`: `unified-question-schema.md` (the schema rationale) and
  `content-pipeline.md` (how items are generated, verified, and accepted).
- `syllabus/`: the official ICAI source (local-only; gitignored; ICAI source materials not distributed).

## Validate

- Tier 1 (structure): `python3 schema/validate.py`
- Tier 2 (cross-record): `python3 schema/validator/run_checks.py`

## Licensing

App code is AGPL-3.0. Question content is CC BY-NC-SA 4.0: free for students, no
commercial use, derivatives stay open. Every shipped question is original, authored
from the public CA Foundation syllabus; we redistribute no exam-board questions. The
content generator (prashna) stays private. See `LICENSING.md`.
