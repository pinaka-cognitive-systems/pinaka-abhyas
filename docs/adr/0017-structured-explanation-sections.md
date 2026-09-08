# ADR 0017: Structured explanation sections in the Core

Date: 2026-06-11
Status: Accepted.

## Context

The UX audit (2026-06-11) reviewed post-answer teaching in Abhyas. Abhyas showed a
verdict line, a misconception line on wrong answers, and the explanation prose split
into numbered sentences. That is thin. A student who answers wrong needs more than a
verdict. The audit set a richer target: a punchline always visible, a per-option
diagnosis, a how-to-approach section, a take-home lesson, and a timing strategy, each
a collapsible numbered reveal. Students get the quick reason first and can open the
depth they want.

Half of that structure already existed in the Core (`per_option_rationale` carries
per-option verdicts, rationales, and misconceptions). The other four sections had
no home: `explanation` is one prose string, and sentence-splitting it is layout,
not structure. The gap is exam-agnostic; every exam benefits from the same
teaching shape, which is what qualifies the change for the Core rather than a
Profile (the Core never changes to fit one exam).

## Decision

The Core gains one optional field, `explanation_sections`:

- An object with exactly four required string sections: `punchline` (why the
  keyed answer wins, one or two sentences, always visible in the UI), `approach`
  (how to attack this question type from a cold read), `lesson` (the
  transferable rule), `timing` (how long it should take and what to cut first).
- All-or-nothing: the field is optional, but when present all four sections are
  present. Partial structures would make the UI ragged across items.
- Per-option teaching stays in `per_option_rationale`. No duplication.
- `explanation` remains required and canonical; `explanation_sections` is
  teaching layered on top, not a replacement.
- None of it enters the content hash. Identity is the problem, not the teaching
  (spec section 9); packs can gain sections in a patch release without item
  identity churn.

The app renders the sections as numbered reveals (punchline open by default) and
degrades gracefully: items without sections render as before.

## Consequences

- The ca-foundation-qa pack backfills sections for its 81 items; the prashna
  generation spec gains the four sections so future runs produce them natively.
- The voice rules apply to the new sections; the Tier 2 `DASH_VIOLATION` and
  notation checks must extend over them.
- Section length budgets are enforced socially (review), not by schema, beyond
  minimum lengths; caps can move to the schema once real content shows where
  the line is.
