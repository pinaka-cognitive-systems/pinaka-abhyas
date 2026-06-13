# Roadmap

The map. Read the destination, then the two gates, then where the work stands.

## The destination (v1 definition of done)

pinaka-abhyas v1 is a free, open-source, offline-capable PWA. A CA Foundation
aspirant practises Quantitative Aptitude on verified questions. After each session
the app diagnoses what they do not know, per topic and per misconception, resurfaces
past mistakes on a schedule, names the single next thing to do, and shows how close
they are to ready.

One exam. One paper. One loop. Done well. If a feature does not serve that sentence,
it is not in v1.

The target cohort is CA Foundation Paper 3, Quantitative Aptitude. Quality comes
before any launch date.

## The two gates

The product rests on one load-bearing assumption in two parts:

1. A build-time AI pipeline can produce correct CA QA questions and accurate
   per-wrong-answer misconception tags, cheaply.
2. A diagnosis-driven testing loop changes a self-studying aspirant's outcome.

So the map has two evidence gates. Work flows forward only through them.

- Gate A, content trust. Measured wrong-key rate and misconception-tag accuracy must
  clear a bar before the bank scales. See `docs/adr/0005-machine-verified-item-pipeline.md`.
- Gate B, learning impact. Real aspirants must return, find the diagnosis accurate,
  and improve. This is the closed-beta gate, still ahead.

## Where we are now

Done:

- Schema. The UQS Core and the CA Foundation QA Profile are structured and locked.
  Both validator tiers are green: `python3 schema/validate.py` and
  `python3 schema/validator/run_checks.py`. The CA QA taxonomy, the closed
  misconception canon, the difficulty scale, and the marking config are in place.
  Taxonomy, misconceptions, and items share taxonomy bundle version 4.
- Engine. The canonical engine lives in `engine-ts/` (TypeScript). It computes
  Glicko-lite mastery, spaced scheduling, the next-action selector, and the readiness
  band. Behaviour is pinned by committed golden vectors that CI replays on every
  change. See `engine-ts/SPEC.md` and `docs/adr/0010-single-typescript-engine.md`.
  An independent Python cross-check of the core math lives in `crosscheck/`.
- Content pipeline, pilot, and full-mock scale. The generate, solve, verify, audit
  pipeline (`specs/content-pipeline.md`) ran a pilot to completion and two scale
  batches (B6, B7) through the same gates plus independent blind solves. The CA
  Foundation pack holds 106 items, 105 usable, one quarantined with the defect
  recorded in `packs/ca-foundation-qa/ERRATA.md`. Every blueprint family is at
  quota, so a zero-shortfall 100-question mock assembles; difficulty mix is
  22/55/23 against the 20/55/25 target. Every usable item ships an executable
  solution that re-derives its key in CI, and (since ADR 0017) the four
  structured teaching sections. Gap targeting lives in `tools/gap_analysis.py`.
- App. The PWA is built in `app/`: a static client-side Vite, React, TypeScript app
  with sqlite-wasm on OPFS, a service worker for full offline, an installable
  manifest with real icons, self-hosted IBM Plex subsets, and one-click progress
  export and import. A persistent shell (rail on desktop, tab bar on phones) hosts
  the hub flows; sessions run full-bleed. The loop is decomposed into the flows
  under `app/src/flows/`: diagnosis, first-run, home, mock, practice, review,
  settings, syllabus, and testday. The mock
  cycle runs end to end: exam hall (palette, strikes, flags, honest resume),
  score reveal, marks waterfall breakdown with misconception shares, and a
  per-question review walkthrough that reuses the structured teaching reveals.
  See `docs/design/build-spec.md` and `docs/design/as-built.md`.
- CI. Every push runs schema Tier 1 and Tier 2, key execution, engine typecheck and
  tests, and app typecheck, lint, tests, build, byte-budget, offline, and
  accessibility checks. See `.github/workflows/ci.yml`.

Next:

- Close the last four uncovered taxonomy leaves and deepen the bank to at least 800
  questions before launch (ADR 0018 ruling 6); mock rotation needs roughly three
  papers of headroom, and the mock assembler must build full blueprint papers without
  the shortfall mechanism.
- Replace the quarantined item with an original equivalent.
- Harden the app for accessibility and performance on a low-end Android phone.
- Run the closed beta with real aspirants to settle Gate B.
- Wire the deployment job (ADR 0008 decides GitHub Pages / Cloudflare Pages; no
  deploy job exists yet — hosting is a pending launch step).
- Public release: app under AGPL-3.0, shipped questions under CC BY-NC-SA 4.0; the
  opt-in anonymized telemetry collector that calibrates difficulty and fills the
  reserved IRT fields. See `docs/adr/0002-dual-license-agpl-and-cc-by-nc-sa.md` and
  `docs/adr/0006-elo-now-telemetry-path-to-irt.md`.

## Explicitly out of v1

- Other CA papers and other exams. The LSAT vault is pack 2, later. No NEET or JEE
  until CA Foundation has traction.
- Cross-device sync and accounts. Progress moves via one-click export and import.
- A native desktop wrapper. A Tauri build is a possible later add. See
  `docs/adr/0001-pwa-over-desktop-shell.md`.
- Runtime AI. All AI runs at build time. See
  `docs/adr/0004-build-time-ai-zero-runtime-ai.md`.

---

CA Foundation is an examination conducted by the Institute of Chartered Accountants
of India (ICAI). Pinaka Abhyas is not affiliated with, endorsed by, or sponsored by
ICAI.
