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
| [0007](0007-one-domain-marketing-site.md) | One domain, marketing site renders from the repo | Accepted |
| [0008](0008-storage-and-hosting.md) | Storage and hosting: opfs-sahpool on Cloudflare Pages | Accepted |
| [0009](0009-pack-and-data-lifecycle.md) | Pack and data lifecycle | Accepted |
| [0010](0010-single-typescript-engine.md) | One engine, in TypeScript | Accepted |
| [0011](0011-device-target-phone-floor-desktop-best.md) | Device target: phone floor, desktop best | Accepted |
| [0012](0012-glicko-lite-mastery.md) | Glicko-lite mastery | Accepted |
| [0013](0013-english-only-v1.md) | English-only v1, Hindi deferred with a trigger | Accepted |
| [0014](0014-anonymous-telemetry-dpdp.md) | Telemetry is anonymous by construction | Accepted |
| [0015](0015-notation-unicode-first.md) | Notation: unicode-first, KaTeX pre-approved escape | Accepted |
| [0016](0016-stimulus-group-and-multi-select-reserved.md) | Stimulus groups and multi-select reserved for pack 2 | Accepted |

ADRs 0001 through 0007 record the project's founding
decisions and share the founding date; their order within that date is the numeric
order.
