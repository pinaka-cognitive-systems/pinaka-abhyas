/**
 * Answer scoring and uqs-event-2 construction (W5-5 flow a).
 *
 * The single place an answer becomes an engine `Event` (== `StoredEvent`). Pure
 * and DOM-free: every input that varies (the clock, the generated event id, the
 * viewport, the elapsed time) is a parameter, so the construction is unit
 * testable for COMPLETENESS and validity against the engine `Event` type
 * (SPEC section 9: no Date.now, no Math.random, no globals in logic).
 *
 * The React layer supplies the side-effecting values (Date.now at the app
 * boundary, crypto.randomUUID, window.innerWidth) and calls these functions; the
 * functions themselves never touch a wall clock or a global.
 */

import type { Event, Mode } from "@pinaka/engine";
import type { ContentItem } from "./types.js";

/** A student's raw response to one item, before scoring. */
export type Response =
  | { readonly kind: "single_best"; readonly selected_option: number }
  | { readonly kind: "numeric_entry"; readonly entered_value: number };

/** Device form-factor heuristic input and result. Captured per event so a later
 * analysis can separate phone attempts from laptop attempts (the audience takes
 * full mocks on the phone; ADR 0011). */
export interface DeviceContext {
  readonly form_factor: "phone" | "tablet" | "desktop";
  readonly viewport_width: number;
}

/**
 * Form-factor heuristic from a viewport width (CSS px). The phone floor is
 * 360px (ADR 0011); we classify by the common breakpoints the layout uses:
 * < 600 phone, < 900 tablet, else desktop. A heuristic, not a guarantee — it
 * records what the layout was serving, not the literal hardware.
 */
export function formFactor(viewportWidth: number): DeviceContext["form_factor"] {
  if (viewportWidth < 600) return "phone";
  if (viewportWidth < 900) return "tablet";
  return "desktop";
}

/** Build the device-context record from a viewport width. */
export function deviceContext(viewportWidth: number): DeviceContext {
  return { form_factor: formFactor(viewportWidth), viewport_width: viewportWidth };
}

/** The outcome of scoring a response against an item's key. */
export interface ScoredResponse {
  readonly correct: boolean;
  /** The misconception id the chosen distractor targets, or null (correct, or
   * an option with no mapped misconception, or a numeric answer). */
  readonly selected_misconception: string | null;
}

/**
 * Score a response against the item's answer key, and resolve the misconception
 * the chosen option targets (per-option rationale mapping, populated only for an
 * incorrect single_best option that names one).
 *
 * single_best: correct iff selected_option === answer_key.correct.
 * numeric_entry: correct iff |entered_value - value| <= tolerance (default 0).
 */
export function scoreResponse(item: ContentItem, response: Response): ScoredResponse {
  if (response.kind === "single_best") {
    const correct = response.selected_option === item.answer_key.correct;
    if (correct) return { correct: true, selected_misconception: null };
    const chosen = item.per_option_rationale.find(
      (r) => r.option_key === response.selected_option,
    );
    return {
      correct: false,
      selected_misconception: chosen?.misconception ?? null,
    };
  }
  // numeric_entry
  const target = item.answer_key.value;
  const tol = item.answer_key.tolerance ?? 0;
  const correct = target !== undefined && Math.abs(response.entered_value - target) <= tol;
  return { correct, selected_misconception: null };
}

/** Everything the React layer measures at the app boundary, passed in so the
 * builder stays pure. */
export interface EventInputs {
  /** crypto.randomUUID() result, generated at the boundary. */
  readonly eventId: string;
  /** Date.now() at the boundary, epoch ms. */
  readonly occurredAtMs: number;
  /** Elapsed solve time, milliseconds, measured by the screen's timer. */
  readonly timeMs: number;
  /** The viewport width at answer time (window.innerWidth), CSS px. */
  readonly viewportWidth: number;
  /** True when this item was served as a resurfaced review (engine action kind
   * "review" / "remediate"). False for fresh practice or coverage. */
  readonly resurfaced: boolean;
  /** The session mode this answer was recorded under. */
  readonly mode: Mode;
  /** Mock assembly type, set only for answers given inside a mock paper
   * (ADR 0018 ruling 11): recorded in device_context for telemetry. The union
   * is declared here rather than imported so the practice layer does not
   * depend on the mock flow. */
  readonly mockType?: "standard" | "hard" | "pace";
}

/**
 * Build a COMPLETE uqs-event-2 `StoredEvent` (== engine `Event`) from an item, a
 * response, and the boundary-measured inputs. Every field the engine reads
 * (SPEC 2) is populated, plus the raw `response` (retained for re-scoring after
 * a pack re-key, ADR 0009) and `device_context`.
 *
 * The scoring is computed here so `correct` and `selected_misconception` can
 * never disagree with the response — there is exactly one place the answer key
 * is consulted.
 */
export function buildEvent(
  item: ContentItem,
  response: Response,
  inputs: EventInputs,
): Event {
  const scored = scoreResponse(item, response);
  const responsePayload =
    response.kind === "single_best"
      ? { selected_option: response.selected_option }
      : { entered_value: response.entered_value };

  return {
    event_id: inputs.eventId,
    occurredAtMs: inputs.occurredAtMs,
    item_id: item.id,
    item_content_hash: item.content_hash,
    taxonomy_version: item.taxonomy_version,
    tests: [...item.tests],
    difficulty_label: item.difficulty_label,
    item_type: item.item_type,
    mode: inputs.mode,
    correct: scored.correct,
    selected_misconception: scored.selected_misconception,
    response: responsePayload,
    time_ms: inputs.timeMs,
    resurfaced: inputs.resurfaced,
    device_context:
      inputs.mockType !== undefined
        ? { ...deviceContext(inputs.viewportWidth), mock_type: inputs.mockType }
        : deviceContext(inputs.viewportWidth),
  };
}
