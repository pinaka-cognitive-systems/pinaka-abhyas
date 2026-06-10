# ADR 0002: Dual license: AGPL-3.0 code, CC BY-NC-SA 4.0 content

Date: 2026-06-10
Status: Accepted

## Context

pinaka-abhyas releases two distinct assets with different reuse goals. The app
code is meant to be a public showcase and a genuine open-source project that
others can study, run, and improve. The question bank is meant to be free for
students and open to community correction and translation, while staying out of
the hands of coaching companies who would repackage it for sale.

Code and content need different licenses because they have different reuse rules.
One license cannot serve both.

## Decision

Two licenses, both in effect.

Application code: GNU AGPL-3.0. Anyone may use, study, modify, and redistribute
the code. A modified version, including one run as a network service, must release
its source under the same license.

Question content: CC BY-NC-SA 4.0. Attribution to Pinaka, no commercial use,
share-alike on derivatives. Every shipped question carries a `provenance.license`
SPDX field set to `CC-BY-NC-SA-4.0`. Internal drafts not cleared for release carry
`LicenseRef-pinaka-internal-unreleased` and are never shipped.

## Alternatives considered

CC BY-NC-ND 4.0 for content. This was the prior choice. The NoDerivatives term
blocked remixing, which also blocked the community from fixing errors and from
translating items into regional languages. Rejected: the cost of forbidding good
derivatives outweighs the benefit, and NC already blocks commercial repackaging.

A permissive content license such as CC BY. Rejected: it would let a coaching
company take the bank and sell it, which contradicts the free-for-students goal.

A single license across code and content. Rejected: AGPL is a software license and
fits poorly over prose and answer keys. Creative Commons does not recommend its
licenses for software.

## Consequences

- Coaching companies cannot legally repackage the question bank for sale. NC holds
  that line.
- The community can fix wrong keys, sharpen explanations, and translate items, as
  long as the derivative stays under CC BY-NC-SA 4.0. SA keeps derivatives open.
- Pinaka can grant the content license because every shipped item is original,
  authored from the public syllabus. No ICAI or other exam-board questions are
  redistributed.
- The licenses live in `LICENSE` (code), `LICENSE-CONTENT.md` (content), and are
  summarized in `LICENSING.md`. The per-item SPDX value is the source of truth at
  the item level.
