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
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "== clean export of HEAD -> $WORK"
git -C "$ROOT" archive HEAD | tar -x -C "$WORK"

cd "$WORK"

echo "== hygiene: no absolute home paths"
if grep -RIn "/Users/" --exclude-dir=.git --exclude=ci.yml --exclude="*.lock" --exclude="package-lock.json" . ; then
  echo "FAIL  tracked files contain absolute home paths"; exit 1
fi

echo "== python gates"
python3 schema/validate.py
python3 schema/validator/run_checks.py
python3 schema/validator/run_solutions.py packs/ca-foundation-qa
python3 -m pytest schema/validator/tests -q

echo "== pack artifact (the app consumes this, as in CI)"
python3 packs/ca-foundation-qa/build_and_validate.py

echo "== engine gates"
(cd engine-ts && npm ci --silent && npx tsc --noEmit && npx vitest run)

echo "== app gates"
(cd app && npm ci --silent && npm run typecheck && npm run lint && npx vitest run && npm run build && npm run check-size && npm run check-offline && npm run check-a11y)

echo "PASS  all CI gates green on a clean export of HEAD"
