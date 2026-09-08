#!/usr/bin/env bash
# Source this file to get PY: a Python that has the pack build's dependencies.
#
# It creates .venv in the repo root on first use and installs the project's
# dependencies into it. The system Python is never touched. Ubuntu 24.04 and
# Debian 12 refuse pip installs into the system Python (PEP 668), so a virtual
# environment is the one path that works on every machine. .venv is gitignored.
#
# Usage, from another script:
#     . "$(git rev-parse --show-toplevel)/tools/python-env.sh"
#     "$PY" some/script.py
#
# Delete .venv to start over.

_root="$(git rev-parse --show-toplevel)"
_venv="${_root}/.venv"

if ! python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)' 2>/dev/null; then
  echo "This project needs Python 3.12 or newer. python3 here is: $(python3 --version 2>&1)" >&2
  return 1 2>/dev/null || exit 1
fi

if [ ! -x "${_venv}/bin/python3" ]; then
  echo "== creating .venv (first run)"
  python3 -m venv "${_venv}"
fi

if ! "${_venv}/bin/python3" -c 'import jsonschema, referencing, rfc3339_validator' 2>/dev/null; then
  echo "== installing the pack build dependencies into .venv"
  (cd "${_root}" && PIP_DISABLE_PIP_VERSION_CHECK=1 "${_venv}/bin/pip" install --quiet ".[dev]")
fi

PY="${_venv}/bin/python3"
export PY
