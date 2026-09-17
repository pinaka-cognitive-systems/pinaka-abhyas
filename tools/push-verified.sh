#!/usr/bin/env bash
# Push, then block until all three checks for EXACTLY the pushed commit are done.
# Three workflows run on every commit: CI (.github/workflows/ci.yml), CLA
# (.github/workflows/cla.yml), and Commit identity
# (.github/workflows/commit-identity.yml). Each run is picked by its own
# workflow name, not by list position: the CLA run often finishes in seconds,
# and picking "the first run in the list" once reported CLA's quick pass as
# the CI verdict while CI was still running.
# A push is not done when it leaves this machine; it is done when all three
# runs for that SHA are green. Exits nonzero on failure so the terminal, not
# an email hours later, is where a red run gets noticed.
#
# Usage: tools/push-verified.sh [remote] [branch]
set -euo pipefail

REMOTE="${1:-origin}"
# Default is the current branch. main accepts only pull requests, so a direct
# push there is refused by the ruleset.
BRANCH="${2:-$(git branch --show-current)}"

git push "$REMOTE" "$BRANCH"
SHA="$(git rev-parse HEAD)"
echo "pushed $SHA; awaiting the CI, CLA, and Commit identity runs for this exact commit"

# Find the run ID for one workflow on this commit. Retries because the API
# lags a push by a few seconds.
find_run_id() {
  local workflow="$1" run_id=""
  for _ in $(seq 1 20); do
    run_id="$(gh run list --commit "$SHA" --workflow "$workflow" --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
    [ -n "$run_id" ] && break
    sleep 5
  done
  echo "$run_id"
}

CI_RUN="$(find_run_id ci.yml)"
[ -n "$CI_RUN" ] || { echo "FAIL  no CI run appeared for $SHA"; exit 1; }
CLA_RUN="$(find_run_id cla.yml)"
[ -n "$CLA_RUN" ] || { echo "FAIL  no CLA run appeared for $SHA"; exit 1; }
IDENTITY_RUN="$(find_run_id commit-identity.yml)"
[ -n "$IDENTITY_RUN" ] || { echo "FAIL  no Commit identity run appeared for $SHA"; exit 1; }

wait_for_run() {
  until [ "$(gh run view "$1" --json status --jq '.status')" = "completed" ]; do
    sleep 15
  done
}
wait_for_run "$CI_RUN"
wait_for_run "$CLA_RUN"
wait_for_run "$IDENTITY_RUN"

# Report each run's verdict. A red run also prints its failed job logs.
FAILED=0
for entry in "CI $CI_RUN" "CLA $CLA_RUN" "Commit identity $IDENTITY_RUN"; do
  NAME="${entry% *}"
  RUN_ID="${entry##* }"
  CONCLUSION="$(gh run view "$RUN_ID" --json conclusion --jq '.conclusion')"
  echo "$NAME: $CONCLUSION"
  if [ "$CONCLUSION" != "success" ]; then
    echo "FAIL  $NAME run $RUN_ID concluded: $CONCLUSION"
    gh run view "$RUN_ID" --log-failed | tail -40
    FAILED=1
  fi
done

[ "$FAILED" -eq 0 ] || exit 1
echo "PASS  CI, CLA, and Commit identity all green for $SHA"
