#!/usr/bin/env bash
# Run the CI gates against a CLEAN export of HEAD, exactly as CI sees the repo.
# Purpose: a gitignored local artifact (pack.json was the live case) can satisfy
# a gate on this machine while CI fails on a clean checkout. This script removes
# that class: it extracts `git archive HEAD` into a temp directory, rebuilds the
# generated artifacts the same way CI does, and runs every blocking gate there.
#
# Usage: tools/ci-local.sh   (from anywhere inside the repo; exits nonzero on
# the first failing gate, like CI)
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
# The Python gates run in the repo's .venv (tools/python-env.sh), the same one
# tools/dev.sh uses. Sourced before the cd so the venv lives in the real repo,
# not in the throwaway export.
. "$ROOT/tools/python-env.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "== clean export of HEAD -> $WORK"
git -C "$ROOT" archive HEAD | tar -x -C "$WORK"

cd "$WORK"

echo "== hygiene: no absolute home paths"
# The pattern is assembled from parts so no file (including this one) contains
# the literal and self-matches.
PAT="/Use""rs/"
if grep -RIn "$PAT" --exclude-dir=.git --exclude="*.lock" --exclude="package-lock.json" . ; then
  echo "FAIL  tracked files contain absolute home paths"; exit 1
fi

echo "== python gates"
"$PY" schema/validate.py
"$PY" schema/validator/run_checks.py
"$PY" schema/validator/run_solutions.py packs/ca-foundation-qa
"$PY" tools/check_originality.py --self-test
"$PY" tools/check_originality.py
"$PY" -m pytest schema/validator/tests -q

echo "== pack artifact (the app consumes this, as in CI)"
"$PY" packs/ca-foundation-qa/build_and_validate.py

echo "== engine gates"
# `npm run audit` runs last inside each block, exactly as CI orders it, so a
# dependency advisory never masks a functional failure above it. Omitting it here
# is how commit 0752879 passed this script and then failed CI on both audit gates.
(cd engine-ts && npm ci --silent && npx tsc --noEmit && npx vitest run && npm run audit)

echo "== W1-12 cross-check (independent mastery twin, ADR 0010)"
crosscheck/run_compare.sh

echo "== app gates"
(cd app && npm ci --silent && npm run typecheck && npm run lint && npx vitest run && npm run build && npm run check-size && npm run check-offline && npm run check-a11y && npm run audit)

echo "PASS  all CI gates green on a clean export of HEAD"
