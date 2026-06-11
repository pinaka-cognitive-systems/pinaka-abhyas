/**
 * Practice-flow content types (W5-5 flow a).
 *
 * The engine reads only what SPEC section 2 names (tests, difficulty, item_type,
 * the answer outcome). The PRACTICE SCREEN, in contrast, must render the human
 * content the engine deliberately ignores: the stem, the options, the answer
 * key, the per-option rationale (misconception mapping), and the worked
 * explanation. Those fields live in the pack artifact (packs/ca-foundation-qa/
 * pack.json) but are intentionally absent from the engine's `BankItem` and from
 * the pack loader's `RawPackItem`.
 *
 * This module is the screen-side view of a pack item: the read-only shape the
 * question and feedback screens consume. It carries `content_hash` (needed to
 * stamp every event, ADR 0009) and `taxonomy_version` (likewise) so the event
 * builder has the complete uqs-event-2 record from one source.
 */

import type { DifficultyLabel, ItemType } from "@pinaka/engine";

/** One presented option of a single_best item. `key` is the 1-based option id
 * used in the answer key and the per-option rationale. */
export interface ContentOption {
  readonly key: number;
  readonly text: string;
}

/** A per-option rationale: the verdict text plus, for an incorrect option, the
 * misconception its distractor targets (the second-person feedback line maps to
 * this id). */
export interface ContentRationale {
  readonly option_key: number;
  readonly verdict: string;
  readonly rationale: string;
  readonly misconception?: string;
}

/** Structured teaching sections shown after an answer (ADR 0017). Optional;
 * when present, all four sections are present. */
export interface ExplanationSections {
  /** Why the keyed answer wins, one or two sentences; always visible. */
  readonly punchline: string;
  /** How to attack this question type from a cold read. */
  readonly approach: string;
  /** The transferable take-home rule. */
  readonly lesson: string;
  /** How long it should take and what to cut first. */
  readonly timing: string;
}

/**
 * A pack item as the SCREEN sees it: engine fields plus the human content the
 * engine ignores. Every field needed to render the question, score it, build a
 * complete event, and show feedback is here.
 *
 * For `single_best`, `options` and `answer_key.correct` (a 1-based option key)
 * are present. For a `numeric_entry` item, `options` is empty and
 * `answer_key.value` carries the accepted numeric answer (with an optional
 * tolerance); this flow handles both so adding a numeric pack item later needs
 * no screen change.
 */
export interface ContentItem {
  readonly id: string;
  readonly content_hash: string;
  readonly taxonomy_version: number;
  readonly tests: readonly string[];
  readonly difficulty_label: DifficultyLabel;
  readonly item_type: ItemType;
  readonly stem: string;
  readonly options: readonly ContentOption[];
  readonly answer_key: {
    /** 1-based correct option key for single_best. */
    readonly correct?: number;
    /** Accepted answer for numeric_entry. */
    readonly value?: number;
    /** Absolute tolerance for a numeric answer (default 0: exact match). */
    readonly tolerance?: number;
  };
  readonly per_option_rationale: readonly ContentRationale[];
  readonly explanation: string;
  /** Structured teaching sections (ADR 0017). Absent for older pack items;
   * the feedback screen degrades gracefully when missing. */
  readonly explanationSections?: ExplanationSections;
}

/** The raw item shape as it sits in pack.json (a superset of ContentItem with
 * provenance and solution metadata this flow does not read). Only the fields
 * the screen needs are typed; the rest are opaque. */
export interface RawContentItem {
  readonly id: string;
  readonly content_hash: string;
  readonly taxonomy_version: number;
  readonly tests: readonly string[];
  readonly difficulty_label: DifficultyLabel;
  readonly item_type: ItemType;
  readonly stem: string;
  readonly options?: readonly ContentOption[];
  readonly answer_key?: {
    readonly correct?: number;
    readonly value?: number;
    readonly tolerance?: number;
  };
  readonly per_option_rationale?: readonly ContentRationale[];
  readonly explanation?: string;
  readonly explanation_sections?: {
    readonly punchline: string;
    readonly approach: string;
    readonly lesson: string;
    readonly timing: string;
  };
}

/** Narrow a raw pack item into the screen's ContentItem, defaulting the human
 * fields so a malformed item degrades to an empty-but-valid shape rather than
 * throwing mid-render. */
export function toContentItem(raw: RawContentItem): ContentItem {
  return {
    id: raw.id,
    content_hash: raw.content_hash,
    taxonomy_version: raw.taxonomy_version,
    tests: [...raw.tests],
    difficulty_label: raw.difficulty_label,
    item_type: raw.item_type,
    stem: raw.stem,
    options: raw.options ? [...raw.options] : [],
    answer_key: raw.answer_key ?? {},
    per_option_rationale: raw.per_option_rationale ? [...raw.per_option_rationale] : [],
    explanation: raw.explanation ?? "",
    // Omit explanationSections when absent (exactOptionalPropertyTypes strict mode).
    ...(raw.explanation_sections !== undefined
      ? {
          explanationSections: {
            punchline: raw.explanation_sections.punchline,
            approach: raw.explanation_sections.approach,
            lesson: raw.explanation_sections.lesson,
            timing: raw.explanation_sections.timing,
          },
        }
      : {}),
  };
}

/** Build a screen-content lookup keyed by item id from a raw pack's items. */
export function buildContentMap(
  items: readonly RawContentItem[],
): ReadonlyMap<string, ContentItem> {
  const map = new Map<string, ContentItem>();
  for (const raw of items) map.set(raw.id, toContentItem(raw));
  return map;
}
