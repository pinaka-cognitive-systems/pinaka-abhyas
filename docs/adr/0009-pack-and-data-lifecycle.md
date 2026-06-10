# ADR 0009: Pack and data lifecycle

Date: 2026-06-10
Status: Accepted.

## Context

Packs will update while a cohort is live: new items as the bank grows, corrected items
when errata land. ADR 0004 promises corrections ship as content-pack updates, but
nothing defined how an offline client learns of a new pack, what happens to a student's
history when an item is fixed or removed, or what the progress-export file contains.
The audit (LCY-01 through LCY-11) found these gaps land exactly where the first app
code is about to be written. The first real case already exists: item 000009 is
quarantined and will be replaced.

## Decision

**Event sourcing is the contract.** The event log is the single source of truth for
student state. Mastery, scheduler, and readiness state must be rebuildable from the
event log plus the current pack, deterministically. No derived state is ever the only
copy of anything. This is binding on the TypeScript engine (ADR 0010).

**Pack identity and versioning.** Every pack ships a manifest:
pack id, semantic version (major = schema or Profile break, minor = new items,
patch = errata batch), taxonomy_version, item count, a content-hash listing, creation
date, and minimum app version. The app records which pack version each session ran
against.

**Item lifecycle.** `verification_status` gains `retired`. An item that shipped and was
later found defective is never deleted from the pack: it becomes a tombstone (retired,
optionally with `superseded_by` naming its replacement). Tombstones stay renderable for
history review, are excluded from selection, and their scheduler entries are dropped, or
remapped when `superseded_by` exists. The engine treats bank membership as input and
never returns an unrenderable item; due entries pointing at absent items are skipped and
logged. Pack-transition cases are a mandatory golden-vector family.

**Key fixes re-score history.** Events store the raw response, not only the computed
verdict (the engine event type carries the response; this corrects the prototype, which
dropped it). When a pack update re-keys an item, events whose `item_content_hash`
matches the old version are re-scored from the stored raw response: `correct` and
`selected_misconception` are recomputed against the corrected key and rationale map,
then all derived state is rebuilt. A student is never left with mastery built on a
wrong key. The re-score is recorded as a system event so the log explains itself.

**Taxonomy migration.** Events keep the `taxonomy_version` they were recorded under.
A pack that bumps the bundle ships a node-id migration map (old id to new id); unmapped
ids resolve to the nearest surviving ancestor. The engine applies the map when replaying
history recorded under older versions.

**Update flow.** When online, the service worker fetches the pack manifest; a newer
compatible version downloads in the background to a staging area and swaps atomically.
The student sees a short, honest changelog (errata notes name what was wrong). No
update ever happens mid-mock.

**Progress export.** One file, one envelope:
format_version, exported_at, app_version, pack_id, pack_version, taxonomy_version,
install_id, and the full event list. Events only; derived state is rebuilt on import.
Import merges by event_id (idempotent, never destructive) and replays through the same
re-score and migration rules as a pack update. The envelope is versioned from day one
so no backup is ever stranded.

**Mock sessions survive interruption.** An in-progress mock persists: mock id, item
order seed, answers so far, and elapsed-time accounting. On resume, the clock and the
rules are honest and visible: time lost to an interruption is handled by a stated
policy shown to the student, not silently forgiven or silently punished.

**Event schema version 2.** `uqs-event-2` adds one optional `device_context` field
(form factor and viewport class, no identifiers) so calibration can separate hard
questions from small screens, plus the raw-response requirement above. Added now,
before any real student exists.

## Consequences

- The storage adapter (ADR 0008) and service worker implement this contract; the
  golden vectors test it; the export file honors it.
- The engine needs bank membership, the migration map, and raw responses as inputs;
  the TypeScript engine is built to this from the start.
- Errata become a visible product feature, consistent with publishing the verification
  funnel: students see what was fixed, and their history is corrected rather than
  poisoned.
