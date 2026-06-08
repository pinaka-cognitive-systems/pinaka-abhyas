# Pinaka Unified Question Schema (UQS) v1, rev 3

Status: Draft for review (rev 3 applies round-3 fixes, security model, and v1 scoping; see sections 20 and 21)
Owner: Pinaka
Applies to: all exams (first CA Foundation, then LSAT migration)
Date: 2026-06-07

---

## 1. Purpose and scope

The UQS is the contract between two systems:

- **Content tooling** (Python, `prashna`). Exam-specific, complex, different per exam.
- **App engine** (TypeScript, Tauri). Exam-agnostic, one codebase for all exams.

The schema exists so the engine can do five jobs for any exam without exam-specific code:

1. Render an item.
2. Accept and score an answer.
3. Log the interaction.
4. Select the next item.
5. Give diagnostic feedback.

**Design rule that decides every field:** if the exam-agnostic engine does not consume it, it does not belong in the core. It goes in the per-exam extension or the taxonomy.

This document defines the logical contract. It is format-independent. Two physical representations are in section 12: authoring markdown and runtime SQLite.

### 1.1 v1 implementation scope

The core contract is universal and defined once. But v1 **implements and hardens only the CA Foundation QA surface**: `single_best` and `numeric_entry` items, `image` and `diagram` assets, the CA taxonomy bundle, scoring config, and the event log.

Defined but **deferred and not hardened in v1** (build no validators, SQLite tables, or build steps for these until LSAT migration): Stimulus and grouping, the `comparative_passage` and `data_set` kinds, the LSAT extension, and `multi_select`. They are specified so the core stays stable when they arrive, not so they ship now. Hardening multi-exam machinery before the first exam ships is over-engineering.

---

## 2. Architecture: three layers

| Layer | Owner | Stability | Holds |
|---|---|---|---|
| **Core** | UQS | One-way door. Rarely changes. | The universal spine the engine consumes. |
| **Taxonomy** | Per exam | Evolves per exam. | The controlled vocabulary that fills universal slots: concepts/skills, difficulty scale, misconceptions. |
| **Extension (`ext`)** | Per exam | Evolves per exam. | Everything exam-specific the engine does not need. Absorbs all complexity. |

The core is identically simple for CA Foundation and LSAT. CA carries a thin `ext`. LSAT carries a rich `ext`. Complexity lives at the edges, never the spine.

**Slots versus vocabulary.** The core defines universal slots. Each exam fills them from its own taxonomy. No skill or concept transfers across exams. The engine tracks mastery per referenced node id, blind to meaning.

---

## 3. Entities

UQS defines four record types:

1. **Item** — one question. Primary record.
2. **Stimulus** — shared material referenced by a group of items (RC passage, comparative pair, CA case study, JEE comprehension). Optional.
3. **Asset** — a figure, diagram, or image owned by exactly one Item or Stimulus. Optional. Section 4.9.
4. **Taxonomy** — per-exam concept graph, difficulty scale, and misconception vocabulary, versioned as one unit. Section 7.

---

## 4. The Item core fields

Required unless marked optional. Types are logical.

### 4.1 Identity and integrity

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | yes | Globally unique, stable. Built from the code registry (4.1.1). |
| `schema_version` | string | yes | Namespaced. Value `"uqs-1"`. The `uqs-` prefix discriminates a migrated UQS item from a legacy integer-versioned item. |
| `content_hash` | string | yes (derived) | SHA-256 hex of canonical content (section 9). Dedup, integrity, telemetry key. |
| `exam` | enum | yes | Exam code (full form), e.g. `ca_foundation`, `lsat`, `jee`. Selects taxonomy and extension schema. |
| `lang` | string | yes | BCP-47. Default `en`. i18n hook; no i18n machinery in v1. |
| `pool` | enum | yes | **Origin** pool, immutable. `seed` / `vault` / `arena`. Lifecycle changes live in `verification_status`, never in `id`. |
| `verification_status` | enum | yes | Trust state from the pipeline. `draft` / `machine_verified` / `human_reviewed` / `published` / `quarantined`. |
| `provenance` | object | yes | See 4.6. |

#### 4.1.1 ID code registry

`id` pattern: `{pool_code}_{exam_code}_{subject_code}_{seq}`. Every segment is a registered code, so invariant #2 is verifiable.

- **Pool codes** (fixed): `seed` → `sd`, `vault` → `vlt`, `arena` → `arn`. All 2-3 chars, none equal to the full enum. The pool code records the immutable origin and namespaces `seq`, so each pool assigns sequence numbers independently. The `pool` field equals this origin and is likewise immutable.
- **Exam codes** (registered per exam): `ca_foundation` → `caf`, `lsat` → `lsat`. Each new exam registers its code.
- **Subject codes** (registered per exam): CA Foundation `quantitative_aptitude` → `qa`, `business_economics` → `be`. LSAT `logical_reasoning` → `lr`, `reading_comprehension` → `rc`.
- **`seq`**: zero-padded to 6 digits, unique within `(exam, subject)`.
- Template-generated variants derive `id` from the template id plus a variant key, still resolving to registered codes.

The registry is data, validated at build. `content_hash` is the durable identity key independent of `id`.

### 4.2 Classification (universal slots, filled by per-exam taxonomy)

| Field | Type | Req | Notes |
|---|---|---|---|
| `tests` | list of node ids | yes, non-empty | Concepts/skills assessed. References exam taxonomy. First entry is the **primary** node for mastery attribution. |
| `difficulty_label` | string | yes | Ordinal on the exam scale, e.g. `L1`..`L4`. Allowed set and ordering defined by the exam taxonomy. |
| `taxonomy_version` | int | yes | Version of the exam taxonomy the item was tagged against. **Covers nodes, difficulty scale, and misconception vocabulary as one bundle.** Enables re-tag migration. |
| `tags` | list of string | optional | Freeform, non-controlled. Search and FTS only. Never used for mastery. Distinct from `tests`. |

### 4.3 Interaction and scoring

| Field | Type | Req | Notes |
|---|---|---|---|
| `item_type` | enum | yes | Closed universal set: `single_best` / `multi_select` / `numeric_entry`. Extensible, versioned. |
| `options` | list of `{key:int, text:md}` | required for choice types | `key` 1-indexed, unique, contiguous from 1. Absent for `numeric_entry`. Core requires >= 2. **Exact count (CA = 4, LSAT = 5) is enforced by the exam extension validator** (4.8). |
| `answer_key` | object | yes | Shape by `item_type`. See 4.4. |
| `expected_seconds` | int | optional, recommended | Target solve time. Pacing and timing analytics. |
| `group` | object | optional | `{stimulus_id, position}`. Links members of a passage set or case study. `stimulus_id` resolves to a Stimulus; the Stimulus `kind` tells the engine how to render the shared material, so no separate item `role` is needed. `position` int >= 1. Exam-specific item-to-stimulus nuance (e.g. which passage of a comparative pair) lives in `ext`. |

### 4.4 `answer_key` shape by `item_type`

- `single_best`: `{ correct: <option key> }`. Example `{ correct: 3 }`.
- `multi_select`: `{ correct: [<option keys>] }`. Must be **non-empty** (invariant #6).
- `numeric_entry`: `{ value: number, tol_abs: number, tol_rel: number, unit?: string }`. Both `tol_abs` and `tol_rel` are **required**, no silent default; authors must consciously choose. Exact match is `tol_abs: 0, tol_rel: 0` set explicitly. A response `r` is correct iff `|r - value| <= max(tol_abs, tol_rel * |value|)`.

Partial-credit policy for `multi_select` is **scoring config, not schema** (section 10).

### 4.5 Content (the teaching payload)

| Field | Type | Req | Notes |
|---|---|---|---|
| `stem` | markdown | yes | The question prompt. For grouped items, the question part only; shared material is in the Stimulus. May reference Assets (4.9). |
| `explanation` | markdown | yes, non-empty (>= 50 chars) | The teach-by-testing payload. May be structured by exam convention (LSAT five sections) via headings; structure is validated by the exam extension, not the core. May reference Assets. |
| `per_option_rationale` | list | required for choice items (exam-enforced) | Aligned to options. Each: `{ option_key, verdict: correct|incorrect, rationale: md, misconception?: <tag> }`. `misconception` references the exam misconception vocabulary at `taxonomy_version`, and is required on every incorrect option. The diagnostic gold, made universal. |
| `common_errors` | list | required for `numeric_entry` (exam-enforced) | The numeric analog of per-option diagnosis, since numeric items have no options. Each: `{ value, misconception, rationale }`. Lets the engine diagnose a wrong number ("you computed the compound-interest value, not the simple-interest one"). |

### 4.6 `provenance` object

| Field | Type | Req | Notes |
|---|---|---|---|
| `source` | string | yes | Generation session, extraction source, or import batch. |
| `license` | string (SPDX) | yes | Per-item license, e.g. `CC-BY-SA-4.0`. Required for open-source distribution. |
| `parent_id` | string | optional | Seed or template lineage. |
| `generator` | string | optional | Model or pipeline that produced it. |
| `attribution` | string | optional | Human or source credit. |
| `created` | date | yes | ISO date. |
| `updated` | date | optional | ISO date. |

### 4.7 `empirical` block (reserved, machine-filled, never authored by hand)

All keys nullable and **may be omitted** (omitted means null). Sparse is allowed; the engine treats absent as null. Filled by aggregating the event log after launch.

| Field | Type | Notes |
|---|---|---|
| `difficulty_b` | float\|null | IRT difficulty, ability units. |
| `discrimination_a` | float\|null | IRT discrimination. |
| `guessing_c` | float\|null | IRT pseudo-guessing. |
| `p_value` | float\|null | Proportion correct. |
| `avg_seconds` | float\|null | Mean solve time. |
| `n_responses` | int | Default 0. |
| `community_rating` | float\|null | 1..5. |
| `community_rating_count` | int | Default 0. |
| `calibration_status` | enum | `none` / `provisional` / `calibrated`. |
| `last_calibrated` | date\|null | |

### 4.8 `ext` object (per-exam extension)

`ext` is namespaced and validated by the exam's registered extension schema. The core validator ignores its internals; the exam extension validator enforces them, **including the exact option count** and any structured-explanation rules.

Examples of what lives in `ext`:

- **LSAT**: `stem_polarity` (standard/negative), `trap_polarity_checked`, `formal_logic` (premise structure for uniqueness re-solve), `rc_anchors`, `length_meta`, `explanation_sections`, `pool_assignment`, `tier`, source preptest provenance specifics.
- **CA Foundation**: `icai_skill_bucket` (recall/application), `icai_provenance`, `tier_eligibility`, authoring `diagram_spec` (compiled to an Asset at build; see 4.9).

### 4.9 Assets (figures, diagrams, images)

The core home for visual content, so the exam-agnostic engine can render any item that needs a figure. CA Foundation QA has geometry and graphs; JEE is figure-heavy. Diagrams must not hide in `ext`, which the engine ignores.

**Asset record:**

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | yes | Globally unique, derived from its owner: `{owner_id}_a{n}`, e.g. `vlt_caf_qa_000088_a1`. |
| `owner_type` | enum | yes | `item` / `stimulus`. Exactly one owner. Assets are not shared in v1 (deferred). |
| `owner_id` | string | yes | The owning Item or Stimulus id. |
| `kind` | enum | yes | `image` / `diagram`. |
| `mime` | enum | yes | `image/svg+xml` / `image/png` / `image/jpeg`. No HTML (security, 11.4). |
| `path` | string | yes | Location inside the signed content pack. |
| `content_hash` | string | yes (derived) | SHA-256 of the asset bytes, post-sanitization. |
| `alt` | string | yes | Accessibility text. Required, never empty. |
| `caption` | string | optional | |

**Referencing:** `stem`, `explanation`, option text, and Stimulus parts reference their owner's assets by id, via a `{{asset:<id>}}` placeholder or markdown image syntax resolving to the asset id.

**Tables** are authored as Markdown tables inside `stem`, `explanation`, or Stimulus parts, or as a structured `data_set` Stimulus. There is no HTML asset kind.

**Diagram authoring path:** a declarative `diagram_spec` may be authored in `ext`. The build validates it, then renders it to a sanitized SVG Asset (11.4). The runtime engine consumes only Assets, never `diagram_spec`. SVG preferred (small, crisp on low-end screens); raster for photos.

**Hash contribution:** only assets referenced by `stem` or `options` contribute their `content_hash` to the Item's `content_hash` (section 9). Explanation-only assets do not, because `explanation` is excluded from identity.

---

## 5. Stimulus record (shared material)

Optional. One per group. Referenced by `Item.group.stimulus_id`.

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | yes | Group id. |
| `exam` | enum | yes | |
| `kind` | enum | yes | `passage` / `comparative_passage` / `case_study` / `data_set`. |
| `parts` | list of `{label, body:md}` | yes, non-empty | One part for a single passage; two for comparative; structured rows for a case study or data set. May reference Assets. |
| `content_hash` | string | yes (derived) | Dedup and integrity. |
| `provenance` | object | yes | Same shape as 4.6. |
| `ext` | object | optional | Exam-specific stimulus metadata (word counts, source). |

Stimulus validation invariants are in section 11.2.

---

## 6. Universal item types

The closed set the renderer and scorer switch on. Exam-independent.

- `single_best` — exactly one correct option. Covers MCQ-4 (CA), MCQ-5 (LSAT), true/false, and assertion-reason (structured stem plus an `ext` flag, not a new core type).
- `multi_select` — one or more correct options.
- `numeric_entry` — numeric answer with explicit tolerance. Covers JEE numerical and CA numeric-answer items.

New types are added by versioning this list, never by overloading `ext`.

---

## 7. Taxonomy reference and integrity

- Each exam owns a versioned **taxonomy bundle**: a concept/skill graph (nodes with stable ids, names, parent links), an ordinal **difficulty scale** definition (CA `L1..L3`, LSAT `L1..L4`), and a **misconception vocabulary** (LSAT 21-code trap canon, CA misconception list). All three version together under one `taxonomy_version`.
- `tests[]` entries must reference existing node ids at `taxonomy_version`.
- `per_option_rationale[].misconception` must reference an existing misconception id at `taxonomy_version`.
- Referential integrity is enforced by the validator (section 11). This is what gives universality without losing rigor.

**Open item, gates LSAT migration:** reconcile the LSAT `skill_tree` vs `syllabus` granularity mismatch before LSAT migration.

---

## 8. Personalization contract

The engine never reads exam meaning. It consumes only:

- `tests[]` node ids → tracks mastery per node (Elo now, IRT later).
- `difficulty_label` and `empirical.difficulty_b` → item selection. **Precedence:** use `empirical.difficulty_b` when `empirical.calibration_status == calibrated`; otherwise fall back to `difficulty_label` mapped to a prior. While `provisional`, blend with weight proportional to `n_responses`.
- `per_option_rationale[].misconception` → error-pattern detection.
- `expected_seconds` and `empirical.avg_seconds` → pacing and speed analytics.
- `item_type`, `options`, `answer_key` → scoring.
- asset references in `stem` / `options` / `explanation` → rendering.
- `id`, `content_hash` → event-log keys.

This list is the reason each core field exists. The core is derived from this contract, not guessed.

---

## 9. `content_hash` canonicalization

Deterministic. Identity equals **the problem**, not the teaching. Used for dedup, integrity in signed packs, change detection, and telemetry keying.

**Canonical content set (allowlist, exhaustive). No denylist.** Hash exactly these and nothing else:

1. `exam` (identity is scoped per exam; no cross-exam merge).
2. `lang`.
3. `item_type`.
4. `stem` (normalized text).
5. `options`, sorted by `key`, option `text` only.
6. `answer_key`.
7. For grouped items: the referenced `Stimulus.content_hash`.
8. The `content_hash` of every Asset referenced by `stem` or `options`, sorted.

**Explicitly not hashed:** `explanation`, `per_option_rationale`, `tags`, `difficulty_label`, `provenance`, `empirical`, `ext`, `id`, dates, `pool`, `verification_status`. Two items differing only in their explanation are the **same** problem and will dedup; that is intended (a question bank wants one problem, best explanation, not duplicates).

**Procedure:**
1. Build the canonical object from the allowlist above.
2. Normalize all text: Unicode NFC, trim, collapse internal whitespace runs to single spaces. Do not lowercase.
3. Serialize as canonical JSON (sorted keys, no insignificant whitespace).
4. `content_hash = SHA-256(serialized)` as lowercase hex.

**Stimulus canonical content set (allowlist, exhaustive):** `exam`, `lang`, `kind`, `parts` in order (both `label` and `body`, normalized), and the `content_hash` of every Asset referenced by those parts, sorted. Same normalize, serialize, SHA-256 procedure as the Item. Dedup scope is within an exam.

Dedup scope is **within an exam**. Cross-exam leak detection is a separate mechanism (embedding similarity), not this hash.

---

## 10. Scoring boundary

Scoring is **not** in the item. It is exam-level config (`exams.yaml`, retained from current tooling).

- The item provides `item_type`, `answer_key`, `options`.
- The exam config provides marks, negative-marking rule, partial-credit policy, sectional rules.
- The engine computes a score from logged raw responses plus exam config.

This is why scoring is a two-way door. Change the rule, recompute from the event log. Never re-author content to change scoring.

**Open flag, gates `exams.yaml` for the first exam:** confirm the exact current ICAI negative-marking fraction for CA Foundation Papers 3 and 4. Do not assume. Verify against the official ICAI source.

---

## 11. Validation invariants (executable truth)

### 11.1 Item invariants

1. All required fields present and well-typed.
2. `id` parses as `{pool_code}_{exam_code}_{subject_code}_{seq}`; every segment resolves in the code registry (4.1.1); `id` unique within the pack.
3. `content_hash` equals the recomputed hash (section 9). (At build the hash is computed; this invariant runs at ingest and re-validation against content that already carries a hash.)
4. **No two items in the same `exam` share a `content_hash`.** Collision fails the build (it is a duplicate problem). This is a **pack-level** invariant: the validator must see the whole pack, not a one-item-at-a-time stream.
5. `item_type` in the universal set.
6. `options` present iff `item_type` is a choice type; count >= 2; `key` unique and contiguous from 1. Exact per-exam count enforced by the exam extension validator.
7. `answer_key` shape matches `item_type`; referenced option keys in range; `multi_select.correct` non-empty; `numeric_entry` has `tol_abs` and `tol_rel` present and >= 0.
8. `tests` non-empty; every node id exists at `taxonomy_version`.
9. `difficulty_label` in the exam difficulty scale at `taxonomy_version`.
10. `lang` is valid BCP-47.
11. `pool` and `verification_status` in their enums.
12. `explanation` non-empty (>= 50 chars).
13. `per_option_rationale[].option_key` aligns to existing options; `verdict` consistent with `answer_key`; `misconception` exists in the exam vocabulary at `taxonomy_version` if present.
14. `group.stimulus_id` resolves to an existing Stimulus; `group.position` >= 1.
15. Every Asset referenced by `stem`, `options`, `explanation` exists; `owner_id` matches the referencing record; `alt` non-empty; `mime` in the allowed set; `path` present in the pack; `content_hash` matches the bytes; the asset passed sanitization (11.4).
16. `provenance.license` is a valid SPDX identifier.
17. `ext` validates against the exam's registered extension schema.
18. `empirical` keys nullable and numeric where typed.

### 11.2 Stimulus invariants

1. `id` unique within the pack.
2. `content_hash` equals the recomputed hash.
3. `kind` in enum; `parts` non-empty.
4. `provenance.license` is a valid SPDX identifier.
5. Every referenced Asset resolves (as 11.1 #15).
6. **No two stimuli in the same `exam` share a `content_hash`** (pack-level).

### 11.3 Build order and validation phases

Build order: parse → normalize → **validate `diagram_spec`** → render it to sanitized SVG Assets → compute all `content_hash` values (Assets, Stimuli, Items) → **validate (11.1, 11.2)** → write SQLite → build manifest → sign pack → publish. Validating `diagram_spec` before rendering gives a clear authoring error instead of a broken SVG that only fails later.

Hash computation precedes validation, so invariants #3 and #4 are checkable. The recompute-and-compare in #3 also runs at ingest and re-validation, when content already carries a hash.

A failing record is quarantined, never shipped.

### 11.4 Security and content trust

All content is community-authored, shipped in signed packs, then rendered by the app. The signature proves the pack was not altered in transit. It does **not** prove the content is safe: a malicious or careless pull request can reach a signed pack. So content is treated as untrusted at render time.

- Markdown (`stem`, `explanation`, option text, Stimulus parts) is rendered with **raw HTML disabled**. No passthrough HTML, no `<script>`, no inline event handlers.
- Asset MIME is restricted to `image/svg+xml`, `image/png`, `image/jpeg`. No HTML assets.
- SVG can carry scripts. Every SVG Asset is **sanitized at build**: strip `<script>`, `<foreignObject>`, `on*` event-handler attributes, and external references (remote `href` / `xlink:href`, external entities). SVGs render via `<img>` or an inert renderer, never inlined into the DOM as live markup.
- The build **fails** if any asset fails sanitization or any markdown carries raw HTML.
- The engine verifies the pack signature before load. The signature covers items, stimuli, assets, and manifest.

---

## 12. Physical representations

One logical contract, two forms.

### 12.1 Authoring: markdown + YAML frontmatter (retained)

Human-readable, Git-friendly, ideal for community pull requests and review.

- Core fields and `ext` live in **frontmatter**, including the canonical `answer_key`.
- `stem`, `options`, `explanation`, `per_option_rationale` live in body sections under fixed headings (`## Options`, `## Explanation`, optional `## Per-option`).
- An optional `## Answer` body section is a **human cross-check only**; the validator confirms it equals `answer_key` and otherwise ignores it. Frontmatter `answer_key` is canonical.
- Assets referenced in body via `{{asset:<id>}}` or markdown image syntax.

### 12.2 Runtime: SQLite (compiled by the build pipeline)

Logical tables:

- `items` — core scalar fields as columns; `answer_key`, `provenance`, `empirical`, `ext` as JSON; `stem`, `explanation` as text. FTS5 over `stem`, options text, `explanation`, `tags`.
- `item_tests(item_id, node_id, ordinal)` — `ordinal = 0` marks the primary node. Lets selection query "items testing node X".
- `item_options(item_id, key, text)`.
- `item_rationale(item_id, option_key, verdict, rationale, misconception)`.
- `stimuli(id, exam, kind, parts_json, content_hash, provenance_json, ext_json)`.
- `assets(id, owner_type, owner_id, kind, mime, path, content_hash, alt, caption)` — single owner; `owner_type` is `item` or `stimulus`.
- `taxonomy_meta(exam, taxonomy_version, difficulty_scale_json, scale_order_json, node_count, misconception_count, source, created)` — **difficulty scale lives here, exam-level, not on nodes.**
- `taxonomy_nodes(exam, taxonomy_version, node_id, name, parent_id)`.
- `misconceptions(exam, taxonomy_version, id, name, description)` — keyed by the same `taxonomy_version` bundle.
- `content_pack_manifest` — pack version, item count, per-file checksums, signature.

### 12.3 Build pipeline

See 11.3 for order. The pipeline signs the whole pack; assets travel inside it and are checksummed in the manifest.

---

## 13. Versioning and migration

- `schema_version` is the string `"uqs-N"`. The `uqs-` prefix discriminates migrated UQS items from legacy integer-versioned items, so migration tooling is never blind.
- `taxonomy_version` bundles nodes, difficulty scale, and misconceptions; versions per exam.
- Extension schemas version per exam.
- Migrations are forward-only, scripted, idempotent. After migration: recompute `content_hash`, re-validate, re-stamp `schema_version` to `"uqs-1"`.
- The pipeline refuses to ship a pack containing mixed unmigrated versions.
- Legacy markdown still carrying an integer `schema_version` must be migrated **before** validation. The validator rejects an integer `schema_version` by design; that rejection is the discriminator working, not a bug.

---

## 14. Worked example: CA Foundation QA item (target UQS)

```yaml
---
id: vlt_caf_qa_000088
schema_version: "uqs-1"
content_hash: "<sha256>"
exam: ca_foundation
lang: en
pool: vault
verification_status: human_reviewed
provenance:
  source: legacy_q88_example
  license: CC-BY-SA-4.0
  parent_id: sd_caf_qa_000088
  created: 2026-04-29
tests: [qa.probability.conditional, qa.probability.independent_events]
difficulty_label: L3
taxonomy_version: 1
item_type: single_best
expected_seconds: 90
answer_key: { correct: 1 }
empirical: { calibration_status: none, n_responses: 0 }
ext:
  icai_skill_bucket: application
---

[stem text, may include {{asset:vlt_caf_qa_000088_a1}} for a diagram]

## Options
1. [option 1]
2. [option 2]
3. [option 3]
4. [option 4]

## Answer
1

## Per-option
- (1) correct: [why correct]
- (2) incorrect [misconception: complement_confusion]: [why wrong]
- (3) incorrect [misconception: independence_assumed]: [why wrong]
- (4) incorrect [misconception: arithmetic_slip]: [why wrong]

## Explanation
[>= 50 chars worked solution]
```

## 15. Worked example: LSAT LR item (target UQS)

```yaml
---
id: vlt_lsat_lr_000047
schema_version: "uqs-1"
content_hash: "<sha256>"
exam: lsat
lang: en
pool: vault
verification_status: human_reviewed
provenance:
  source: session_002_variant
  license: CC-BY-SA-4.0
  parent_id: session_002_skeleton_02_variant_7
  generator: opus_gen_v4
  created: 2026-05-01
tests: [lr.meta.point_at_issue]
difficulty_label: L3
taxonomy_version: 2
item_type: single_best
expected_seconds: 120
answer_key: { correct: 1 }
empirical: { calibration_status: none, n_responses: 0, difficulty_b: null }
ext:
  stem_polarity: standard
  trap_polarity_checked: true
  explanation_sections: [punchline, per_option, how_to_approach, take_home, timing]
  pool_assignment: mock
  tier: free
---

[stimulus + stem]

## Options
1. ... 2. ... 3. ... 4. ... 5. ...

## Answer
1

## Per-option
- (1) correct: ...
- (2) incorrect [misconception: out_of_scope]: ...
- (3) incorrect [misconception: partial_match]: ...
- (4) incorrect [misconception: reversed_logic]: ...
- (5) incorrect [misconception: distortion]: ...

## Explanation
### Punchline
...
### Per-option diagnosis
...
### How to approach
...
### Take-home lesson
...
### Timing strategy
...
```

---

## 16. Migration map

### 16.1 CA Foundation v1 → UQS

| CA v1 field | UQS target |
|---|---|
| `id` (4-digit seq) | `id` (registry codes; widen seq to 6 digits) |
| `schema_version: 1` (int) | `schema_version: "uqs-1"` (string) |
| `exam` | `exam` |
| `subject`, `topic`, `subtopic` | `tests[]` node refs (CA taxonomy node ids) |
| `difficulty` (L1-L3) | `difficulty_label` |
| `skill` (recall/application) | `ext.icai_skill_bucket` |
| `tags` | `tags` (freeform, optional) |
| `parent_seed_id` | `provenance.parent_id` |
| `icai_provenance` | `provenance.source` |
| `pool` | `pool` (origin) |
| `tier_eligibility` | `ext.tier_eligibility` |
| `correct_option` | `answer_key.correct` |
| `options` (4) | `options[]` |
| `answer` (body) | `## Answer` body cross-check; validated equal to `answer_key` |
| `diagram_spec` | `ext.diagram_spec` (authoring) → rendered to an SVG **Asset** at build |
| (none) | add `content_hash`, `lang`, `verification_status`, `provenance.license`, `empirical`, `taxonomy_version` |

### 16.2 LSAT v2 → UQS

| LSAT v2 field | UQS target |
|---|---|
| `skill_nodes[]` | `tests[]` |
| `topic`, `subtopic` | fold into taxonomy node refs |
| `difficulty` (L1-L4) | `difficulty_label` |
| per-option trap codes | `per_option_rationale[].misconception` |
| `stem_polarity` | `ext.stem_polarity` |
| `irt_a/b/c` | `empirical.discrimination_a` / `difficulty_b` / `guessing_c` |
| `calibration_status` | `empirical.calibration_status` |
| `community_rating`, `community_rating_count` | `empirical.*` |
| `expected_seconds` | `expected_seconds` |
| five-section explanation | `explanation` (structured) + `ext.explanation_sections` |
| `passage_set_id` | `group.stimulus_id` + a `Stimulus` record |
| `pool`, `pool_assignment`, `tier` | `pool` (origin) + `ext.pool_assignment` + `ext.tier` |
| `generation_source`, `parent_seed` | `provenance.source` / `provenance.parent_id` |
| `attribution` | `provenance.attribution` |
| RC passages | `Stimulus.parts`; any figures → `Assets` |

---

## 17. Decisions made (react if you disagree)

1. Markdown authoring retained; compile to SQLite. No JSON authoring.
2. Each exam registers its own extension schema, validated independently; it enforces exact option count.
3. `content_hash` is SHA-256 over an exhaustive allowlist (section 9). Identity is the problem, not the teaching: `explanation` is excluded; `exam` is included, so dedup is within-exam and there is no cross-exam false merge.
4. English first; `lang` present; no i18n machinery in v1.
5. `id` uses a registered code table; the pool segment is immutable origin; `content_hash` is the durable identity key.
6. Stimulus is a separate record; passages are not duplicated across their questions.
7. `tests[]` first entry is primary; no per-node weights in v1.
8. Diagrams and figures are core **Assets** with required `alt`; `diagram_spec` is authored in `ext` and compiled to an SVG Asset at build, so the engine renders diagrams without reading `ext`.
9. `taxonomy_version` bundles nodes, difficulty scale, and misconceptions; no separate `vocab_version`.
10. `schema_version` is the namespaced string `"uqs-1"`, discriminating UQS from legacy.
11. `numeric_entry` requires explicit `tol_abs` and `tol_rel`; no silent exact-match default.
12. Selection uses the three states from section 8: `none` uses `difficulty_label`; `provisional` blends `difficulty_label` and `empirical.difficulty_b` by `n_responses`; `calibrated` uses `empirical.difficulty_b`.
13. Assets are single-owner in v1; asset ids derive from the owner id; sharing is deferred.
14. Content is rendered as untrusted: markdown with raw HTML disabled, assets limited to sanitized images and SVG, no HTML assets (11.4).
15. Pool codes are `sd` / `vlt` / `arn`; the `id` pool segment and the `pool` field are immutable origin and namespace `seq`.
16. `provenance.parent_id` must be a valid UQS id or null; external source attribution goes in `provenance.source`.

## 18. Deferred (not in v1, not precluded)

- Per-node weights in `tests[]`.
- i18n and translation records (linking same problem across languages).
- Adaptive (item-level CAT) delivery metadata.
- Multi-correct partial-credit policy details (scoring config, separate doc).
- Cross-exam leak detection via embedding similarity (separate from `content_hash`).

---

## 19. Next artifacts

1. CA Foundation extension schema + CA taxonomy bundle (nodes, L1-L3 scale, misconception vocabulary).
2. LSAT extension schema + taxonomy reconciliation (skill_tree vs syllabus).
3. The validator (section 11) as shared code, the single contract for the Python pipeline.
4. The build-time `diagram_spec` → SVG Asset renderer.
5. The event-log schema (the next one-way door).

---

## 20. Changelog: rev 2 review resolutions

Every red-team item and its resolution.

Blocking:
1. `irt_b` vs `difficulty_b` — fixed; example now uses `difficulty_b` (4.7, 15).
2. `id` abbreviations undefined and inconsistent — fixed; code registry added (4.1.1); both examples now resolve.
3. `answer_key` location contradiction — fixed; frontmatter is canonical, `## Answer` is a human cross-check (12.1).
4. Validate-before-hash — fixed; build computes hashes before validate; #3 also runs at ingest (11.3).
5. ICAI inside LSAT `ext` — fixed; removed, replaced with preptest provenance (4.8).

Should-fix:
6. No core home for diagrams — fixed; Assets entity added (4.9), with build-time `diagram_spec` → SVG.
7. No hash uniqueness invariant — fixed; invariant #4 (11.1).
8. Hash allowlist plus denylist — fixed; exhaustive allowlist, denylist removed; `item_type`, `exam` now explicit (9).
9. Cross-exam dedup and explanation-in-hash — resolved by decision: exclude `explanation`, include `exam` (within-exam dedup) (9, 17.3).
10. No `vocab_version` — resolved; `taxonomy_version` bundles the vocabulary (4.2, 7, 13).
11. Option count enforced by nobody — fixed; exam extension validator named (4.3, 4.8, #6).
12. Stimulus has no invariants — fixed; section 11.2.

Minor:
13. Empirical dense vs sparse — resolved; sparse allowed; prose and examples aligned (4.7).
14. No UQS-vs-legacy discriminator — fixed; `schema_version: "uqs-1"` (4.1, 13).
15. Numeric exact-equality fragile — fixed; tolerances required, no default (4.4).
16. `multi_select` empty correct set — fixed; non-empty required (4.4, #7).
17. `difficulty_scale` on wrong table — fixed; moved to `taxonomy_meta` (12.2).
18. `group.role`/`position` untyped — fixed; enum and type added (4.3).
19. Selection precedence undefined — fixed; precedence rule added (8).

ALERT carried forward (unresolved, gate v1-final):
- ICAI negative-marking fraction for CA Papers 3 and 4 (10). Blocks `exams.yaml`.
- LSAT `skill_tree` vs `syllabus` reconciliation (7). Blocks LSAT migration.

---

## 21. Changelog: rev 3

Round-3 review. Every item and its resolution.

Blocking:
1. `group.role` vs `Stimulus.kind` mismatch — resolved by **deletion**. `group` is now `{stimulus_id, position}`; the Stimulus `kind` drives rendering; item-to-stimulus nuance goes in `ext` (4.3, #14).
2. 4.9 vs 9 hash disagreement — fixed; 4.9 now states stem/options-only, matching section 9 (4.9).
3. Assets single-ownership — fixed; assets are single-owner, `owner_type`/`owner_id` added, sharing deferred (4.9, 12.2, decision 13).

Should-fix:
4. Stimulus hash uniqueness — added (11.2 #6).
5. Stimulus hash informal — promoted to an exhaustive allowlist (9).
6. `text/html` asset hole — removed; no HTML assets; new Security section mandates raw-HTML-off markdown and SVG sanitization (4.9, 11.4, decision 14).
7. Asset id scope — ids are now globally unique, derived from owner id; packs combine at runtime (4.9).
8. Pool code inconsistency — codes are now `sd`/`vlt`/`arn` (4.1.1, decision 15).
9. Decision 12 vs section 8 — decision 12 now states all three selection states (decision 12).
10. `parent_id` not a valid id — example fixed to `sd_caf_qa_000088`; `parent_id` must be a valid UQS id or null (14, decision 16).

Minor:
11. Section 8 `assets` input wording — reworded to asset references (8).
12. `diagram_spec` validated before render (11.3).
13. Invariant #4 labelled pack-level (11.1 #4, 11.2 #6).
14. `taxonomy_meta` columns enumerated (12.2).
15. Migration required before validation — stated (13).

Scope and security added this round:
- v1 implementation scope fixed to the CA Foundation QA surface; Stimulus, comparative/data_set, LSAT extension, and `multi_select` are defined but deferred and not hardened (1.1).
- Security and content trust model added (11.4).

ALERT still open, both gate v1-final: ICAI negative-marking fraction (10) and LSAT taxonomy reconciliation (7).
