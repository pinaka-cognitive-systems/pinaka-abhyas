# Contributing

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Read it before you
participate.

## Before your first contribution: sign the CLA

Every contributor signs the [Contributor License Agreement](CLA.md) once, before
their first merge. It applies to code, question content, and documentation alike.

Signing is one comment on your pull request. A bot asks for it and records it against
your GitHub account; you will never be asked again. The CLA check must be green before
a pull request can merge.

**Why.** The project stays free for students, and businesses that monetise it buy a
commercial license (`COMMERCIAL.md`). Selling that license requires the copyright
holder to hold sufficient rights over the whole work. Without the CLA, a contributor
keeps rights the holder cannot grant onward, and the commercial license becomes
unsellable over the affected parts. You keep your own copyright either way; you are
granting an additional license alongside it, not signing it away. Read `CLA.md` for
the exact terms.

## Two contributor paths

### Content authors

See `docs/contributing/content-authoring.md` for the full guide: item format,
misconception tagging, verification requirements, and the licensing rules.

### Code contributors

**Quickstart:**

```bash
# Build and validate the pack (required before running the app)
python3 packs/ca-foundation-qa/build_and_validate.py

# Start the dev server (installs app deps on first run, then serves on :5173)
bash tools/dev.sh
```

**Gates that must stay green before every PR.**

`bash tools/ci-local.sh` is the authoritative check. It runs every blocking gate
below against a clean `git archive HEAD` export, so a gitignored local artifact
cannot mask a CI failure. If it is green, CI will be green. Run it before you push.

The individual commands are listed for fast iteration while you work:

| Gate | Command | Where |
|---|---|---|
| No absolute home paths | covered by `tools/ci-local.sh`; the search pattern is assembled at runtime so no tracked file can self-match | repo root |
| Schema Tier 1 | `python3 schema/validate.py` | repo root |
| Schema Tier 2 | `python3 schema/validator/run_checks.py` | repo root |
| Solution harness | `python3 schema/validator/run_solutions.py packs/ca-foundation-qa` | repo root |
| Originality | `python3 tools/check_originality.py` | repo root |
| Validator tests | `python3 -m pytest schema/validator/tests -q` | repo root |
| Engine typecheck | `npx tsc --noEmit` | `engine-ts/` |
| Engine tests | `npx vitest run` | `engine-ts/` |
| Engine cross-check | `crosscheck/run_compare.sh` | repo root |
| Engine audit gate | `npm run audit` | `engine-ts/` |
| App typecheck | `npm run typecheck` | `app/` |
| App lint | `npm run lint` | `app/` |
| App tests | `npm test` | `app/` |
| App build | `npm run build` | `app/` |
| Size budget (ADR 0008) | `npm run check-size` | `app/` |
| Offline precache | `npm run check-offline` | `app/` |
| Accessibility | `npm run check-a11y` | `app/` |
| App audit gate | `npm run audit` | `app/` |
| CLA signature | automatic, see above | pull request |

All of these run in CI on every push (`.github/workflows/ci.yml`). Green CI is the
merge bar.

**Commits:** Conventional Commits, every message. Format: `type(scope): summary`.
Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`. No trailers.

**Licensing:** App code is AGPL-3.0 (`LICENSE`). Question content is CC BY-NC-SA 4.0
(`LICENSE-CONTENT.md`). Commercial use of either needs a paid license
(`COMMERCIAL.md`). The name and logo are not licensed by any of these
(`TRADEMARK.md`). `LICENSING.md` is the map. Every item you contribute must be
original: authored from the public syllabus, no ICAI or exam-board reproductions.
The CLA above asks you to confirm exactly that.

**ADRs are immutable.** A decision that changes gets a new ADR that supersedes the
old one; the old ADR stays as the historical record. Never edit an existing ADR body.
See `docs/adr/` and `docs/adr/README.md`.
