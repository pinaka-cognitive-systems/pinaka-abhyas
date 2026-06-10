# Solution harness contract

Date: 2026-06-10. Owner: the spec holder. Implementations (run_solutions.py and the CI
wiring) build against this document. This is the W3-1 sandbox contract from the master
plan, the enforcement half of ADR 0005.

## What the harness does

Every item carrying a `solution` field has its solution executed; the computed answer
must reproduce the item's answer key. A mismatch is a hard violation. An item may carry
`verification_status: machine_verified` only after this harness has passed it in CI.

## Execution protocol

- Each solution runs as a separate OS process: `python3 -I` (isolated mode: no user
  site-packages, no current-directory imports), working directory a fresh temporary
  directory, environment cleared to a minimal allowlist (PATH only).
- The harness never imports solution code into its own process. A wrapper invokes
  `solve()` and prints a single JSON object to stdout: `{"value": ..., "option_key": ...}`.
  Anything else on stdout is a protocol violation.
- Resource limits set in the child before exec: CPU time 5 seconds, address space
  256 MB, file size 1 MB, no core dumps. Wall-clock timeout 10 seconds.
- Comparison: for `single_best`, `option_key` must equal `answer_key.correct`. For
  `numeric_entry`, `value` must match `answer_key.value` within `tol_abs`/`tol_rel`.
- Violation codes: `SOLUTION_KEY_MISMATCH`, `SOLUTION_RUN_ERROR`, `SOLUTION_TIMEOUT`,
  `SOLUTION_PROTOCOL_ERROR`. All are hard rejects.

## Threat posture, stated honestly

Solutions are content: in a public repo they can arrive from contributors, so the
harness treats them as untrusted code. The layers, and what each does and does not do:

1. Process isolation, cleared environment, and resource limits stop accidental damage
   and resource abuse. They do not stop deliberate network use by themselves.
2. CI posture is the real boundary for hostile code: fork pull requests run with a
   read-only token and no secrets (GitHub default, kept that way deliberately); the
   solution job runs in a job with no secrets mounted; runners are ephemeral. There is
   nothing to exfiltrate and nothing writable.
3. Review remains in the loop: solution diffs are content review, and a solution that
   does anything beyond computing its answer is rejected on sight.

A kernel-level sandbox (seccomp, containers) is deliberately out of scope for v1; the
secret-free CI environment makes it unnecessary. Recorded so the trade is conscious.

## Where it runs

- `schema/validator/run_solutions.py`: runs the harness across a pack directory,
  prints one PASS/FAIL line per item, exits nonzero on any violation.
- CI: a hard step in the main job after Tier 2, over `packs/ca-foundation-qa/`.
- `packs/ca-foundation-qa/build_and_validate.py`: includes the harness so a pack
  build is always a verified build.
- The promotion path (finishing W4-1): when the harness and the LR checker pass an
  item in CI, a maintainer flips its status to `machine_verified`; the schema ratchet
  (solution required for that status) and this harness together make the label
  unfakeable.

## LR items (W3-2 rider)

Logical-reasoning solutions must be solvers, not narrations: enumeration over the
constraint space (seating permutations, kinship graphs, direction walks) that derives
the answer and, additionally, asserts the premises are satisfiable and the answer
unique. `SOLUTION_UNSATISFIABLE` and `SOLUTION_AMBIGUOUS` are hard rejects; the
quarantined item 000009 is the standing example of why satisfiability is checked.
