# As-built tracker: design-team v2 vs the shipped app

The fidelity contract. One row per design-team v2 surface or component
(design-team/ is operator-local; the HTML and JSX mockups there are the spec).
Status is one of: built, partial, missing, deviated. A deviation is deliberate,
keeps the row, and names its reason; everything else is debt this tracker
exists to burn down. Update the row in the same change that moves the surface.

Rewritten 2026-06-12 after the design-parity rebuild (ADR 0018; audit:
docs/audit/2026-06-11-design-fidelity-audit.md). The complete sanctioned
deviation set is ADR 0018's eleven rulings; this table records per-surface
status against the prototype. Corrections to the earlier tracker, per the
audit: the design drop DOES spec first-run (scr-core.jsx:8-41); the v2 drop
has no dark hall (it is light by its own CSS); the handout specifies the 64px
icon rail from 900px (it is not silent below 1024px).

Shared layers (the SSOT the rows build on):

- `app/src/theme/design.css` — verbatim port of the drop's app.css,
  screens.css, and the sa-* layer, under the design's class names. Flow CSS
  holds flow-unique rules only.
- `app/src/components/ui.tsx` — Icon set, Chip, Caveat, ScreenHead,
  ReadinessBand, Sheet (focus-trapped), Toast, ShortcutSheet.
- `app/src/engine/insights.ts` + `app/src/state/appData.ts` — the
  profile-shaped view-model (six data states, recommendation ladder, matrix,
  review queue reasons, syllabus coverage, time triage, calibration).

| Surface / component | Source | Status | Notes |
| --- | --- | --- | --- |
| Design tokens (color, type, spacing, radius, motion) | colors_and_type.css | deviated | WCAG palette ratified by ADR 0018 ruling 1 (brand #5558E8 et al, documented in tokens.css). Type ramp + pn-* utilities ported exactly (base.css). |
| IBM Plex Sans/Mono | fonts/ | built | Subset woff2 per ADR 0008/0015; allowlist co-designed with the content validator. |
| Brand lockup + chevron mark | app-shell.jsx | built | ui.tsx Icon chevron-mark + BrandMark; favicon/PWA icons via scripts. |
| App shell: rail, tiers, tab bar | app-shell.jsx, app.css, screens.css | deviated | Design rail verbatim (224px full / 64px icons at 900-1199) incl. Syllabus item and the wired reviews-due pill. Below 900px a bottom tab bar (ADR 0018 ruling 2 — the drop does not cover phones). Window chrome dropped (ruling 7); per-route document.title instead. |
| Keyboard layer + shortcut sheet | App.html:66-138 | built | 1-5/comma nav, ? sheet, Esc exits a flow, dialog focus traps, kbd-hint pill (router.tsx + ui.tsx). |
| Route transitions + score morph | App.html:16-17, 92-105 | built | startViewTransition crossfade 180ms with reduced-motion bypass and throttle guard; view-transition-name: score morphs reveal -> breakdown. |
| Six data states | data.jsx PROFILES, Handout s04 | built | classifyDataState (empty/early/returning/progressing/plateau) + interrupted; drives the Today recommendation ladder. Unit-tested (tests/engine/insights.test.ts). |
| Today | scr-core.jsx:43-173 | built | Full anatomy: ScreenHead, recommended card + See the evidence, ReadinessBand (pass + target markers), recent mocks, plateau belief, recovery banner + Discard with 6s undo toast. |
| Practice hub | scr-practice.jsx:24-123 | built | Review half + drill setup (topic picker with honest mastery %, difficulty/length/method). Start drill moved to its own row — the prototype overlaps it with the options toggle (canvas defect, fixed here). |
| Drill (question + feedback) | scr-practice.jsx:125-232, feedback.jsx | built | fb-context bar, letters A-D + kbd hints, locked fb-split feedback with named misconception, always-visible working, cost link. Keyboard 1-4/Enter/Space. Topic/level filter serves from a narrowed bank (engine math untouched). |
| Drill close | scr-practice.jsx:238-298 | built | Retrospective confidence -> score + gap-based calibration (verbatim copy) + insight card. |
| Review queue | scr-core.jsx:179-224 | deviated | Full design anatomy; the box badge shows the live interval ("6d") instead of a Leitner box number (ADR 0018 ruling 9). Mock mistakes land here directly — every answered question schedules (FSRS, ADR 0020), spread at 12 dues a day; the interim ADR 0019 pool surface is removed. |
| Diagnosis matrix | scr-diagnosis.jsx:22-113 | built | Topic x misconception heat matrix with the design's exact mxCell math, legend, declared hidden-topics caveat, recurring sidebar with drill-through. Empty/early/ready states. |
| Misconception detail | scr-diagnosis.jsx:115-155 | partial | Hero, instance ledger, drill CTA built. Only the "What happens" card renders: the canon (misconceptions.json) carries description but no tell/fix text — nothing is fabricated. Closes when the canon gains those fields. |
| Syllabus | scr-diagnosis.jsx:160-203 | built | 18-chapter coverage map, coverage only, FOCUS chip, legend with counts. Rail item restored. |
| Mocks hub | scr-mock.jsx:11-76 | built | Three type cards (copy verbatim), readiness-feed caveat for hard/pace, past-mocks rows with pass bar, resume banner; never auto-resumes, never auto-submits (expired sessions go through the submit confirm). |
| Pre-mock interstitial | (not in drop) | deviated | Kept and restyled to the design system (ADR 0018 ruling 5): wall-clock policy, shortfall declaration, device note, and the ADR 0022 reuse disclosure ("N questions repeat from your last two mocks") when the bank forces it. |
| Mock types (standard/hard/pace) | data.jsx MOCK_TYPES, Handout s10 | built | Typed assembly (hard: L3 + misconception-targeted; pace: 50Q/45min). Hard/pace events record mode "drill" with device_context.mock_type so only standard mocks anchor readiness (ruling 11). |
| Exam hall | scr-mock.jsx:106-302, Handout s11 | built | Two-pane exhibit branch + q-table, 5 palette states incl. visited, live counts + sectioned 5-col palette with roving arrow focus, HH:MM:SS timer with 5-minute state + assertive announcement, Save & exit and submit dialogs, Mark/M, Clear/C, Shift+1-4 strike, letters A-D. |
| Score reveal | scr-mock.jsx:304-328 | built | One Breath (staggered .breath classes), 96px metric-display number carrying the score morph, verdict prose, delta vs previous standard mock. |
| Mock breakdown | scr-mock.jsx:344-407 | built | Floating waterfall segments with dotted connectors and the dashed Pass 40 line, misconception table with drill-through, one peak-end insight, closing caveat. |
| Mock review walkthrough | scr-review-mock.jsx | built | Six filter pills, navigator with outcome dots, detail split with the 360px diagnosis panel: six-verdict time triage (cutoffs declared provisional), named misconception, working steps, "Queued in Review · returns in Nd". |
| Settings | scr-core.jsx:230-331 | built | Three design groups (Privacy and data, Accessibility wired to body a11y classes + persisted, About) plus kept app rows restyled (Import, Storage, Install, Update; Exam group for date + readiness target). Reminder removed (ruling 8). Delete-all behind the design confirm sheet. |
| First-run | scr-core.jsx:8-41 | built | "Taught by testing." verbatim: promise, 01/02/03 strip, paper chips, optional exam date (stored ISO), local-first footer. Baseline flow removed (ruling 3); Start lands on Today. |
| Test day | scr-core.jsx:336-354 | built | Calm receipts from live data; no CTA. Route #/testday. |
| Feedback/toast patterns | scr-core.jsx toast | built | Toast + 6s undo (ui.tsx); used by the discard flow. |
| Second-tab + degraded-storage screens | (not in drop) | deviated | Kept app honesty surfaces (storage reality the drop never faced). |
| Loading/error surfaces | (not in drop) | deviated | Kept, restyled to screen chrome with honest copy (ruling 10). |

Verification record (2026-06-12): typecheck, eslint, and the full vitest
suite green (698 tests after pruning suites that asserted removed surfaces);
production build green; live side-by-side against the v2 canvas at
1440/1000/375 across today, practice, drill + feedback, diagnosis, syllabus,
mocks hub, pre-mock, hall, settings, first-run, and the interrupted-mock
recovery loop (banner, resume card, discard + undo). A scripted end-to-end
run then exercised the full loop with real data: a 100-question mock driven
through the hall (keyboard contract incl. Shift+1-4 strike, M mark, C clear),
the submit dialog, reveal, floating-waterfall breakdown, and the review
walkthrough (six-verdict triage, named misconception, working steps); a
five-question drill through DrillClose (confidence, gap-based calibration,
insight); then the early data state, live diagnosis matrix with the declared
threshold caveat, misconception detail with the real instance ledger, and the
review queue with reason copy. The run surfaced and fixed: a review-screen
viewport frame defect, deep links to mock/breakdown and mock/review bouncing
to the hub during boot, an unconditional "0 due today" headline, a snapshot
invalidation miss on mock persist, and overflowing matrix row heads. Copy
pass (string-for-string vs the prototype + voice rules): clean except three
fixes applied (syllabus empty lede, expired-dialog ghost label, reveal
not-cleared sentence now gated on penalty dominance). The ADR 0019 pool was
then verified live end to end: 67 mock mistakes pooled after the test mock,
one drilled through the single-item hand-off (Q 1 / 1), pool 67 -> 66 and the
item entered the spaced schedule.

SOTA engine batch (2026-06-12, ADRs 0020/0021/0022): FSRS-4.5 scheduler with
mock ingestion and 12-a-day workload balancing, read-time hierarchical
pooling for family-level reads, and assembler form comparability (fixed
20/60/20 difficulty mix, two-mock exposure exclusion with declared reuse).
The ADR 0019 pool surface was removed (structurally empty once mocks ingest;
replay schedules historical mock events too). Verified: engine suite 147
green incl. refutation attacks, golden vectors regenerated (SPEC 0.3, 15
scenarios incl. the new leaf_tagged_pooling production-shape pin), app suite
708 green, build green, and live in the preview: the prior 100-question
mock's items rebuilt into 84 schedules spread exactly 12 a day across 7 days,
the pre-mock screen declaring "95 questions repeat from your last two mocks"
against the small demo bank, console clean. Found and fixed along the way:
two literal NUL bytes embedded in insights.ts map keys (broke grep/diff
tooling on the file; replaced with backslash-u0000 escapes), and a stale vite dep-optimizer
cache masking engine changes in the dev server (cleared; tests/build were
never affected).
