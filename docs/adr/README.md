# Architecture Decision Records

Each ADR records one load-bearing decision: the context, the decision, the
alternatives considered, and the consequences.

ADRs are immutable. Once written, an ADR is never edited. A decision that changes
gets a new ADR that supersedes the old one and references it. The old ADR stays
in place as the historical record.

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-pwa-over-desktop-shell.md) | PWA over desktop shell | Accepted |
| [0002](0002-dual-license-agpl-and-cc-by-nc-sa.md) | Dual license: AGPL-3.0 code, CC BY-NC-SA 4.0 content | Accepted |
| [0003](0003-python-reference-engine-ts-port.md) | Python reference engine with a TypeScript port and golden-vector conformance | Superseded by 0010 |
| [0004](0004-build-time-ai-zero-runtime-ai.md) | Build-time AI, zero runtime AI | Accepted |
| [0005](0005-machine-verified-item-pipeline.md) | Machine-verified item pipeline | Accepted |
| [0006](0006-elo-now-telemetry-path-to-irt.md) | Elo mastery now, telemetry path to IRT | Partially superseded by 0012 |
| [0007](0007-one-domain-marketing-site.md) | One domain, marketing site renders from the repo | Accepted, withdrawn from the public record |
| [0008](0008-storage-and-hosting.md) | Storage and hosting: opfs-sahpool on Cloudflare Pages | Accepted |
| [0009](0009-pack-and-data-lifecycle.md) | Pack and data lifecycle | Accepted |
| [0010](0010-single-typescript-engine.md) | One engine, in TypeScript | Accepted |
| [0011](0011-device-target-phone-floor-desktop-best.md) | Device target: phone floor, desktop best | Accepted |
| [0012](0012-glicko-lite-mastery.md) | Glicko-lite mastery | Accepted |
| [0013](0013-english-only-v1.md) | English-only v1, Hindi deferred with a trigger | Accepted |
| [0014](0014-anonymous-telemetry-dpdp.md) | Telemetry is anonymous by construction | Accepted |
| [0015](0015-notation-unicode-first.md) | Notation: unicode-first, KaTeX pre-approved escape | Accepted |
| [0016](0016-stimulus-group-and-multi-select-reserved.md) | Stimulus groups and multi-select reserved for pack 2 | Accepted |
| [0017](0017-structured-explanation-sections.md) | Structured explanation sections in the Core | Accepted |
| [0018](0018-design-parity-rulings.md) | Design parity rulings (the eleven decisions) | Accepted |
| [0019](0019-mock-mistakes-review-pool.md) | Mock mistakes reach Review as a drill-to-schedule pool | Superseded by 0020 |
| [0020](0020-fsrs-scheduler-mock-ingestion.md) | FSRS-4.5 scheduler, mock ingestion, workload balancing | Accepted |
| [0021](0021-hierarchical-shrinkage-reads.md) | Read-time hierarchical shrinkage for skill estimates | Accepted |
| [0022](0022-mock-form-comparability.md) | Mock form comparability: difficulty mix and exposure control | Accepted (difficulty mix superseded by 0024) |
| [0023](0023-explanation-kinds.md) | Explanation kinds and the per-archetype teaching contract | Accepted |
| [0024](0024-mock-mix-mirrors-icai.md) | Mock difficulty mix mirrors the real ICAI paper | Accepted |

ADRs 0001 through 0007 record the project's founding
decisions and share the founding date; their order within that date is the numeric
order.

Some ADR bodies cite working documents (the deep audit, planning records) that have
since moved out of the tracked tree into the operator-internal `internal/` area. ADRs
are immutable, so those citations stand as written: they record the basis a decision
rested on at the time. The artifacts still exist; they are simply not part of the
public doc surface. ADR-to-ADR references (supersession, partial supersession) remain
valid regardless of where superseded planning docs now live.

## Supersession pointers

ADR bodies are immutable and carry no forward pointer in their text. The table above
is the authoritative supersession record. Key pointers:

- **0003** (Python reference engine with TS port) — superseded by **0010** (single
  TypeScript engine). The Python prototype is archived at `prototypes/engine-py/`.
- **0006** (Elo mastery) — partially superseded by **0012** (Glicko-lite mastery).
  The Elo update rule is replaced; the IRT telemetry path remains.
- **0019** (mock mistakes review pool) — superseded by **0020** (FSRS-4.5 scheduler
  with direct mock ingestion). The interim pool surface is removed; every graded
  event advances the item's schedule directly.
