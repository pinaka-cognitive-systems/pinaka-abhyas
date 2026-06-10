/**
 * Pack loader (W5-3).
 *
 * Reads the build artifact produced by
 * packs/ca-foundation-qa/build_and_validate.py (shape: `{ items, assets }`)
 * plus the profile's blueprint.json and marking.json, and produces the three
 * engine inputs the selectors need: a `Bank` map, an engine `Blueprint`, and a
 * `MarkingScheme`.
 *
 * This is a pure transform over already-parsed JSON. Fetching the pack (lazily,
 * off the entry chunk) is the caller's job; this module only shapes the data so
 * the engine — which holds no globals (SPEC 5) — can be called with explicit
 * arguments. Pack identity and versioning live in the manifest (ADR 0009) and
 * are handled by the pack-update client (W5-4), not here.
 */

import type {
  Bank,
  BankItem,
  Blueprint,
  BlueprintFamily,
  BlueprintPart,
  BlueprintSection,
  DifficultyLabel,
  ItemType,
  MarkingScheme,
  VerificationStatus,
} from "@pinaka/engine";

// ---------------------------------------------------------------------------
// The shapes of the on-disk JSON (the parts this loader reads). Extra fields
// the engine does not consume (stem, options, explanation, provenance, …) are
// present in the artifact but intentionally ignored: the engine reads only what
// SPEC section 2 names.
// ---------------------------------------------------------------------------

/** A per-option rationale entry; an incorrect option may name the misconception
 * its distractor targets (used to populate targets_misconceptions). */
interface RawRationale {
  readonly option_key: number | string;
  readonly verdict: string;
  readonly misconception?: string;
}

/** One pack item as emitted by build_and_validate.py. */
export interface RawPackItem {
  readonly id: string;
  readonly tests: readonly string[];
  readonly difficulty_label: DifficultyLabel;
  readonly item_type: ItemType;
  readonly expected_seconds: number;
  readonly verification_status: string;
  readonly empirical?: {
    readonly difficulty_b?: number;
    readonly avg_seconds?: number;
    readonly calibration_status?: string;
    readonly n_responses?: number;
  };
  readonly superseded_by?: string;
  readonly per_option_rationale?: readonly RawRationale[];
}

/** The pack build artifact: `{ items, assets }`. */
export interface RawPack {
  readonly items: readonly RawPackItem[];
  readonly assets?: readonly unknown[];
}

// --- Blueprint / marking JSON (schema/profiles/ca-foundation-qa/). ---

interface RawBlueprintSection {
  readonly icai_section?: string;
  readonly families: readonly string[];
}
interface RawBlueprintPart {
  readonly id: string;
  readonly marks: number;
  readonly questions: number;
  readonly sections: readonly RawBlueprintSection[];
}
export interface RawBlueprint {
  readonly parts: readonly RawBlueprintPart[];
}

export interface RawMarking {
  readonly marks_per_correct: number;
  readonly negative_mark_per_wrong: number;
  readonly marks_per_unattempted: number;
  readonly num_questions: number;
  readonly duration_minutes: number;
  readonly pass: { readonly paper_min_marks: number };
}

/** The three engine inputs derived from a pack and its profile. */
export interface LoadedPack {
  readonly bank: Bank;
  readonly blueprint: Blueprint;
  readonly marking: MarkingScheme;
}

// ---------------------------------------------------------------------------
// Item -> BankItem.
// ---------------------------------------------------------------------------

/** The verification statuses the engine knows (SPEC 2). Tombstones
 * (quarantined/retired) stay in the bank for history but are never selectable. */
const KNOWN_STATUS = new Set<VerificationStatus>([
  "verified",
  "draft",
  "candidate",
  "quarantined",
  "retired",
]);

/**
 * Map an artifact verification_status onto an engine VerificationStatus. The
 * pack pipeline emits richer labels (e.g. "machine_verified", "model-audited")
 * than the five SPEC states; for the engine's selection contract only the
 * tombstone distinction matters (selectable vs. not), so any non-tombstone
 * label collapses to "verified" (selectable) and the two tombstone labels pass
 * through verbatim. This keeps a model-audited item selectable while a
 * quarantined item is correctly excluded (ADR 0009).
 */
function mapStatus(raw: string): VerificationStatus {
  if (raw === "quarantined" || raw === "retired") return raw;
  if (KNOWN_STATUS.has(raw as VerificationStatus)) return raw as VerificationStatus;
  return "verified";
}

/** Distinct misconceptions any incorrect distractor targets, sorted for
 * determinism. Empty array omitted so the BankItem matches the engine's
 * optional-field contract under exactOptionalPropertyTypes. */
function targetsMisconceptions(item: RawPackItem): readonly string[] | undefined {
  const set = new Set<string>();
  for (const r of item.per_option_rationale ?? []) {
    if (typeof r.misconception === "string" && r.misconception.length > 0) {
      set.add(r.misconception);
    }
  }
  if (set.size === 0) return undefined;
  return [...set].sort();
}

/** The engine `empirical` block, or undefined. The artifact's calibration
 * bookkeeping (calibration_status, n_responses) is NOT engine input; only a
 * recalibrated difficulty_b or an observed avg_seconds is (SPEC 2). */
function empirical(item: RawPackItem): BankItem["empirical"] {
  const b = item.empirical?.difficulty_b;
  const s = item.empirical?.avg_seconds;
  if (b === undefined && s === undefined) return undefined;
  const out: { difficulty_b?: number; avg_seconds?: number } = {};
  if (b !== undefined) out.difficulty_b = b;
  if (s !== undefined) out.avg_seconds = s;
  return out;
}

function toBankItem(item: RawPackItem): BankItem {
  const out: {
    id: string;
    tests: readonly string[];
    difficulty_label: DifficultyLabel;
    item_type: ItemType;
    expected_seconds: number;
    verification_status: VerificationStatus;
    empirical?: NonNullable<BankItem["empirical"]>;
    superseded_by?: string;
    targets_misconceptions?: readonly string[];
  } = {
    id: item.id,
    tests: [...item.tests],
    difficulty_label: item.difficulty_label,
    item_type: item.item_type,
    expected_seconds: item.expected_seconds,
    verification_status: mapStatus(item.verification_status),
  };
  const emp = empirical(item);
  if (emp !== undefined) out.empirical = emp;
  if (item.superseded_by !== undefined) out.superseded_by = item.superseded_by;
  const tm = targetsMisconceptions(item);
  if (tm !== undefined) out.targets_misconceptions = tm;
  return out;
}

/** Build the engine Bank from the pack artifact's items. */
export function buildBank(pack: RawPack): Bank {
  const bank = new Map<string, BankItem>();
  for (const item of pack.items) bank.set(item.id, toBankItem(item));
  return bank;
}

// ---------------------------------------------------------------------------
// Blueprint / marking.
//
// The engine Blueprint carries per-family `quota` (expected questions on the
// exam). The profile blueprint.json lists families by id under sections with a
// per-section `derived_target_questions`, not a per-family quota. We split each
// section's derived target evenly across its families (the integer remainder
// goes to the earliest families by list order), so the family quotas sum to the
// section target and the section targets sum to the part's question count. This
// mirrors the blueprint's own "derived_target" guidance (a generation and
// assembly guide, not a hard ICAI figure).
// ---------------------------------------------------------------------------

interface RawBlueprintSectionWithTarget extends RawBlueprintSection {
  readonly derived_target_questions?: number;
}

/** Distribute `total` questions across `n` families: floor each, then hand the
 * remainder to the earliest families one at a time. Deterministic. */
function splitQuota(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  let rem = total - base * n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(base + (rem > 0 ? 1 : 0));
    if (rem > 0) rem--;
  }
  return out;
}

export function buildBlueprint(raw: RawBlueprint): Blueprint {
  const parts: BlueprintPart[] = raw.parts.map((part) => {
    const sections: BlueprintSection[] = part.sections.map((section, sIdx) => {
      const target =
        (section as RawBlueprintSectionWithTarget).derived_target_questions ??
        // Fall back to an even slice of the part's questions across its sections.
        Math.round(part.questions / part.sections.length);
      const quotas = splitQuota(target, section.families.length);
      const families: BlueprintFamily[] = section.families.map((nodeId, i) => ({
        nodeId,
        quota: quotas[i] ?? 0,
      }));
      return { id: section.icai_section ?? `${part.id}.s${sIdx}`, families };
    });
    return { id: part.id, marks: part.marks, questions: part.questions, sections };
  });
  return { parts };
}

export function buildMarking(raw: RawMarking): MarkingScheme {
  return {
    marksPerCorrect: raw.marks_per_correct,
    negativePerWrong: raw.negative_mark_per_wrong,
    marksPerUnattempted: raw.marks_per_unattempted,
    numQuestions: raw.num_questions,
    passMark: raw.pass.paper_min_marks,
    durationMinutes: raw.duration_minutes,
  };
}

/**
 * Load a pack and its profile into the three engine inputs. Pure: parsing and
 * (lazy) fetching are the caller's responsibility (W5-4); this only shapes
 * already-parsed JSON.
 */
export function loadPack(
  pack: RawPack,
  blueprint: RawBlueprint,
  marking: RawMarking,
): LoadedPack {
  return {
    bank: buildBank(pack),
    blueprint: buildBlueprint(blueprint),
    marking: buildMarking(marking),
  };
}
