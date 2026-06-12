# 0018 — Design parity: the v2 prototype is the look-and-interaction contract

Date: 2026-06-12
Status: decided

## Context

The 2026-06-11 design-fidelity audit
(docs/audit/2026-06-11-design-fidelity-audit.md, 517 verified findings)
established that the shipped app had diverged from the design team's v2
prototype on nearly every screen: nine surfaces missing or replaced, the
keyboard and motion layers absent, the six-data-state framework unwired, and
an incomplete deviation ledger. The owner reviewed the audit's decision queue
and ruled on every open item. This record fixes those rulings so the parity
rebuild has one authority.

## Decision

The design-team v2 prototype specifies look and interaction (its own closing
contract). The app transcribes `scr-*.jsx` and the v2 CSS; the shared port
lives in `app/src/theme/design.css` under the design's own class names, and
`app/src/engine/insights.ts` + `app/src/state/appData.ts` derive the
profile-shaped view-model the prototype screens read. Deviations below are
the complete sanctioned set; anything else that differs from the prototype
is a defect.

Rulings (owner, 2026-06-12):

1. **Tokens**: the WCAG-corrected palette ships — brand primary `#5558E8`
   and the ten related corrections recorded in `tokens.css`. The handout's
   `#6366F1` pin is superseded for rendered UI; the design's hardcoded matrix
   and palette rgba literals stay as drawn (they layer on white).
2. **Responsive tiers**: bottom tab bar below 900px (the design drop does not
   cover phones; mobile responsiveness is an app requirement), the design's
   64px icon rail at 900-1199px, the 224px full rail at 1200px+.
3. **No baseline flow**: the cold start is the design's — first-run, then
   Today's empty state recommends the first mock. The student explores
   freely; every locked surface declares what unlocks it.
4. **First-run is the design's "Taught by testing."** screen (promise,
   01/02/03 strip, paper chip, optional exam date).
5. **The pre-mock interstitial stays**, restyled to the design system and
   voice. It carries real honesty content (wall-clock policy, shortfall
   declaration) the design had nowhere else.
6. **Bank scale**: at least 800 questions ship; the mock assembler builds
   full blueprint papers and keeps the shortfall mechanism only as a
   declared degradation.
7. **No imitation window chrome**: the browser provides the window; per-route
   titles go to `document.title`. (Extends ADR 0001/0011.)
8. **No reminder setting**: removed; may return if students ask.
9. **SM-2 surface copy**: the review queue uses the design's reason
   vocabulary ("Missed 6 days ago · interval 6d"); the box badge shows the
   live interval ("6d") instead of a Leitner box number, because the engine
   (ADR 0012 scheduler) tracks intervals, not boxes. Personalisation stays
   local.
10. **Kept app enhancements** (restyled, never removed): per-element a11y
    work, import/merge of progress files, storage status, the update flow,
    the install affordance, expired-session detection (behind the submit
    confirm — never auto-scored), loading/error surfaces.
11. **Hard and pace mocks** exist per the design; only standard mocks feed
    the readiness estimate. In the event log, hard/pace answers record mode
    `drill` with `device_context.mock_type` set, which keeps them out of
    mock anchoring without engine changes (Handout section 10).

## Consequences

- `app/src/theme/design.css` is the single shared style layer; flow CSS may
  hold only flow-unique rules. Shared components live in
  `app/src/components/ui.tsx`.
- The six data states (empty, early, returning, progressing, plateau, error)
  are classified in `insights.ts` and drive Today's recommendation; the
  ported fixtures back the unit tests.
- `docs/design/as-built.md` is rewritten against this ADR; its earlier
  misreads (first-run "never specced", the "dark hall sketch", "handout
  silent below 1024px") are corrected by the audit record.
- A screen is done only when its states are reachable from real data and a
  side-by-side check against the v2 canvas (1440/1000/375) has been made.
