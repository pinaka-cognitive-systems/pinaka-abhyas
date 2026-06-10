/**
 * Replay (SPEC section 7; ADR 0009).
 *
 * Folds the ordered event list through mastery (imported frozen) and the
 * scheduler to rebuild EngineState deterministically. The event log is the
 * single source of truth (ADR 0009): no derived state is authoritative.
 *
 * ADR 0009 rules applied here:
 *   - Ordering: by (occurredAtMs asc, event_id asc), once, at the boundary.
 *   - Re-score: when a re-score table ships and an event's recorded
 *     item_content_hash differs from the bank's current key, the event's
 *     correct / selected_misconception are recomputed from the raw response so
 *     mastery is never built on a stale key.
 *   - Taxonomy migration: an event's node ids are mapped through the migration
 *     map (old id -> new id) when present; unmapped ids pass through unchanged
 *     (the nearest-surviving-ancestor resolution is a pack-build concern; the
 *     hook accepts a fully resolved map).
 *   - Pack transition: after folding, schedules are reconciled against the bank
 *     so tombstoned items drop and superseded items transfer (same rule live
 *     and on import).
 */

import { applyIdleDrift, FRESH_SKILL, type SkillState, updateSkill } from "./mastery.js";
import { applyEventToSchedules, reconcileSchedules } from "./scheduler.js";
import { orderEvents } from "./time.js";
import type {
  Bank,
  EngineState,
  Event,
  ItemSchedule,
  MisconceptionHit,
} from "./types.js";

/** A re-score table entry: given the raw response and the current key, decide
 * the corrected verdict. Ships with a pack when an item is re-keyed (ADR 0009).
 * Keyed by item id. The function is pure and deterministic. */
export interface RescoreRule {
  /** The content hash this rule corrects FROM (the old key). */
  readonly fromContentHash: string;
  /** Recompute the verdict from the raw response against the corrected key. */
  readonly rescore: (response: unknown) => {
    correct: boolean;
    selected_misconception: string | null;
  };
}

export interface ReplayOptions {
  /** item id -> re-score rule (ADR 0009 key fix). */
  readonly rescoreTable?: ReadonlyMap<string, RescoreRule>;
  /** old node id -> new node id (ADR 0009 taxonomy migration). */
  readonly taxonomyMigration?: ReadonlyMap<string, string>;
}

/** Apply the re-score table to a single event, returning a possibly-corrected
 * event. The event's recorded item_content_hash is compared to the rule's
 * fromContentHash; only a match triggers a re-score. */
function maybeRescore(
  event: Event,
  options: ReplayOptions | undefined,
): Event {
  const rule = options?.rescoreTable?.get(event.item_id);
  if (rule === undefined) return event;
  if (rule.fromContentHash !== event.item_content_hash) return event;
  const verdict = rule.rescore(event.response);
  return {
    ...event,
    correct: verdict.correct,
    selected_misconception: verdict.selected_misconception,
  };
}

/** Apply the taxonomy migration map to an event's node ids. */
function migrateNodes(
  event: Event,
  options: ReplayOptions | undefined,
): Event {
  const map = options?.taxonomyMigration;
  if (map === undefined || map.size === 0) return event;
  let changed = false;
  const tests = event.tests.map((n) => {
    const to = map.get(n);
    if (to !== undefined && to !== n) {
      changed = true;
      return to;
    }
    return n;
  });
  if (!changed) return event;
  return { ...event, tests };
}

/**
 * Replay the full event history into EngineState. Pure and deterministic: the
 * same events, bank, clock, and options yield bit-identical state.
 */
export function replay(
  events: readonly Event[],
  bank: Bank,
  nowMs: number,
  examMs?: number,
  options?: ReplayOptions,
): EngineState {
  void nowMs; // state is folded purely from events; nowMs is for downstream reads
  const ordered = orderEvents(events);

  const skills = new Map<string, SkillState>();
  let schedules = new Map<string, ItemSchedule>();
  const misconceptions = new Map<string, MisconceptionHit[]>();
  const lastSeenMs = new Map<string, number>();
  let eventCount = 0;

  for (const raw of ordered) {
    const migrated = migrateNodes(raw, options);
    const event = maybeRescore(migrated, options);

    eventCount++;
    lastSeenMs.set(event.item_id, Math.max(lastSeenMs.get(event.item_id) ?? -Infinity, event.occurredAtMs));

    // Mastery: every node in tests is updated (mock included — a mock measures).
    for (const node of event.tests) {
      const prior = skills.get(node) ?? { ...FRESH_SKILL };
      const updated = updateSkill(prior, {
        correct: event.correct,
        difficultyLabel: event.difficulty_label,
        itemType: event.item_type,
        occurredAtMs: event.occurredAtMs,
      });
      skills.set(node, updated);
    }

    // Misconceptions: record a hit when one was selected (a wrong answer with a
    // matched misconception).
    if (event.selected_misconception !== null && event.selected_misconception !== undefined) {
      const mid = event.selected_misconception;
      const list = misconceptions.get(mid) ?? [];
      list.push({ occurredAtMs: event.occurredAtMs, eventId: event.event_id, nodes: [...event.tests] });
      misconceptions.set(mid, list);
    }

    // Scheduler: mock-mode and post-exam events are ignored inside the fold.
    schedules = applyEventToSchedules(schedules, event, examMs);
  }

  // Pack transition: reconcile schedules against the current bank.
  schedules = reconcileSchedules(schedules, bank);

  // Sort all hit lists by (occurredAtMs, eventId) so order is canonical.
  for (const [mid, list] of misconceptions) {
    list.sort((a, b) =>
      a.occurredAtMs !== b.occurredAtMs
        ? a.occurredAtMs - b.occurredAtMs
        : a.eventId < b.eventId
          ? -1
          : a.eventId > b.eventId
            ? 1
            : 0,
    );
    misconceptions.set(mid, list);
  }

  return {
    skills,
    schedules,
    misconceptions,
    eventCount,
    lastSeenMs,
  };
}

/** Read-time convenience: drifted skills as of nowMs (forgetting applied). */
export function skillsAsOf(state: EngineState, nowMs: number): Map<string, SkillState> {
  const out = new Map<string, SkillState>();
  for (const [node, s] of state.skills) out.set(node, applyIdleDrift(s, nowMs));
  return out;
}
