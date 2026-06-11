# As-built tracker: design-team v2 vs the shipped app

The fidelity contract. One row per design-team v2 surface or component
(design-team/ is operator-local; the HTML and JSX mockups there are the spec).
Status is one of: built, partial, missing, deviated. A deviation is deliberate,
keeps the row, and names its reason; everything else is debt this tracker
exists to burn down. Update the row in the same change that moves the surface.

Authoritative deviations so far are all WCAG corrections; the visual system is
otherwise followed as drawn.

| Surface / component | Source | Status | Notes |
| --- | --- | --- | --- |
| Design tokens (color, type, spacing, radius, motion) | colors_and_type.css | deviated | WCAG corrections: brand primary #5558E8 (was #6366F1), text-subtle #6E6E76, success #047857, warning text dark-on-amber, all four semantic border tokens darkened to 3:1 non-text contrast. Documented inline in app/src/theme/tokens.css. |
| IBM Plex Sans/Mono | fonts/ | built | Subset woff2 via app/scripts/make-fonts.py, OFL shipped, preloaded, precached. |
| Brand lockup + chevron mark | app-shell.jsx | built | BrandMark.tsx; favicon + PWA icons via app/scripts/make-icons.py. |
| App shell: left rail, nav, mobile nav | app-shell.jsx, app.css | built | Three tiers per the handout: full rail at 1200px+, 64px icon rail with tooltips 1024-1199, tab bar below 1024 (where the handout is silent). Syllabus rail item withheld until its flow lands. Session surfaces stay full-bleed. |
| Today / core hub | scr-core.jsx | built | Today card, mock entry card (resume-aware), diagnosis re-entry, inside the shell. Deeper scr-core composition (delta strips, review queue) still ahead. |
| Practice hub (difficulty, length, solve-before-options) | scr-practice.jsx | missing | App goes straight into a session; hub screen not built. Post-beta. |
| Practice drill (question, feedback) | scr-practice.jsx, feedback.jsx | built | Two-column desktop, pinned dock, numbered teaching reveals (reveals.tsx + reveals.css), taxonomy display names. |
| Diagnosis map | scr-diagnosis.jsx | partial | DiagnosisFlow exists (readiness, node bars, misconceptions, real taxonomy and canon names); mockup fidelity pass pending. |
| Mock: exam hall (full-screen) | scr-mock.jsx | deviated | Built: fixed viewport takeover, palette by part with display names, strike-to-eliminate (Shift+1-4), flags, honest wall-clock resume, marking reminder at hall, palette, and submit. Deviation DECIDED 2026-06-11: the hall stays light permanently (owner call); the drop's dark hall sketch is overruled, one theme everywhere. |
| Mock: reveal + breakdown | scr-mock.jsx, mockbreakdown.jsx | built | Reveal with honest verdict prose; breakdown with tally, marks waterfall and pass bar, marks by part, misconceptions by share with recoverable-marks accounting, insight line, readiness shift. |
| Mock: review walkthrough | scr-review-mock.jsx | built | Filter tabs with counts, navigator with outcome words and j/k keys, detail pane with tagged options, per-option rationales, the five teaching reveals, honest pacing chips (rushed, slow). Results persist (last three); past mocks reopen breakdown and review from the Mocks landing. |
| Settings | Component inventory | built | SettingsFlow (export/import, telemetry, update). Fidelity unreviewed. |
| First-run / welcome | (not in drop) | deviated | Design drop never specced first-run. Built value-first: one welcome screen into question 1; the attempt and install asks moved to the baseline close, after the first map (commitments follow value). |
| Feedback/toast patterns | feedback.jsx | missing | No global toast system; flows use inline status. |
