# Build specification

Date: 2026-06-10; revised 2026-06-12 after the design-parity rebuild (ADR 0018).
Status: authoritative. Supersedes sections 02, 07, 08, 09, and 17 of
`design-team/v2/Engineering Handout.html` for all engineering decisions.
Generated from the ADR record and the engine SPEC; updated by new ADRs, never by
hand. Sections 13 through 16 and the addendum (craft, voice, Signature Screens,
Component and State Inventory, accessibility completion) of the Handout remain
the design contract; their implementation status per surface is tracked in
`docs/design/as-built.md`, and the complete sanctioned-deviation set is
ADR 0018. The design drop itself stays operator-local (gitignored): the design
team owns look and interaction intent, engineering owns all shipped code.

---

## 1. What this is and the honesty doctrine

Pinaka Abhyas is a free, static, client-side PWA that helps CA Foundation aspirants
diagnose what they do not know, practise against a verified question bank, and reach
a calibrated readiness estimate before exam day. It carries no backend, requires no
account, and works fully offline after first load. Its central honesty constraint is
this: the app never claims what it cannot back. Confidence is capped at medium by
the engine, structurally. Readiness is a band with stated coverage, not a predicted
score. Difficulty starts as authored anchors and is recalibrated only from real
telemetry. The wrong-key rate and the full verification funnel are published per
pack. Any number the student sees must be traceable to either the event log or the
verified item bank, never invented.
(`docs/brand/brand-core.md`; `engine-ts/SPEC.md` sections 3 and 6)

---

## 2. The stack and why

| Layer | Decision | Why / ADR |
|---|---|---|
| Delivery | Static client-side PWA, installable, hash-routed | A URL forwards in WhatsApp and Telegram; a Tauri installer cannot. Zero signing budget. ADR 0001. |
| Build | Vite 6, React 18, TypeScript strict | Standard, well-supported, no exotic toolchain. ADR 0001. |
| Storage | sqlite-wasm `opfs-sahpool` VFS | No COOP/COEP headers needed, works on GitHub Pages and Cloudflare Pages, best OPFS performance. ADR 0008. |
| Hosting | Cloudflare Pages (primary), GitHub Pages (fallback) | Free, HTTPS, no header constraints for sahpool. ADR 0008. |
| Service worker | Hand-rolled, no Workbox | Atomic pack swap, mock-session guard, update flow with errata notes; these semantics are not workbox defaults. ADR 0001, ADR 0009. |
| Engine | Standalone TypeScript package (`engine-ts/`) | The app runs TypeScript regardless; the former Python "reference" was an unverified prototype. One language, one maintenance surface. ADR 0010. |
| Runtime AI | None | All AI runs at build time, frozen into the content pack. Students need no key and no network after first load. ADR 0004. |

---

## 3. The engine contract

Source of truth: `engine-ts/SPEC.md`. The rules below are binding on all UI work.

**The estimator is a tracker, not a static-ability estimator.** Per skill, the engine
holds a rating `r` and a deviation `rd` (Glicko-lite, ADR 0012). Deviation shrinks
with evidence and grows with inactivity. Order is signal: improvement is tracked to
the current state, not averaged over a lifetime. (`SPEC.md` section 3)

**Binary outcomes only.** An answer is correct or wrong. The scheduler (FSRS-4.5
memory model, ADR 0020) maps wrong to again and correct to good internally; the
hard/easy grades are structurally unreachable. The UI must never display grade
buttons or box badges — the review badge shows the live interval ("6d"), which is
what is true. Every answered question advances its schedule, mocks included, and
replay spreads due dates at no more than 12 a day, most fragile first.
(`SPEC.md` section 4)

**Two confidence tiers only.** The engine emits `insufficient_data`, `low`, or
`medium`. It never emits `high` or `good`. The UI must not invent a third tier or
rephrase `medium` as `good`. (`SPEC.md` section 6)

**Readiness is a band.** The point estimate travels with a +/- sigma band floored at
5 marks, extended in the drift direction, and clamped to the achievable score range.
Mock anchoring blends the model EV with recent confirmed scores. The UI must never
display a single predicted score. (`SPEC.md` section 6)

**The UI may never display** a predicted score without a band, a confidence label
above medium, grade buttons on review cards, or any number not computable from the
event log and current item bank. (`SPEC.md` section 1, sections 3 and 6)

**Golden vectors are the regression pin.** `engine-ts/vectors/` holds committed
fixed-seed outputs. CI replays them on every change. A diff to any vector is a
breaking engine change and requires explicit sign-off before merge.
(`SPEC.md` section 8; ADR 0010)

---

## 4. The data contract

Source of truth: ADR 0009.

**Event sourcing.** The event log is the single source of truth for all student
state. Mastery, schedule, and readiness are rebuilt by replaying events against the
current pack. No derived state is ever the only copy of anything. (ADR 0009)

**Event schema `uqs-event-2`.** Fields include `event_id`, `occurredAtMs` (epoch
milliseconds; naive ISO-8601 strings treat as UTC by contract), `item_id`,
`item_content_hash`, `taxonomy_version`, `tests`, `difficulty_label`, `item_type`,
`mode`, `correct`, `selected_misconception`, `response` (raw, required),
`time_ms`, `resurfaced`, and the optional `device_context` field (form factor,
viewport class, no identifiers). The raw response is required; it enables key-fix
re-scoring without data loss. (`SPEC.md` section 2; ADR 0009)

**Progress export envelope.** One file: `format_version`, `exported_at`,
`app_version`, `pack_id`, `pack_version`, `taxonomy_version`, `install_id`, and the
full event list. Import merges by `event_id` (idempotent) and replays through the
same re-score and migration rules as a live pack update. The envelope is versioned
from day one so no backup is ever stranded. (ADR 0009)

**Pack updates and the mock guard.** Pack versions are semver. The service worker
downloads a new compatible pack to a staging area and swaps atomically. No update
ever happens mid-mock: the mock flow holds a module-level `MockGuard`
(`app/src/flows/mock/guard.ts`); the updater defers the swap until the guard is
released. (ADR 0009; `app/src/flows/mock/guard.ts`)

**Tombstones.** A retired or superseded item stays in the pack as a tombstone: never
selectable, renderable for history review, and handled by the scheduler's pack-
transition rules. The `superseded_by` field transfers the schedule to the successor.
(ADR 0009; `SPEC.md` section 4)

---

## 5. Flow architecture

The app is organized as logic-in-pure-functions with thin React views. Each flow
exports its pure logic separately from its React component so tests import the logic
without a DOM. Flows are loaded lazily by the router; their code stays off the entry
chunk until needed.

**Router** (`app/src/flows/router.tsx`): a minimal hand-rolled hash router. Hash
routes (`#/practice`) survive static hosting and offline reloads with no server
rewrite. Route vocabulary follows the design RAIL_FOR contract;
`app/src/components/navRoutes.ts` is the single registration point for which
routes keep the persistent shell and which render full-window. The default
route resolves to `firstrun` (new device) or `today` by reading the
`firstrun_completed` meta flag once at boot; the cold start is Today's empty
state recommending the first mock (ADR 0018 ruling 3 removed the baseline
flow). A `null` default target while the async read is in flight shows a
neutral boot screen, never a flash of the wrong flow. Route changes run
through `document.startViewTransition` (180ms crossfade, reduced-motion
bypass); a global keyboard layer provides 1-5/comma navigation, the `?`
shortcut sheet, and Esc-exits-a-flow.

| Route | Flow | One-liner |
|---|---|---|
| `#/` (default) | firstrun / today | Resolved from the meta flag at boot |
| `#/firstrun` | firstrun (`app/src/flows/firstrun/`) | "Taught by testing." welcome, paper chip, optional exam date |
| `#/today` (alias `#/home`) | home (`app/src/flows/home/`) | The one recommended action, readiness band, recent mocks, recovery banner |
| `#/practice` | practice hub (`app/src/flows/practice/PracticeHub.tsx`) | Review half + drill setup (topic, difficulty, length, method) |
| `#/drill` | practice (`app/src/flows/practice/PracticeFlow.tsx`) | Full-window question loop with the split feedback and drill close |
| `#/review` | review (`app/src/flows/review/`) | The spaced review queue: why each item is back, coming up |
| `#/diagnosis` | diagnosis (`app/src/flows/diagnosis/`) | Topic x misconception heat matrix, recurring-cost sidebar |
| `#/misconception/{id}` | diagnosis (detail view) | The drill-through pattern detail with the instance ledger |
| `#/syllabus` | syllabus (`app/src/flows/syllabus/`) | 18-chapter coverage map, coverage only |
| `#/mock` | mock hub (`app/src/flows/mock/`) | Three mock types, past mocks; `mock/start`, `mock/hall`, `mock/reveal`, `mock/breakdown[/i]`, `mock/review[/i]` are the full-window phases |
| `#/testday` | testday (`app/src/flows/testday/`) | The calm exam-day receipts screen |
| `#/settings` | settings (`app/src/flows/settings/`) | Privacy and data, accessibility, exam, about (export/import/update kept) |

The shared view-model layer (`app/src/engine/insights.ts` +
`app/src/state/appData.ts`) derives the design's profile contract — the six
data states, the recommendation ladder, misconception costs and the matrix,
review-queue reasons, syllabus coverage, time triage — from the event log;
screens read the snapshot and hold no math.

All layouts are built at 360px first, then widened. The practice loop, first-run,
and baseline flows are phone-native by design. Mocks and diagnosis are desktop-best
but fully functional on the phone; no feature is gated by device. (ADR 0011)

---

## 6. Budgets and CI gates

Every push runs the following gates in CI (`.github/workflows/ci.yml`). Green CI
is the merge bar. Operator discipline is not a substitute.

| Gate | What fails | Source |
|---|---|---|
| Schema Tier 1 | `python3 schema/validate.py` exits nonzero | CLAUDE.md |
| Schema Tier 2 | `python3 schema/validator/run_checks.py` exits nonzero | CLAUDE.md |
| Key execution | Any item solution mismatches its key inside the sandbox | W3-1, ci.yml |
| Engine typecheck | `tsc --noEmit` in `engine-ts/` | ci.yml |
| Engine tests | Vitest in `engine-ts/`, including golden-vector replay | ADR 0010, ci.yml |
| App typecheck | `npm run typecheck` in `app/` | ci.yml |
| App lint | `npm run lint` in `app/` | ci.yml |
| App tests | `npm test` in `app/` | ci.yml |
| Byte budget | `npm run check-size`: hard ceiling 2.0 MB gzip-transferred, working target 1.5 MB | ADR 0008, app/scripts/check-size.mjs |
| Offline check | Every precached shell asset resolves | W5-4, app/scripts/check-offline.mjs |

**Voice gate (W7-6, planned).** A deterministic CI lint sourced from
`docs/brand/brand-core.md` bans em-dashes, exclamation marks, contractions, and
the listed forbidden words from app strings, item content, README, and docs. A pre-
commit hook runs the same check locally. An advisory LLM voice job is permitted
under ADR 0004 but never blocks merge.

**Accessibility gate (W5-6, live in CI).** app/scripts/check-a11y.mjs computes WCAG
contrast for every token pairing and checks the type floor, 44px touch targets,
focus-visible coverage, and reduced-motion compliance on every push (the app job in
.github/workflows/ci.yml). aria-live regions cover feedback, the mock timer, and the
import report. Verification on a real low-end Android device remains a beta task.

---

## 7. Device target and layout rules

Decision: ADR 0011.

The floor is the phone. Every screen must be fully usable at 360px width. No feature
is gated by device; a phone-only student receives the complete product including
timed mocks and the readiness estimate.

The best is the desktop. Mocks and deep diagnosis are designed to shine on a laptop
while remaining fully functional on the phone.

Primary canvases by surface:
- Practice loop, first-run, install, baseline: 360px phone-native.
- Mock hall, diagnosis: desktop-best, phone-capable.

Layout discipline: design and build at 360px first. Widening to desktop is cheap;
shrinking a desktop layout is rework. (ADR 0011)

**Mock-on-phone policy.** Allow both devices, recommend the bigger screen, never
block. A phone student taking a mock receives a pre-mock note in Fellow voice, a
distraction shield (do-not-disturb and battery prompts), and interruption recovery
with a stated, visible policy. The device form factor is recorded per attempt in
`device_context` so calibration can separate hard questions from small screens.
(ADR 0011; ADR 0009; `SPEC.md` section 2)

**Mathematical notation.** Unicode-first; powers as superscript characters, fractions
as inline slash form, Indian digit grouping (1,00,000). KaTeX is the pre-approved
escape hatch if the Gate A pilot surfaces items that genuinely cannot be expressed
legibly in unicode, at a maximum budget of 150 KB transferred. No other rendering
technology is in scope for v1. (ADR 0015)

---

## 8. What changed versus the design handout

The Engineering Handout (`design-team/v2/Engineering Handout.html`) is superseded
in the following sections:

| Handout section | What was wrong | Correct decision |
|---|---|---|
| 02 Architecture: "Target shell is Tauri" | Tauri was rejected for v1: unsigned installers, no WhatsApp forwarding | Static PWA. ADR 0001. |
| 02 Stack: Python engine as reference | The Python engine was an unverified prototype with a divergent mastery update | One TypeScript engine. ADR 0010. |
| 07 Mastery: recency-weighted accuracy with a threshold gate | No uncertainty, no principled forgetting, not what the shipped engine computes | Glicko-lite rating plus deviation. ADR 0012; `SPEC.md` section 3. |
| 08 Scheduler: SM-2 four-grade (again/hard/good/easy) | Binary outcomes only; the shipped scheduler has no grade tiers | Binary correct/wrong. `SPEC.md` section 4. |
| 09 Readiness: three confidence tiers including "good" | The engine caps at medium by construction | Two tiers: low and medium. `SPEC.md` section 6. |
| 17 Build phasing: "M1 Tauri shell, SQLite" | Tauri and native SQLite are not the stack | PWA scaffold, sqlite-wasm, opfs-sahpool. ADR 0001, ADR 0008. |

**Design parity (2026-06-12).** The remaining handout sections (03 IA, 11 hall
behaviour, 13-16, the addendum) are implemented per the parity rebuild; the
per-surface record is `docs/design/as-built.md` and the sanctioned deviations
are ADR 0018 (WCAG-corrected palette including brand `#5558E8`, bottom tab bar
under 900px, no baseline flow, restyled pre-mock interstitial, no imitation
window chrome, no reminder setting, interval-badge review copy, hard/pace
mocks logged as drill-mode events). The Component and State Inventory remains
the per-flow acceptance checklist. The Content Authoring Guide is ported to
`docs/contributing/content-authoring.md` (W6-3).

**Mock mistakes and the review queue (resolved, ADR 0020; supersedes the
ADR 0019 pool).** Handout section 08 says a question enters the review pool
when answered wrong in any source. The engine now does exactly that: every
graded event advances its item's schedule, mock mode included — a missed mock
question resurfaces as a lapse, a recalled one earns its review. The due-flood
concern that once justified the interim pool is handled by deterministic
workload balancing (12 dues a day, most fragile first), so the "From your
mocks" pool surface is removed. Two further engine upgrades ride with it:
read-time hierarchical pooling (ADR 0021) gives family-level readiness and
selection real estimates from leaf-tagged practice, and the mock assembler
(ADR 0022) holds a fixed difficulty mix per form and avoids re-serving items
from the last two mocks, declaring any forced reuse on the pre-mock screen.
