# Changelog

All notable changes to Pinaka Abhyas are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The question pack
carries its own version in `packs/ca-foundation-qa/pack.manifest.json`.

## [Unreleased]

### Added
- CA Foundation Paper 3 (Quantitative Aptitude) question bank expanded to 813 verified
  items, covering all 81 v1-scope taxonomy leaves (every leaf has items).
- `explanation_kind` and the four-section `explanation_sections` teaching contract
  (punchline, approach, lesson, timing) on every servable item (ADR 0023).
- Per-run content-integrity audit artifacts under `packs/ca-foundation-qa/audit/`:
  the generation funnel, rejection reasons per stage, and difficulty-audit verdicts.
- Project community and security files: `CHANGELOG.md` and an untrusted-code section
  in `SECURITY.md`.
- Licensing framework for the public release: `CLA.md`, `COMMERCIAL.md`, and
  `TRADEMARK.md`, with CLA enforcement in `.github/workflows/cla.yml`.

### Changed
- Difficulty labels recalibrated against the ICAI-modelled reference. The bank sits
  at 24% L1 / 64% L2 / 12% L3 against an ICAI reference of 26/66/8.
- Standard and pace mock difficulty mix now mirrors the real ICAI paper at
  26/66/8 L1/L2/L3 (ADR 0024, superseding the 20/60/20 target of ADR 0022). The
  813-item bank assembles 10 or more genuinely fresh mocks with no forced L3 reuse.
