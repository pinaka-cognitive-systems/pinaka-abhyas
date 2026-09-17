# Proposals

A proposal is an idea under review. It is not a decision. Decisions live in
`docs/adr/` as numbered records, and only an ADR accepts or declines a proposal.

Every file in this folder starts with these lines, right after the title:

- `Status:` one of `Proposed`, `Accepted`, or `Declined`. Once an ADR decides it,
  name that ADR on the same line.
- `Author:` the person who wrote it, with their GitHub login.
- `Submitted:` the date it was submitted.

A proposal changes nothing by itself: no code, no schema, no content, no ADR. When
an ADR accepts or declines it, update the status line and link the ADR. Do not
delete a declined proposal. It stays as the record of what was considered and why
it was not taken.
