# Security

Pinaka Abhyas is a static, client-side PWA. There is no backend, no server, and no
accounts. All student data — event log, progress, exam date — stays on the student's
device in the browser's Origin Private File System (OPFS). Nothing is transmitted to
any server.

## Reporting a vulnerability

Report vulnerabilities privately via **GitHub Security Advisories**: open this
repository's **Security** tab and choose **"Report a vulnerability"**. This keeps
the report confidential until a fix is ready. (If the private form is unavailable,
open a plain issue asking for a private channel — do not post details publicly.)

There is no bug bounty program.

## Dependency advisories

Every npm and pip dependency in this repo is a build or test tool. The shipped
product is the static output of `npm run build`; it contains none of them. So a
dependency advisory in vite, vitest, esbuild, or a Python validator cannot reach
a student: the vulnerable code never leaves the developer's machine or CI.

Because of that, a raw `npm audit` is noisy. It flags dev-only and platform-
specific advisories, some of which cannot apply to this project's usage at all
(for example a Deno-runtime RCE in a Node project, or a Vitest UI server we never
start). To keep the signal honest without ignoring real risk, CI runs
`tools/audit-gate.mjs` in both `app/` and `engine-ts/` (`npm run audit`). The gate
fails the build on any new advisory at moderate severity or above, and passes
only those we have read and judged inapplicable. Each allowlisted advisory in
that file carries a written reason and a review trigger; the allowlist is the
audit trail, not a mute button. A new advisory therefore stops a merge until a
human either upgrades the dependency or records why it is accepted.

Dependabot opens weekly grouped PRs (`.github/dependabot.yml`) so the toolchain
stays current and advisories arrive as reviewable changes rather than surprises.

## Untrusted contributor code

This project executes contributor-supplied code as part of validation. Every shipped
question ships an executable Python `solution` that the harness runs to reproduce the
answer key (ADR 0005). The harness treats those solutions as untrusted:

- each runs in a separate, isolated process (`python3 -I`), in a fresh temporary
  working directory, with the environment cleared to a minimal allowlist;
- resource limits are enforced (CPU 5s, address space 256 MB, file size 1 MB,
  wall-clock 10s, no core dumps);
- the CI job that runs solutions has no secrets mounted and the runner is ephemeral,
  so there is nothing to exfiltrate and nothing writable. Fork pull requests run with
  a read-only token by GitHub default.

The full contract is in `schema/validator/SOLUTION_HARNESS.md`. A kernel-level sandbox
(seccomp, containers) is deliberately out of scope for v1 because the secret-free CI
boundary makes it unnecessary; that trade is recorded in the same document. A solution
that does anything beyond computing its answer is rejected in review.
