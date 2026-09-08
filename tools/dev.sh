#!/usr/bin/env bash
# One-command local run: build the pack artifact, install app dependencies when
# needed, and start the dev server. Exists so nobody has to paste multi-line
# instructions (interactive zsh passes a literal # to commands, which is how
# "npm install  # first time only" became an npm error).
#
# Usage: bash tools/dev.sh        -> http://localhost:5173
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# The pack build runs in .venv, created here on first use (tools/python-env.sh).
. "$ROOT/tools/python-env.sh"

echo "== pack artifact"
"$PY" packs/ca-foundation-qa/build_and_validate.py

cd app
if [ ! -d node_modules ]; then
  echo "== installing app dependencies (first run)"
  npm install
fi

echo "== dev server: http://localhost:5173 (Ctrl+C stops it)"
npm run dev
