# ADR 0016: Stimulus groups and multi-select, designed now, enabled later

Date: 2026-06-10
Status: Accepted (design reservation; not enabled in any v1 Profile).

## Context

Pack 2 (the LSAT vault) needs multi-question stimuli (one passage, several questions)
and other exams need multi-select items. The audit (SCH-06) found these existed only in
prose, meaning the "Core rarely changes" promise would break exactly when the second
pack arrives. Deciding the shape now is cheap; retrofitting identity and event
semantics after students have history is not.

## Decision

The Core reserves, without enabling:

- `stimulus_group`: optional item field { group_id, stimulus (markdown, same notation
  policy as stems), question_index (1-based), question_count }. Items in a group share
  the group_id; each remains an independently identified, independently hashed item.
  The stimulus text participates in each member's content hash (it is part of the
  problem), prefixed canonically before the stem.
- `multi_select` item_type: options as today; answer_key.correct_set (array of option
  keys, uniqueItems, minItems 1); per-option marking config lives in the Profile's
  marking scheme when a profile enables it. The event response shape gains
  selected_options (array) under the same conditional machinery as uqs-event-2.
- Profiles enable these via an explicit capability flag; the ca-foundation-qa Profile
  does not set it, and both validators reject these constructs in v1 packs.

## Consequences

- Selector and scheduler semantics for grouped items (serve the group atomically,
  schedule at group level) are specified when the first consuming Profile lands, not
  before; the data shape no longer blocks them.
- The event schema's next version already knows what is coming, so no event a v1
  student generates will ever be ambiguous against future packs.
