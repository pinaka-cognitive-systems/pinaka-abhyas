/**
 * Typed UI selectors (W5-3).
 *
 * The narrow surface the screens (W5-5) call. Each takes the rebuilt
 * `EngineState`, a `LoadedPack`, and an explicit clock, and forwards to the
 * certified engine. Nothing here alters engine math; the selectors exist so the
 * UI imports one stable, app-shaped module instead of reaching into the engine's
 * function signatures directly.
 */

import {
  computeReadiness,
  EMPTY_SESSION,
  recordServed,
  selectNextAction,
  skillsAsOf,
  type EngineState,
  type Event,
  type NextAction,
  type Readiness,
  type SessionProgress,
} from "@pinaka/engine";
import type { LoadedPack } from "./pack.js";

/** Default session length the practice loop serves (SPEC 5 default). */
export const DEFAULT_SESSION_LENGTH = 20;

/**
 * The single next action to serve. `session` threads per-session bookkeeping
 * (so the review budget holds across a session without a wall clock); omit it
 * for the first pick of a fresh session.
 */
export function nextAction(
  state: EngineState,
  pack: LoadedPack,
  nowMs: number,
  sessionLength: number = DEFAULT_SESSION_LENGTH,
  session: SessionProgress = EMPTY_SESSION,
): NextAction {
  return selectNextAction(state, pack.bank, pack.blueprint, nowMs, sessionLength, session);
}

/**
 * Plan a whole session: up to `sessionLength` actions, threading session
 * progress so the review budget is enforced exactly as a live UI would by
 * calling `nextAction` repeatedly. Stops early on a "none" action (nothing left
 * to serve). Pure: no mutation of inputs.
 */
export function planSession(
  state: EngineState,
  pack: LoadedPack,
  nowMs: number,
  sessionLength: number = DEFAULT_SESSION_LENGTH,
): NextAction[] {
  const actions: NextAction[] = [];
  let session: SessionProgress = EMPTY_SESSION;
  for (let i = 0; i < sessionLength; i++) {
    const action = nextAction(state, pack, nowMs, sessionLength, session);
    if (action.kind === "none") break;
    actions.push(action);
    session = recordServed(session, action);
  }
  return actions;
}

/**
 * The honest readiness estimate (SPEC 6). `events` is required for mock
 * anchoring; the model EV comes from `state`. Confidence is never above medium.
 */
export function readiness(
  state: EngineState,
  events: readonly Event[],
  pack: LoadedPack,
  nowMs: number,
): Readiness {
  return computeReadiness(state, events, pack.bank, pack.blueprint, pack.marking, nowMs);
}

/** One node's mastery for the diagnosis map. */
export interface NodeMastery {
  readonly nodeId: string;
  /** Rating on the logit scale (SPEC 3). */
  readonly rating: number;
  /** Deviation (uncertainty); never presented without it (honesty constraint). */
  readonly deviation: number;
  /** Whether this node has any observed evidence yet (else it is the prior). */
  readonly observed: boolean;
}

/**
 * Mastery per node as of `nowMs`, with idle drift applied (SPEC 3). Only nodes
 * with observed evidence appear: a never-attempted node is the prior and is the
 * diagnosis screen's "not yet seen" state, surfaced from the blueprint rather
 * than invented here. Sorted by node id for a stable render.
 */
export function masteryByNode(state: EngineState, nowMs: number): NodeMastery[] {
  const drifted = skillsAsOf(state, nowMs);
  const out: NodeMastery[] = [];
  for (const [nodeId, skill] of drifted) {
    out.push({
      nodeId,
      rating: skill.rating,
      deviation: skill.deviation,
      observed: skill.attempts > 0,
    });
  }
  out.sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0));
  return out;
}
