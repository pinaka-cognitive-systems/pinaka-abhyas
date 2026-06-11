# ERRATA: CA Foundation QA

This file records every known defect in shipped items, its resolution, the reporter
credit, and the pack version that fixed it. Entries are never deleted. Items are
identified by their permanent ID, which is never reused. A corrected item receives a
new content hash and ships in a numbered pack release.

---

## Entries

### arn_caf_qa_000009

- **Status:** Quarantined 2026-06-10. Removed from active practice.
- **Defect:** Logically contradictory premises. The stem states "Her mother's only
  sister" and "my father's only sister" in a way that requires Rajan's father to have
  two sisters, which contradicts the word "only". The keyed answer is reachable only
  through the broken premise.
- **Found by:** Project audit, 2026-06-10.
- **Resolution:** Replacement item pending. The original item file is retained in the
  repository for the historical record but will not be served to students.
- **Fixed in pack version:** Pending.

### arn_caf_qa_000013, arn_caf_qa_000015, arn_caf_qa_000023, arn_caf_qa_000185, arn_caf_qa_000188

- **Status:** Corrected 2026-06-11.
- **Defect:** Copy defect, not a logical one. Eight ASCII double hyphens (`--`) used
  as dashes in stems and explanations. The voice rule bans dashes in student-facing
  prose; em and en dashes were already rejected by the ADR 0015 notation allowlist,
  but the ASCII stand-in slipped through.
- **Found by:** UX audit, 2026-06-11.
- **Resolution:** Sentences rewritten without dashes (name lists moved behind a
  colon; asides joined with commas). Answer keys, options, and solution constraints
  unchanged; the solution harness re-verified all five items. A new Tier 2 check
  (`DASH_VIOLATION`) now rejects `--` in stem, options, explanation, and rationale
  text so the defect class cannot recur.
- **Fixed in pack version:** Pending next release.
