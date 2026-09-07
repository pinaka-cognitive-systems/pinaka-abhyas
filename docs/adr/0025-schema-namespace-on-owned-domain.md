# ADR 0025: Schema identifiers use a domain the project owns

Date: 2026-09-07
Status: Accepted

## Context

Every JSON Schema in `schema/` carries an `$id`, and the CA Profile composes the
Core through a `$ref` to that `$id`. Those identifiers used the host
`pinaka.dev`.

The project does not own `pinaka.dev`. A check on 2026-09-07 found the domain
registered and parked by a third party. It resolves to 216.24.57.1 on Hostinger
parking nameservers.

Nothing in this repository fetches the identifier. `schema/validate.py` and
`schema/validator/run_checks.py` register the local Core file under its `$id` in
a `referencing` registry, so every reference resolves from disk and no request
leaves the machine.

The risk is downstream and it arrives when the repository becomes public. Some
JSON Schema tooling does resolve `$id` and `$ref` over the network. Such a tool
would fetch a schema definition from a host the project does not control.
Publishing the identifier also asserts a namespace that belongs to someone else.

## Decision

Schema identifiers move to `mypinaka.com`, a domain the project owns.

- Core item schema: `https://mypinaka.com/schema/uqs-core-1.json`
- Event log schema: `https://mypinaka.com/schema/uqs-event-2.json`
- CA Foundation Profile: `https://mypinaka.com/schema/profiles/ca-foundation-qa-1.json`

The version segment in each identifier is unchanged. Only the host changed, and
no schema property, constraint, or required field changed with it. The logical
contract is the same contract.

A schema identifier must name a host the project controls. That is the rule this
record sets, and it applies to any Profile added later.

## Alternatives considered

A URN such as `urn:pinaka:schema:uqs-core-1`. A URN is a valid absolute URI for
`$id`, and no resolver can fetch it, so the third-party host problem could never
return. Rejected because an owned HTTPS identifier keeps the option of serving
the schema files at that address later, and the ownership rule above already
closes the risk.

Buying `pinaka.dev`. Rejected: it costs money and a renewal obligation forever,
it depends on a third party agreeing to sell, and it would delay the public
release for no gain over a domain already owned.

Leaving the identifiers unchanged. Rejected: publishing an identifier on a
stranger's host is a defect, and it is far cheaper to correct before the
repository is public than after other people reference the old value.

## Consequences

- Anyone who pinned the old identifier must update it. The repository is not yet
  public, so no outside consumer exists.
- A sibling private content repository uses the old identifier for its own copy
  of the Core. It now differs from this repository until the same change is made
  there. That repository owns its copy independently, so the two can differ
  without breaking either one. Making the matching change there is a tracked
  follow-up.
- Both validator tiers, the validator test suite, and the pack build were run
  after the change and stayed green.
