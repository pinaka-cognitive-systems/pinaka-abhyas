# ADR 0004: Build-time AI, zero runtime AI

Date: 2026-06-10
Status: Accepted

## Context

AI generates the question items, the explanations, and the per-distractor
rationales. The question is when that generation runs: at build time, baked into
the shipped content pack, or at runtime, called from the student's device.

The app targets students who may be offline, on metered data, and without any
account. It has no backend and a zero-cost operating target.

## Decision

All AI runs at build time. Item generation, explanations, and distractor
rationales are authored through Claude sessions during content production,
verified, and frozen into the content pack that ships with the app.

The app contains zero runtime AI. A student needs no API key and no internet after
first load. The shipped pack is a static, verified artifact.

## Alternatives considered

Runtime AI for on-demand explanations or hints. Rejected. It would require every
student to hold an API key or route through a paid backend, which breaks the
free, no-account, offline promise and the zero-cost target. It would also put
unverified model output in front of students at the moment of learning, which is
exactly where correctness matters most.

## Consequences

- The app works fully offline after first load. No keys, no accounts, no network
  dependency for the core loop.
- Every word a student reads has passed the build-time verification pipeline. No
  unverified text reaches a learner.
- New or corrected explanations ship as content-pack updates, not as live calls.
- Generation cost is bounded and paid once at build time, not per student per
  session.
