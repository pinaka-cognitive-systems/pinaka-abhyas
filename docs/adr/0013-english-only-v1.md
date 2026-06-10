# ADR 0013: English-only v1, Hindi deferred with a trigger

Date: 2026-06-10
Status: Accepted.

## Context

A large share of CA Foundation aspirants are more comfortable in Hindi, and the exam is
offered in both English and Hindi. The brand docs already set a CEFR B1 reading ceiling
because many users read English as a second language. The audit (PED-10) found the
project had silently excluded Hindi-medium students with no recorded decision. Silence
is the failure mode; the decision itself can honestly go either way.

## Decision

v1 ships English-only, with the B1 ceiling enforced as a lint on item content, not just
on interface copy. Hindi is deferred, not dismissed, with a recorded revisit trigger:
when the English app shows real traction (the Gate B return-rate bar met by a public
cohort), Hindi becomes the next major content investment, and it enters through the
pipeline like everything else: translated items are verified items, with the same
executable-solution and audit requirements, never a bulk machine translation pasted
into the bank. The schema already carries `lang` per item, so the contract needs no
change when that day comes.

## Consequences

- No structural debt: items, packs, and events carry language fields from day one.
- The honest cost: some students are not served by v1. The mitigation is the B1
  ceiling, Indian numeric conventions in items, and plain wording everywhere.
- A premature half-translation, the worst outcome for an honesty brand, is ruled out.
