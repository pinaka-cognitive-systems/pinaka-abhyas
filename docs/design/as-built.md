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
| App shell: left rail, nav, mobile nav | app-shell.jsx, app.css | deviated | Built: rail at 1024px+ with lockup, divider, review badge, settings foot; bottom tab bar below 1024px. Deviations: the handout's collapsed icon-rail (64px at <=1199px) is replaced by the tab bar (phone floor ergonomics, ADR 0011); Syllabus rail item withheld until its flow lands. Session surfaces (practice, baseline, firstrun) stay full-bleed. |
| Today / core hub | scr-core.jsx | built | Today card, mock entry card (resume-aware), diagnosis re-entry, inside the shell. Deeper scr-core composition (delta strips, review queue) still ahead. |
| Practice hub (difficulty, length, solve-before-options) | scr-practice.jsx | missing | App goes straight into a session; hub screen not built. Post-beta. |
| Practice drill (question, feedback) | scr-practice.jsx, feedback.jsx | built | Two-column desktop, pinned dock, numbered teaching reveals (reveals.tsx + reveals.css), taxonomy display names. |
| Diagnosis map | scr-diagnosis.jsx | partial | DiagnosisFlow exists (readiness, node bars, misconceptions, real taxonomy and canon names); mockup fidelity pass pending. |
| Mock: exam hall (full-screen) | scr-mock.jsx | deviated | Built: fixed viewport takeover, palette by part with display names, strike-to-eliminate (Shift+1-4), flags, honest wall-clock resume, marking reminder at hall, palette, and submit. Deviation: light theme kept where the drop sketches a dark hall (dark sections are reserved; ADR token rules). |
| Mock: reveal + breakdown | scr-mock.jsx, mockbreakdown.jsx | built | Reveal with honest verdict prose; breakdown with tally, marks waterfall and pass bar, marks by part, misconceptions by share with recoverable-marks accounting, insight line, readiness shift. |
| Mock: review walkthrough | scr-review-mock.jsx | built | Filter tabs with counts, navigator with outcome words and j/k keys, detail pane with tagged options, per-option rationales, the five teaching reveals, honest pacing chips (rushed, slow). One-shot today: reachable only after the mock; persistence is on the roadmap. |
| Settings | Component inventory | built | SettingsFlow (export/import, telemetry, update). Fidelity unreviewed. |
| First-run / welcome | (not in drop) | deviated | Design drop never specced first-run visuals; built in-system with the lockup. |
| Feedback/toast patterns | feedback.jsx | missing | No global toast system; flows use inline status. |
