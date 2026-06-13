# Contributing

Two contributor paths:

## Content authors

See `docs/contributing/content-authoring.md` for the full guide: item format,
misconception tagging, verification requirements, and the licensing rules.

## Code contributors

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

All gates run in CI on every push (`.github/workflows/ci.yml`). Green CI is the
merge bar.

**Commits:** Conventional Commits, every message. Format: `type(scope): summary`.
Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`. No trailers.

**Licensing:** App code is AGPL-3.0 (`LICENSE`). Question content is CC BY-NC-SA 4.0
(`LICENSE-CONTENT.md`). Every item you contribute must be original — authored from
the public syllabus, no ICAI or exam-board reproductions.

**ADRs are immutable.** A decision that changes gets a new ADR that supersedes the
old one; the old ADR stays as the historical record. Never edit an existing ADR body.
See `docs/adr/` and `docs/adr/README.md`.
