#!/usr/bin/env bash
# W1-12 cross-check runner.
#
# Runs the comparator without modifying any engine-ts config. Two ways, in order
# of simplicity:
#
#   1. Direct node script via tsx (the reliable path). tsx resolves the blind
#      .ts import of engine-ts/src/mastery.ts. node_modules lives in engine-ts,
#      so we cd there and run npx from inside it.
#
#   2. The vitest spec (crosscheck/compare.test.ts), pointed at explicitly with
#      an isolated inline config so engine-ts's own vitest config is untouched.
#
# Usage:
#   crosscheck/run_compare.sh          # runs the direct comparator (default)
#   crosscheck/run_compare.sh vitest   # runs the vitest spec instead

set -euo pipefail

# Resolve the repo root from this script's location, robust to the caller's cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENGINE_DIR="${REPO_ROOT}/engine-ts"
CROSSCHECK_DIR="${REPO_ROOT}/crosscheck"

# Regenerate cases.json from the Python reference so the comparison is fresh.
echo "[run_compare] regenerating cases.json from the Python reference..."
python3 "${CROSSCHECK_DIR}/generate_cases.py"

MODE="${1:-direct}"

if [ "${MODE}" = "vitest" ]; then
  echo "[run_compare] running the vitest spec from inside engine-ts..."
  # An inline, isolated config: include only the cross-check spec, do not load
  # engine-ts's vitest config (--config with our own file, root at repo so the
  # ../engine-ts blind import resolves the same way tsx would).
  cd "${ENGINE_DIR}"
  npx -y vitest run \
    --root "${REPO_ROOT}" \
    --dir "${CROSSCHECK_DIR}" \
    "${CROSSCHECK_DIR}/compare.test.ts"
else
  echo "[run_compare] running the direct comparator via tsx from inside engine-ts..."
  cd "${ENGINE_DIR}"
  npx -y tsx "${CROSSCHECK_DIR}/compare.mjs"
fi
