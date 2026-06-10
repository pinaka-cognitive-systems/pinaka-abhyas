#!/usr/bin/env python3
"""Solution harness: execute each item's solution in a sandbox and verify the key.

Implements the W3-1 sandbox contract (schema/validator/SOLUTION_HARNESS.md), the
enforcement half of ADR 0005. Every item carrying a `solution` field has its solution
run as a separate, isolated OS process; the computed answer must reproduce the item's
answer key. A mismatch, a crash, a timeout, or off-protocol output is a hard violation.

W3-2 rider: if the solution module defines check_consistency() (returning
{"satisfiable": bool, "unique": bool}), the harness runs it inside the same sandbox and
enforces SOLUTION_UNSATISFIABLE / SOLUTION_AMBIGUOUS.

Execution protocol (per item):
  - subprocess `python3 -I` (isolated: no user site-packages, no cwd imports)
  - working directory a fresh temporary directory
  - environment cleared to a minimal allowlist (PATH only)
  - resource limits set in the child before exec (preexec_fn): CPU 5s, address space
    256 MB, file size 1 MB, no core dumps
  - wall-clock timeout 10s
  - the harness writes a small runner script into the temp dir that imports nothing
    from the harness, loads the solution file by path, calls solve() (and
    check_consistency() if present), and prints exactly one JSON line to stdout.

Items without a solution field are reported SKIP (status model_audited), not failed.
The quarantined item carries no solution and is skipped by status.

Run: python3 schema/validator/run_solutions.py packs/ca-foundation-qa
Exit 0 = all solutions reproduce their keys; nonzero = at least one violation.
"""
import json
import pathlib
import resource
import subprocess
import sys
import tempfile

# RLIMIT_AS at 256 MB aborts CPython startup on Darwin (the kernel reserves a large
# virtual address space the interpreter needs to mmap before it ever runs the
# solution). The limit is honored on Linux, which is where CI runs and where the
# contract's resource-limit hardening matters. On Darwin the address-space cap is
# dropped (every other limit still applies) so the harness is runnable locally; CI
# enforces the full set. Recorded so the platform trade is conscious.
_ENFORCE_ADDRESS_SPACE = sys.platform != "darwin"

# Resource limits applied in the child process before exec.
CPU_SECONDS = 5
ADDRESS_SPACE_BYTES = 256 * 1024 * 1024  # 256 MB
FILE_SIZE_BYTES = 1 * 1024 * 1024  # 1 MB
CORE_BYTES = 0
WALL_TIMEOUT_SECONDS = 10

# Violation codes (SOLUTION_HARNESS.md).
SOLUTION_KEY_MISMATCH = "SOLUTION_KEY_MISMATCH"
SOLUTION_RUN_ERROR = "SOLUTION_RUN_ERROR"
SOLUTION_TIMEOUT = "SOLUTION_TIMEOUT"
SOLUTION_PROTOCOL_ERROR = "SOLUTION_PROTOCOL_ERROR"
# W3-2 LR codes.
SOLUTION_UNSATISFIABLE = "SOLUTION_UNSATISFIABLE"
SOLUTION_AMBIGUOUS = "SOLUTION_AMBIGUOUS"

# The runner script written into the child's temp dir. It imports nothing from the
# harness: it loads the solution file by path, calls solve(), optionally calls
# check_consistency(), and prints exactly one JSON line to stdout. Any other stdout
# output is a protocol violation by the contract.
RUNNER_SOURCE = r'''
import importlib.util
import json
import sys


def _load(path):
    spec = importlib.util.spec_from_file_location("_solution", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    solution_path = sys.argv[1]
    module = _load(solution_path)

    result = module.solve()
    if not isinstance(result, dict):
        raise TypeError("solve() must return a dict")

    payload = {
        "value": result.get("value"),
        "option_key": result.get("option_key"),
    }

    check = getattr(module, "check_consistency", None)
    if callable(check):
        consistency = check()
        if not isinstance(consistency, dict):
            raise TypeError("check_consistency() must return a dict")
        payload["consistency"] = {
            "satisfiable": bool(consistency["satisfiable"]),
            "unique": bool(consistency["unique"]),
        }

    sys.stdout.write(json.dumps(payload))


main()
'''


class Violation:
    def __init__(self, code, item_id, message):
        self.code = code
        self.item_id = item_id
        self.message = message


def _set_child_limits():
    """preexec_fn: apply resource limits in the child before exec.

    Runs in the forked child, so it must use only async-signal-safe primitives.
    """
    resource.setrlimit(resource.RLIMIT_CPU, (CPU_SECONDS, CPU_SECONDS))
    if _ENFORCE_ADDRESS_SPACE:
        resource.setrlimit(resource.RLIMIT_AS, (ADDRESS_SPACE_BYTES, ADDRESS_SPACE_BYTES))
    resource.setrlimit(resource.RLIMIT_FSIZE, (FILE_SIZE_BYTES, FILE_SIZE_BYTES))
    resource.setrlimit(resource.RLIMIT_CORE, (CORE_BYTES, CORE_BYTES))


def run_solution(solution_path: pathlib.Path):
    """Execute one solution in the sandbox. Returns (parsed_payload, error_tuple).

    On success: (payload_dict, None).
    On failure: (None, (code, message)).
    """
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = pathlib.Path(tmp)
        runner_path = tmp_dir / "_runner.py"
        runner_path.write_text(RUNNER_SOURCE)

        try:
            proc = subprocess.run(
                [sys.executable, "-I", str(runner_path), str(solution_path)],
                cwd=tmp_dir,
                env={"PATH": "/usr/bin:/bin:/usr/sbin:/sbin"},
                preexec_fn=_set_child_limits,
                capture_output=True,
                text=True,
                timeout=WALL_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            return None, (SOLUTION_TIMEOUT, f"wall-clock timeout after {WALL_TIMEOUT_SECONDS}s")

        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout or "").strip().splitlines()
            tail = detail[-1] if detail else f"exit {proc.returncode}"
            return None, (SOLUTION_RUN_ERROR, f"exit {proc.returncode}: {tail}")

        out = proc.stdout
        # The runner writes exactly one JSON object with no trailing newline. Any
        # newline or extra content means the solution itself emitted output, which
        # the contract treats as a protocol violation. A trailing newline alone is
        # tolerated (the runner emits none, but stay robust to a single trailing \n).
        if out.strip() == "":
            return None, (SOLUTION_PROTOCOL_ERROR, "no output on stdout")
        if out.rstrip("\n").count("\n") > 0:
            return None, (SOLUTION_PROTOCOL_ERROR, "expected exactly one JSON object on stdout, found extra output")
        try:
            payload = json.loads(out)
        except json.JSONDecodeError:
            return None, (SOLUTION_PROTOCOL_ERROR, "stdout is not valid JSON")
        if not isinstance(payload, dict):
            return None, (SOLUTION_PROTOCOL_ERROR, "stdout JSON is not an object")
        return payload, None


def verify_item(item: dict, pack_root: pathlib.Path):
    """Verify one item's solution. Returns (status, code_or_none, detail).

    status is one of: "PASS", "FAIL", "SKIP".
    """
    item_id = item.get("id", "<unknown>")
    solution = item.get("solution")
    if not solution:
        vstatus = item.get("verification_status", "unknown")
        return "SKIP", None, f"no solution (status {vstatus})"

    solution_path = pack_root / solution["path"]
    if not solution_path.exists():
        return "FAIL", SOLUTION_RUN_ERROR, f"solution file not found: {solution['path']}"

    payload, err = run_solution(solution_path)
    if err is not None:
        return "FAIL", err[0], err[1]

    item_type = item.get("item_type")
    answer_key = item.get("answer_key", {})

    # Comparison rules per item_type.
    if item_type == "single_best":
        expected = answer_key.get("correct")
        got = payload.get("option_key")
        if got != expected:
            return "FAIL", SOLUTION_KEY_MISMATCH, f"option_key {got!r} != answer_key.correct {expected!r}"
    elif item_type == "numeric_entry":
        expected = answer_key.get("value")
        tol_abs = answer_key.get("tol_abs", 0)
        tol_rel = answer_key.get("tol_rel", 0)
        got = payload.get("value")
        if got is None or not isinstance(got, (int, float)):
            return "FAIL", SOLUTION_PROTOCOL_ERROR, f"numeric_entry value not numeric: {got!r}"
        tolerance = max(tol_abs, tol_rel * abs(expected))
        if abs(got - expected) > tolerance:
            return (
                "FAIL",
                SOLUTION_KEY_MISMATCH,
                f"value {got!r} not within tol ({tolerance}) of answer_key.value {expected!r}",
            )
    else:
        return "FAIL", SOLUTION_PROTOCOL_ERROR, f"unsupported item_type: {item_type!r}"

    # W3-2 rider: enforce LR consistency when the solution declares it.
    consistency = payload.get("consistency")
    if consistency is not None:
        if not consistency.get("satisfiable", False):
            return "FAIL", SOLUTION_UNSATISFIABLE, "check_consistency() reports premises unsatisfiable"
        if not consistency.get("unique", False):
            return "FAIL", SOLUTION_AMBIGUOUS, "check_consistency() reports the keyed answer is not unique"

    detail = "key verified"
    if consistency is not None:
        detail = "key verified; constraints satisfiable and unique"
    return "PASS", None, detail


def _load_items(pack_root: pathlib.Path):
    """Load items from a pack directory: items/*.json, else a flat pack.json."""
    items_dir = pack_root / "items"
    if items_dir.is_dir():
        return [json.loads(p.read_text()) for p in sorted(items_dir.glob("*.json"))]
    pack_file = pack_root / "pack.json"
    if pack_file.is_file():
        return json.loads(pack_file.read_text()).get("items", [])
    raise SystemExit(f"no items/ directory or pack.json under {pack_root}")


def run_pack(pack_root: pathlib.Path) -> int:
    items = _load_items(pack_root)
    ok = True
    n_pass = n_fail = n_skip = 0

    for item in items:
        item_id = item.get("id", "<unknown>")
        status, code, detail = verify_item(item, pack_root)
        if status == "PASS":
            n_pass += 1
            print(f"PASS  {item_id}: {detail}")
        elif status == "SKIP":
            n_skip += 1
            print(f"SKIP  {item_id}: {detail}")
        else:
            ok = False
            n_fail += 1
            print(f"FAIL  {item_id}: {code} - {detail}")

    print(
        f"\nsolution harness: {n_pass} passed, {n_fail} failed, {n_skip} skipped "
        f"({len(items)} items)"
    )
    return 0 if ok else 1


def main(argv) -> int:
    if len(argv) != 2:
        print("usage: python3 run_solutions.py <pack-directory>", file=sys.stderr)
        return 2
    pack_root = pathlib.Path(argv[1]).resolve()
    if not pack_root.is_dir():
        print(f"not a directory: {pack_root}", file=sys.stderr)
        return 2
    return run_pack(pack_root)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
