# Contributing

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

**Gates that must stay green before every PR:**

| Gate | Command |
|---|---|
| Schema Tier 1 | `python3 schema/validate.py` |
| Schema Tier 2 | `python3 schema/validator/run_checks.py` |
| Engine typecheck + tests | `tsc --noEmit` and `npx vitest run` in `engine-ts/` |
| App typecheck | `npm run typecheck` in `app/` |
| App lint | `npm run lint` in `app/` |
| App tests | `npm test` in `app/` |
| Clean-export check | `bash tools/ci-local.sh` |
| CLA signature | automatic, see above |

All gates run in CI on every push (`.github/workflows/ci.yml`). Green CI is the
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
