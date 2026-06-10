#!/usr/bin/env bash
# Push, then block on the CI verdict for EXACTLY the pushed commit.
# Purpose: a push is not done when it leaves this machine; it is done when the
# run for that SHA is green. Polling by SHA also prevents misreading an older
# run's verdict as the current one (which happened). Exits nonzero on failure
# so the terminal, not an email hours later, is where a red run gets noticed.
#
# Usage: tools/push-verified.sh [remote] [branch]
set -euo pipefail

REMOTE="${1:-origin}"
BRANCH="${2:-main}"

git push "$REMOTE" "$BRANCH"
SHA="$(git rev-parse HEAD)"
echo "pushed $SHA; awaiting the CI run for this exact commit"

# Wait for the run to appear (the API lags a push by a few seconds).
RUN_ID=""
for _ in $(seq 1 20); do
  RUN_ID="$(gh run list --commit "$SHA" --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
  [ -n "$RUN_ID" ] && break
  sleep 5
done
if [ -z "$RUN_ID" ]; then
  echo "FAIL  no CI run appeared for $SHA"; exit 1
fi

until [ "$(gh run view "$RUN_ID" --json status --jq '.status')" = "completed" ]; do
  sleep 15
done

gh run view "$RUN_ID" --json jobs --jq '.jobs[] | .name + ": " + .conclusion'
CONCLUSION="$(gh run view "$RUN_ID" --json conclusion --jq '.conclusion')"
if [ "$CONCLUSION" != "success" ]; then
  echo "FAIL  CI run $RUN_ID concluded: $CONCLUSION"
  gh run view "$RUN_ID" --log-failed | tail -40
  exit 1
fi
echo "PASS  CI green for $SHA"
