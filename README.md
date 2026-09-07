# pinaka-abhyas

[![CI](https://github.com/pinaka-cognitive-systems/pinaka-abhyas/actions/workflows/ci.yml/badge.svg)](https://github.com/pinaka-cognitive-systems/pinaka-abhyas/actions/workflows/ci.yml)

A free exam-prep engine plus exam packs. The engine is open source; the questions are openly licensed for non-commercial use. A student practises verified
questions and the app diagnoses what they do not know, per topic and per
misconception, resurfaces past mistakes on schedule, tells them the next thing to
do, and shows how close they are to ready.

The app is a static client-side PWA. It works offline after first load, installs to
the device, and keeps your data on your device. Nothing is transmitted today: the app
ships with no collector. Any future sharing will be opt-in, off by default, and will
carry no personal data (ADR 0014).

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
pinned by committed golden vectors. The content pipeline has run a pilot and three
scale batches: the CA Foundation pack holds 813 items covering all 81 v1-scope
taxonomy leaves, at 24% L1, 64% L2, 12% L3. Every item ships an executable solution
that re-derives its answer key in CI; 812 pass, and one item is quarantined with its
defect recorded in `packs/ca-foundation-qa/ERRATA.md`. Since the executable-solution
gate came in, no shipped item has carried a wrong answer key. Originality is measured
as word overlap against our own bank and an internal reference set. The living ledger
is `packs/ca-foundation-qa/audit/STATUS.md`. The PWA is built, with the loop decomposed
into the flows under `app/src/flows/`. Next is expert audit of the bank, then the
closed beta. See `ROADMAP.md`.

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
- `tools/`: local development and CI helpers (the local CI battery, the verified push,
  the dev launcher, the funnel and gap reporters, the content status ledger, the audit
  gate, and a staging helper).
- `docs/`: architecture decision records (`adr/`), the brand layer (`brand/`), the
  engineering build spec and adherence spec (`design/`), and the content authoring
  guide (`contributing/`).
- `specs/`: `unified-question-schema.md` (the schema rationale) and
  `content-pipeline.md` (how items are generated, verified, and accepted).
- `syllabus/`: the official ICAI source (local-only; gitignored; ICAI source materials not distributed).

Source comments in `app/` cite `design-team/v2/...`. That was the operator-local design
workspace and is not distributed. `docs/design/as-built.md` records what was ported from it.

## Validate

- Tier 1 (structure): `python3 schema/validate.py`
- Tier 2 (cross-record): `python3 schema/validator/run_checks.py`

## Development

Requirements: Node 22, Python 3.12.

```
git clone https://github.com/pinaka-cognitive-systems/pinaka-abhyas
cd pinaka-abhyas
pip install ".[dev]"          # installs jsonschema, referencing, rfc3339-validator, pytest
bash tools/dev.sh             # builds the pack, installs app deps on first run, starts http://localhost:5173
```

`tools/dev.sh` runs `python3 packs/ca-foundation-qa/build_and_validate.py` (which
generates the gitignored `pack.json`), then `npm install` inside `app/` if
`node_modules/` is absent, then `npm run dev`.

## Licensing

Free for students. Paid for businesses.

- **Code:** AGPL-3.0 (`LICENSE`).
- **Question content:** CC BY-NC-SA 4.0 (`LICENSE-CONTENT.md`). Free for students,
  no commercial use, derivatives stay open.
- **Commercial use:** needs a paid license. `COMMERCIAL.md` defines where the line
  falls, with worked examples. Email `license@mypinaka.com`.
- **Name and logo:** not licensed by either license. Fork freely, rename before you
  distribute. `TRADEMARK.md`.
- **Contributing:** every contributor signs the CLA once (`CLA.md`). You keep your
  copyright and grant the project the right to relicense your contribution, which is
  what makes the commercial license sellable. `CLA.md` has the exact terms.

`LICENSING.md` is the map. Every shipped question is original, written from the
public CA Foundation syllabus; we redistribute no exam-board questions. The questions
are drafted by Claude models at build time and each must pass an executable solution
that re-derives its answer key in CI. Every item records its generator in
`provenance.generator`. No model runs on a student's device. The content generator
(prashna) stays private.

CA Foundation is an examination conducted by the Institute of Chartered Accountants
of India (ICAI). Pinaka Abhyas is not affiliated with, endorsed by, or sponsored by
ICAI.
