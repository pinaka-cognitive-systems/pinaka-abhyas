/**
 * insights.ts — design-shaped view-model selectors (the profile layer).
 *
 * The design prototype drives every screen from a PROFILE object
 * (design-team/v2/data.jsx): a data-state id, a recommendation, readiness,
 * reviews, misconceptions, mocks. This module derives that same shape from
 * the live engine + storage, so screens transcribe the prototype JSX and
 * read one view-model (SSOT; Handout section 02: "Swap the PROFILE objects
 * for queries against the persistence layer and the screens do not change").
 *
 * Everything here is a pure function over explicit inputs (events, engine
 * state, pack, meta values, nowMs). No I/O, no Date.now, no DOM, so each
 * selector is unit-testable in isolation. Loading lives in the flows (they
 * already own storage connections) or in loadShellSnapshot below, the one
 * cached loader the Router uses for the rail badge.
 *
 * Marks-lost accounting (Handout section 07): a wrong answer in a mock costs
 * the foregone mark plus the negative-marking penalty (1 + 0.25); a wrong
 * answer in practice/drill/review costs the foregone mark (1.0). The design's
 * own numbers follow this rule (MOCK_RESULT.mis: 5 questions -> 6.25 lost).
 */

import {
  dueItems,
  masteryProbability,
  skillsAsOf,
  type Bank,
  type EngineState,
  type Event,
  type ItemSchedule,
  type Readiness,
} from "@pinaka/engine";

import type { LoadedPack } from "./pack.js";

/* ------------------------------------------------------------------ */
/* META KEYS — shared app-level meta (single registration point)       */
/* ------------------------------------------------------------------ */

/** Exam month, ISO "YYYY-MM" (set in first-run; optional). */
export const META_EXAM_DATE = "exam_date_v1";
/** Student-settable readiness target in marks (Settings); unset = none. */
export const META_TARGET = "readiness_target_v1";
/** Total mocks ever submitted on this device (results meta caps at 3). */
export const META_MOCK_COUNT = "mock_count_v1";
/** Accessibility settings JSON: { reduceMotion, contrast, textSize }. */
export const META_A11Y = "a11y_v1";
/** Discarded (abandoned) mock session, kept for the 6s undo window. */
export const META_DISCARDED_SESSION = "mock_session_discarded_v1";

/* ------------------------------------------------------------------ */
/* DATA STATES (Handout section 04)                                    */
/* ------------------------------------------------------------------ */

export type DataState =
  | "empty"        /* no mocks taken */
  | "early"        /* 1 mock; provisional everything */
  | "returning"    /* >= 2 mocks, steady */
  | "progressing"  /* upward delta across recent mocks */
  | "plateau";     /* >= 3 mocks flat (delta within +-1) */

/** Upward-delta threshold for "progressing" (marks, net). Provisional until
 * calibrated; recorded in as-built. */
export const PROGRESS_DELTA = 2.0;
/** Flatness window for "plateau": the last three standard nets sit within
 * this band (Handout: "delta within +-1"). */
export const PLATEAU_BAND = 1.0;

/**
 * Classify the student's data state from mock history.
 *
 * @param mockCount     total mocks ever submitted (META_MOCK_COUNT).
 * @param standardNets  nets of stored STANDARD mocks, newest first. Hard and
 *                      pace mocks never feed state (Handout section 10).
 */
export function classifyDataState(
  mockCount: number,
  standardNets: readonly number[],
): DataState {
  if (mockCount === 0) return "empty";
  if (mockCount === 1) return "early";
  if (standardNets.length >= 3) {
    const last3 = standardNets.slice(0, 3);
    const span = Math.max(...last3) - Math.min(...last3);
    if (span <= PLATEAU_BAND) return "plateau";
  }
  if (standardNets.length >= 2) {
    const delta = standardNets[0]! - standardNets[1]!;
    if (delta >= PROGRESS_DELTA) return "progressing";
  }
  return "returning";
}

/* ------------------------------------------------------------------ */
/* READINESS VIEW (design ReadinessBand shape)                          */
/* ------------------------------------------------------------------ */

export interface ReadinessView {
  readonly net: number;
  readonly lo: number;
  readonly hi: number;
  /** Display ladder: engine insufficient_data -> null view; low -> "low";
   * medium -> "moderate". The engine never claims more (SPEC 6). */
  readonly confidence: "low" | "moderate";
  readonly target: number | null;
}

/** Map the engine Readiness onto the design band, or null (band hidden,
 * the honest "no estimate yet" copy renders instead). */
export function readinessView(r: Readiness, target: number | null): ReadinessView | null {
  if (r.confidence === "insufficient_data") return null;
  if (r.expectedMarks === null || r.low === null || r.high === null) return null;
  return {
    net: Math.round(r.expectedMarks),
    lo: Math.round(r.low),
    hi: Math.round(r.high),
    confidence: r.confidence === "low" ? "low" : "moderate",
    target,
  };
}

/* ------------------------------------------------------------------ */
/* MOCK HISTORY (stored by flows/mock/results.ts; parsed structurally   */
/* here to keep the engine layer free of flow imports)                  */
/* ------------------------------------------------------------------ */

export type MockType = "standard" | "hard" | "pace";

/** One row of the design's recent-mocks / past-mocks lists. */
export interface MockHistoryRow {
  /** "Mock 03" — numbered by submission order across the device. */
  readonly name: string;
  readonly type: MockType;
  readonly net: number;
  /** Marks possible on this paper (100, or scaled for a shortfall paper). */
  readonly denominator: number;
  readonly finishedAtMs: number;
  /** Relative date, "2 days ago". */
  readonly date: string;
}

/** The summary block results.ts embeds per record (schema 2, additive). */
interface StoredSummary {
  readonly net: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly penalty: number;
  readonly denominator: number;
  readonly type: MockType;
}

/** Relative date in the design's vocabulary ("today", "1 day ago", ...). */
export function relativeDate(thenMs: number, nowMs: number): string {
  const days = Math.floor(Math.max(0, nowMs - thenMs) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/**
 * Read the design's mock-history rows out of the stored results meta value
 * (MOCK_RESULTS_META_KEY in flows/mock/results.ts). Records without a scored
 * summary (written before schema 2) are skipped — never guessed at.
 *
 * @param raw        the meta JSON string, or null.
 * @param mockCount  total mocks ever submitted (for "Mock NN" numbering).
 */
export function mockHistory(
  raw: string | null,
  mockCount: number,
  nowMs: number,
): MockHistoryRow[] {
  if (raw === null || raw === "") return [];
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(v)) return [];
  const out: MockHistoryRow[] = [];
  let n = mockCount;
  for (const item of v) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as { summary?: StoredSummary; finishedAtMs?: number };
    const s = o.summary;
    const num = n;
    n -= 1;
    if (
      s === undefined ||
      typeof s.net !== "number" ||
      typeof o.finishedAtMs !== "number"
    ) {
      continue;
    }
    out.push({
      name: `Mock ${String(Math.max(1, num)).padStart(2, "0")}`,
      type: s.type === "hard" || s.type === "pace" ? s.type : "standard",
      net: s.net,
      denominator: typeof s.denominator === "number" ? s.denominator : 100,
      finishedAtMs: o.finishedAtMs,
      date: relativeDate(o.finishedAtMs, nowMs),
    });
  }
  return out;
}

/** Standard-mock nets, newest first, for the state classifier. */
export function standardNets(history: readonly MockHistoryRow[]): number[] {
  return history.filter((m) => m.type === "standard").map((m) => m.net);
}

/* ------------------------------------------------------------------ */
/* RECOMMENDATION (the Today "Recommended now" card; data.jsx PROFILES) */
/* ------------------------------------------------------------------ */

export interface Recommendation {
  readonly kind: "mock" | "review" | "practice" | "resume";
  readonly title: string;
  readonly icon: "clipboard" | "repeat" | "crosshair" | "trend-up" | "alert";
  readonly detail: string;
  readonly cta: string;
  readonly dest: string;
  /** Route of the surface that justifies the recommendation, or null. */
  readonly evidence: string | null;
}

export interface RecommendationInput {
  readonly state: DataState;
  readonly reviewsDue: number;
  /** Weakest diagnosed topic display name, or null before diagnosis. */
  readonly weakestTopic: string | null;
  /** Top-cost misconception, or null. */
  readonly topMisconception: { readonly name: string; readonly marksLost: number; readonly id: string } | null;
  /** An interrupted mock, when one exists: its name and answered counts. */
  readonly interrupted?: { readonly name: string; readonly answered: number; readonly total: number } | null;
}

/** The single recommended action, per the design profiles (data.jsx:176-283).
 * Copy is the design team's; dynamic fragments are the live numbers. */
export function recommend(input: RecommendationInput): Recommendation {
  const { state, reviewsDue, weakestTopic, topMisconception } = input;
  const interrupted = input.interrupted ?? null;
  if (interrupted !== null) {
    return {
      kind: "resume", title: "A mock was interrupted", icon: "alert",
      detail: `The app closed during ${interrupted.name} with ${interrupted.answered} of ${interrupted.total} answered. Your answers up to that point are saved on this device. Resume where you left off, or discard and start over.`,
      cta: `Resume ${interrupted.name}`, dest: "mock/hall", evidence: null,
    };
  }
  if (state === "empty") {
    return {
      kind: "mock", title: "Take your first mock", icon: "clipboard",
      detail: "A full standard mock under real timing. There is nothing to recommend until the data exists. This is where the diagnosis starts.",
      cta: "Start standard mock", dest: "mock", evidence: null,
    };
  }
  if (state === "plateau" && topMisconception !== null) {
    return {
      kind: "review", title: "Attack one error, not everything", icon: "crosshair",
      detail: `Your score has held flat across three mocks because the same misconception keeps costing the same marks. ${topMisconception.name} alone is ${formatMarks(topMisconception.marksLost)} of them. Fix that one thing and the plateau moves.`,
      cta: "Drill this pattern", dest: `misconception/${topMisconception.id}`, evidence: "misconception",
    };
  }
  if (reviewsDue > 0) {
    return {
      kind: "review", title: `${reviewsDue} ${reviewsDue === 1 ? "review is" : "reviews are"} due`, icon: "repeat",
      detail: "Past mistakes have resurfaced on schedule. Clear these first; they are the cheapest marks you will find today.",
      cta: "Start review", dest: "review", evidence: "review",
    };
  }
  if (state === "progressing") {
    return {
      kind: "mock", title: "Take a hard mock", icon: "trend-up",
      detail: "You have cleared the bar on your last two standard mocks. A hard mock will surface what still breaks under pressure, before the real paper does.",
      cta: "Start hard mock", dest: "mock", evidence: "diagnosis",
    };
  }
  if (state === "early" && weakestTopic !== null) {
    return {
      kind: "practice", title: `Drill ${weakestTopic}`, icon: "crosshair",
      detail: "Your first mock points here, but one mock is thin evidence. Drill this, then take a second mock to firm up the diagnosis.",
      cta: "Start drill", dest: "practice", evidence: "diagnosis",
    };
  }
  if (weakestTopic !== null) {
    return {
      kind: "practice", title: `Drill ${weakestTopic}`, icon: "crosshair",
      detail: "Nothing is due for review. The next cheapest marks are in your weakest diagnosed topic.",
      cta: "Start drill", dest: "practice", evidence: "diagnosis",
    };
  }
  return {
    kind: "mock", title: "Take another standard mock", icon: "clipboard",
    detail: "Nothing is due for review. A standard mock refreshes the diagnosis and narrows the readiness band.",
    cta: "Start standard mock", dest: "mock", evidence: null,
  };
}

/** The plateau belief statement (data.jsx:247, verbatim). */
export const PLATEAU_BELIEF =
  "Three mocks at the same score is not a ceiling. It is one or two unfixed errors repeating. The work now is narrow, not more of everything.";

/* ------------------------------------------------------------------ */
/* MISCONCEPTION COSTS — the diagnosis axis (Handout section 07)        */
/* ------------------------------------------------------------------ */

export interface MisconceptionCost {
  readonly id: string;
  readonly name: string;
  /** Wrong attempts carrying this misconception. */
  readonly count: number;
  /** Marks lost (mock: 1.25 per wrong; practice: 1.0 per wrong). */
  readonly marksLost: number;
  /** Family node ids touched (for the matrix and the topics line). */
  readonly families: readonly string[];
  /** Display topics line, e.g. "Finance, Index Numbers". */
  readonly topics: string;
  readonly trend: "up" | "down" | "flat";
}

/** Marks lost by one wrong event (see header note). */
function marksLostFor(mode: Event["mode"], negativePerWrong: number): number {
  return mode === "mock" ? 1 + negativePerWrong : 1;
}

/** The family (chapter) a node id belongs to: the longest blueprint family
 * id that prefixes it, e.g. "qa.bmath.finance.simple_interest" ->
 * "qa.bmath.finance". Unmatched nodes map to themselves. */
export function familyOf(nodeId: string, familyIds: readonly string[]): string {
  let best: string | null = null;
  for (const f of familyIds) {
    if ((nodeId === f || nodeId.startsWith(`${f}.`)) && (best === null || f.length > best.length)) {
      best = f;
    }
  }
  return best ?? nodeId;
}

/** All blueprint family ids, in blueprint order (the 18 chapters). */
export function blueprintFamilies(pack: LoadedPack): string[] {
  const out: string[] = [];
  for (const part of pack.blueprint.parts) {
    for (const section of part.sections) {
      for (const fam of section.families) {
        if (!out.includes(fam.nodeId)) out.push(fam.nodeId);
      }
    }
  }
  return out;
}

/** Trend window: hits in the trailing 14 days vs the 14 days before. */
const TREND_WINDOW_MS = 14 * 86_400_000;

/**
 * Aggregate misconception costs from the event log, ranked most costly
 * first. `names` maps canon ids to display names (topics.ts); ids without a
 * name entry fall back to a title-cased leaf, never a raw id.
 */
export function misconceptionCosts(
  events: readonly Event[],
  pack: LoadedPack,
  names: ReadonlyMap<string, string>,
  topicNames: ReadonlyMap<string, string>,
  nowMs: number,
  minOccurrences = 2,
): MisconceptionCost[] {
  const familyIds = blueprintFamilies(pack);
  const acc = new Map<string, {
    count: number; marksLost: number; families: Set<string>;
    recent: number; prior: number;
  }>();
  for (const e of events) {
    if (e.correct || e.selected_misconception === null) continue;
    const id = e.selected_misconception;
    let a = acc.get(id);
    if (a === undefined) {
      a = { count: 0, marksLost: 0, families: new Set(), recent: 0, prior: 0 };
      acc.set(id, a);
    }
    a.count += 1;
    a.marksLost += marksLostFor(e.mode, pack.marking.negativePerWrong);
    for (const node of e.tests) a.families.add(familyOf(node, familyIds));
    const age = nowMs - e.occurredAtMs;
    if (age <= TREND_WINDOW_MS) a.recent += 1;
    else if (age <= 2 * TREND_WINDOW_MS) a.prior += 1;
  }
  const out: MisconceptionCost[] = [];
  for (const [id, a] of acc) {
    if (a.count < minOccurrences) continue;
    const families = [...a.families].sort();
    out.push({
      id,
      name: names.get(id) ?? fallbackName(id),
      count: a.count,
      marksLost: round2(a.marksLost),
      families,
      topics: families.map((f) => shortFamilyName(f, topicNames)).join(", "),
      trend: a.recent > a.prior ? "up" : a.recent < a.prior ? "down" : "flat",
    });
  }
  out.sort((x, y) => y.marksLost - x.marksLost || x.id.localeCompare(y.id));
  return out;
}

/** Title-case an id's leaf ("complement_confusion" -> "Complement confusion").
 * A student never reads a raw snake_case id (Handout section 15). */
export function fallbackName(id: string): string {
  const leaf = id.slice(id.lastIndexOf(".") + 1).replace(/_/g, " ");
  return leaf.charAt(0).toUpperCase() + leaf.slice(1);
}

/** A family's display name, shortened for meta lines (drops a trailing
 * qualifier after a comma: "Ratio & Proportion, Indices, Logarithms" stays;
 * names come from the taxonomy). */
function shortFamilyName(familyId: string, topicNames: ReadonlyMap<string, string>): string {
  return topicNames.get(familyId) ?? fallbackName(familyId);
}

/* ------------------------------------------------------------------ */
/* MATRIX (the signature topic x misconception view; scr-diagnosis)     */
/* ------------------------------------------------------------------ */

export interface MatrixView {
  /** Row family ids + display names, weakest (most marks lost) first. */
  readonly rows: readonly { readonly id: string; readonly name: string }[];
  /** Column misconceptions (top by cost), in cost order. */
  readonly cols: readonly { readonly id: string; readonly name: string }[];
  /** cells[rowIndex][colIndex] = marks lost, 0 when none. */
  readonly cells: readonly (readonly number[])[];
  /** Families not shown (below threshold or no losses) — declared, not 0. */
  readonly hiddenCount: number;
}

export const MATRIX_MAX_ROWS = 6;
export const MATRIX_MAX_COLS = 6;
/** The legend ceiling (design mxCell: none -> 7.0). */
export const MATRIX_SCALE_MAX = 7.0;

export function misconceptionMatrix(
  events: readonly Event[],
  pack: LoadedPack,
  costs: readonly MisconceptionCost[],
  topicNames: ReadonlyMap<string, string>,
): MatrixView {
  const familyIds = blueprintFamilies(pack);
  const cols = costs.slice(0, MATRIX_MAX_COLS);
  // marks lost per (family, misconception)
  const cell = new Map<string, number>();
  const rowTotal = new Map<string, number>();
  for (const e of events) {
    if (e.correct || e.selected_misconception === null) continue;
    if (!cols.some((c) => c.id === e.selected_misconception)) continue;
    const lost = marksLostFor(e.mode, pack.marking.negativePerWrong);
    const fams = new Set(e.tests.map((n) => familyOf(n, familyIds)));
    for (const f of fams) {
      const k = `${f}\u0000${e.selected_misconception}`;
      cell.set(k, (cell.get(k) ?? 0) + lost);
      rowTotal.set(f, (rowTotal.get(f) ?? 0) + lost);
    }
  }
  const rows = [...rowTotal.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MATRIX_MAX_ROWS)
    .map(([id]) => ({ id, name: topicNames.get(id) ?? fallbackName(id) }));
  const cells = rows.map((r) =>
    cols.map((c) => round2(cell.get(`${r.id}\u0000${c.id}`) ?? 0)),
  );
  return {
    rows,
    cols: cols.map((c) => ({ id: c.id, name: c.name })),
    cells,
    hiddenCount: Math.max(0, familyIds.length - rows.length),
  };
}

/** Cell heat, exactly the design's mxCell math (scr-diagnosis.jsx:22-27).
 * Returns inline-style values; the indigo literal is the design's own. */
export function matrixCellStyle(v: number): { background: string; color: string } {
  if (v <= 0) return { background: "var(--color-card)", color: "var(--color-foreground)" };
  const o = 0.12 + Math.min(v / MATRIX_SCALE_MAX, 1) * 0.8;
  return {
    background: `rgba(99, 102, 241, ${o.toFixed(2)})`,
    color: v >= 3.2 ? "#fff" : "var(--color-foreground)",
  };
}

/* ------------------------------------------------------------------ */
/* REVIEW QUEUE (scr-core.jsx Review + the rail badge)                  */
/* ------------------------------------------------------------------ */

export interface ReviewQueueItem {
  readonly itemId: string;
  /** Display interval, e.g. "6d" (shown in the design's rev-box). */
  readonly intervalLabel: string;
  readonly intervalDays: number;
  readonly topic: string;
  /** Misconception display name, or null when none recorded. */
  readonly mis: string | null;
  /** Why it is back, design vocabulary: "Missed 6 days ago · interval 6d". */
  readonly reason: string;
  /** "today" | "tomorrow" | "in Nd" */
  readonly due: string;
  readonly dueAtMs: number;
}

export interface ReviewQueueView {
  readonly due: readonly ReviewQueueItem[];
  readonly upcoming: readonly ReviewQueueItem[];
}

/** Upcoming window the queue shows below "Coming up" (design: tomorrow). */
const UPCOMING_WINDOW_MS = 7 * 86_400_000;

export function reviewQueue(
  state: EngineState,
  events: readonly Event[],
  bank: Bank,
  topicNames: ReadonlyMap<string, string>,
  misNames: ReadonlyMap<string, string>,
  nowMs: number,
): ReviewQueueView {
  // Last recorded misconception and wrong-count per item, from the log.
  const lastMis = new Map<string, string>();
  const wrongCount = new Map<string, number>();
  for (const e of events) {
    if (e.correct) continue;
    wrongCount.set(e.item_id, (wrongCount.get(e.item_id) ?? 0) + 1);
    if (e.selected_misconception !== null) lastMis.set(e.item_id, e.selected_misconception);
  }

  const toItem = (s: ItemSchedule): ReviewQueueItem => {
    const bankItem = bank.get(s.itemId);
    const node = bankItem?.tests[0] ?? null;
    const interval = Math.max(1, Math.round(s.intervalDays));
    const misId = lastMis.get(s.itemId) ?? bankItem?.targets_misconceptions?.[0] ?? null;
    const wrongs = wrongCount.get(s.itemId) ?? 0;
    let reason: string;
    if (!s.lapsed) {
      reason = `Got it right last time · interval ${interval}d`;
    } else if (wrongs <= 1) {
      reason = `New mistake · interval ${interval}d`;
    } else if (wrongs === 2) {
      reason = `Missed twice · interval ${interval}d`;
    } else {
      reason = `Missed ${relativeDate(s.lastSeenMs, nowMs)} · interval ${interval}d`;
    }
    const dueDays = Math.ceil((s.dueAtMs - nowMs) / 86_400_000);
    const due = s.dueAtMs <= nowMs ? "today" : dueDays <= 1 ? "tomorrow" : `in ${dueDays}d`;
    return {
      itemId: s.itemId,
      intervalLabel: `${interval}d`,
      intervalDays: s.intervalDays,
      topic: node !== null ? (topicNames.get(node) ?? fallbackName(node)) : "Mixed practice",
      mis: misId !== null ? (misNames.get(misId) ?? fallbackName(misId)) : null,
      reason,
      due,
      dueAtMs: s.dueAtMs,
    };
  };

  const due = dueItems(state.schedules, nowMs).map(toItem);
  const upcoming = [...state.schedules.values()]
    .filter((s) => s.dueAtMs > nowMs && s.dueAtMs <= nowMs + UPCOMING_WINDOW_MS)
    .sort((a, b) => a.dueAtMs - b.dueAtMs || a.itemId.localeCompare(b.itemId))
    .map(toItem);
  return { due, upcoming };
}

/* ------------------------------------------------------------------ */
/* SYLLABUS COVERAGE (scr-diagnosis Syllabus; coverage only, no bars)   */
/* ------------------------------------------------------------------ */

export type Coverage = "mastered" | "progressing" | "touched" | "untouched";

export interface SyllabusChapter {
  readonly id: string;
  readonly name: string;
  /** Leaf subtopics in scope under this chapter. */
  readonly leaves: number;
  readonly coverage: Coverage;
  /** Attempts so far (shown on touched rows: "6 attempts"). */
  readonly attempts: number;
  /** The single focus chapter (top marks lost), design's FOCUS chip. */
  readonly focus: boolean;
}

export interface SyllabusPart {
  readonly id: string;
  readonly name: string;
  readonly marks: number;
  readonly chapters: readonly SyllabusChapter[];
}

/** Attempts before a chapter graduates from "touched" (Handout: recommend 12;
 * provisional until calibrated). */
export const COVERAGE_THRESHOLD = 12;
/** Mastery probability at or above which a covered chapter reads "mastered". */
export const MASTERED_P = 0.8;

export function syllabusCoverage(
  state: EngineState,
  pack: LoadedPack,
  topicNames: ReadonlyMap<string, string>,
  partNames: ReadonlyMap<string, string>,
  leavesByFamily: ReadonlyMap<string, number>,
  focusFamilyId: string | null,
  nowMs: number,
): SyllabusPart[] {
  const skills = skillsAsOf(state, nowMs);
  return pack.blueprint.parts.map((part) => {
    const chapters: SyllabusChapter[] = [];
    for (const section of part.sections) {
      for (const fam of section.families) {
        let attempts = 0;
        let pSum = 0;
        let pCount = 0;
        for (const [nodeId, skill] of skills) {
          if (nodeId !== fam.nodeId && !nodeId.startsWith(`${fam.nodeId}.`)) continue;
          if (skill.attempts === 0) continue;
          attempts += skill.attempts;
          pSum += masteryProbability(skill).p;
          pCount += 1;
        }
        let coverage: Coverage;
        if (attempts === 0) coverage = "untouched";
        else if (attempts < COVERAGE_THRESHOLD) coverage = "touched";
        else if (pCount > 0 && pSum / pCount >= MASTERED_P) coverage = "mastered";
        else coverage = "progressing";
        chapters.push({
          id: fam.nodeId,
          name: topicNames.get(fam.nodeId) ?? fallbackName(fam.nodeId),
          leaves: leavesByFamily.get(fam.nodeId) ?? 0,
          coverage,
          attempts,
          focus: fam.nodeId === focusFamilyId,
        });
      }
    }
    return {
      id: part.id,
      name: partNames.get(part.id) ?? fallbackName(part.id),
      marks: part.marks,
      chapters,
    };
  });
}

export const COVERAGE_LABEL: Record<Coverage, string> = {
  mastered: "Mastered",
  progressing: "In progress",
  touched: "Touched",
  untouched: "Not started",
};

/* ------------------------------------------------------------------ */
/* WEAKEST TOPIC (for recommendations and the Today diagnosis card)     */
/* ------------------------------------------------------------------ */

/** The diagnosed family with the most marks lost, or null. */
export function weakestFamily(
  costs: readonly MisconceptionCost[],
  topicNames: ReadonlyMap<string, string>,
): { readonly id: string; readonly name: string } | null {
  const lost = new Map<string, number>();
  for (const c of costs) {
    for (const f of c.families) {
      lost.set(f, (lost.get(f) ?? 0) + c.marksLost);
    }
  }
  let best: string | null = null;
  let bestLost = 0;
  for (const [f, l] of lost) {
    if (l > bestLost || (l === bestLost && (best === null || f < best))) {
      best = f;
      bestLost = l;
    }
  }
  if (best === null) return null;
  return { id: best, name: topicNames.get(best) ?? fallbackName(best) };
}

/* ------------------------------------------------------------------ */
/* TIME TRIAGE (Handout section 12; scr-review-mock timeVerdict)        */
/* Cutoffs are provisional until per-student calibration exists; every  */
/* surface that shows a verdict also shows the provisional caveat.      */
/* ------------------------------------------------------------------ */

export const PACE_FAST_S = 45;
export const PACE_SLOW_S = 100;

export type TriageKind = "good" | "warn" | "danger" | "muted";

export interface TimeVerdict {
  readonly label: string;
  readonly kind: TriageKind;
  readonly note: string;
}

export const PACE_CAVEAT =
  "Pace cutoffs are provisional; they calibrate as you sit more mocks.";

/** Speed x correctness verdict, strings verbatim from
 * design-team/v2/scr-review-mock.jsx:12-23. */
export function timeVerdict(outcome: "correct" | "wrong" | "skipped", timeS: number): TimeVerdict {
  if (outcome === "skipped") {
    return { label: "Skipped", kind: "muted", note: "Left blank." };
  }
  if (outcome === "wrong") {
    if (timeS < PACE_FAST_S) {
      return { label: "Rushed", kind: "warn", note: "Fast and wrong. The method is likely there; you committed before checking." };
    }
    if (timeS > PACE_SLOW_S) {
      return { label: "Hard for you", kind: "danger", note: "Slow and wrong. This is a knowledge gap, not a pacing one. Drill the concept." };
    }
    return { label: "Missed", kind: "danger", note: "Wrong at normal pace. The misconception below is the fix." };
  }
  if (timeS > PACE_SLOW_S) {
    return { label: "Inefficient", kind: "warn", note: "Right, but slow. You knew it; it cost you time you will want back on test day." };
  }
  return { label: "Solid", kind: "good", note: "Fast and correct. Nothing to do here." };
}

/* ------------------------------------------------------------------ */
/* SESSION CALIBRATION (scr-practice.jsx calibration; per session,      */
/* never per question — Handout section 12)                             */
/* ------------------------------------------------------------------ */

export type SessionConfidence = "low" | "mid" | "high";

export interface CalibrationView {
  readonly label: "Overconfident" | "Underconfident" | "Well calibrated";
  readonly kind: "warn" | "info" | "good";
  readonly text: string;
}

/** The gap between felt confidence and the actual score that flips the
 * calibration verdict (design scr-practice.jsx:245-251). */
const CALIBRATION_GAP = 18;
const FELT_PCT: Record<SessionConfidence, number> = { low: 35, mid: 65, high: 90 };

export function calibration(conf: SessionConfidence, scorePct: number): CalibrationView {
  const gap = FELT_PCT[conf] - scorePct;
  if (gap >= CALIBRATION_GAP) {
    return {
      label: "Overconfident", kind: "warn",
      text: `You felt more sure than you scored. That gap, ${gap} points, is where surprises on test day come from. Slow down to check the method before you commit.`,
    };
  }
  if (gap <= -CALIBRATION_GAP) {
    return {
      label: "Underconfident", kind: "info",
      text: "You scored better than you felt. You know more than you trust yourself to. On the real paper, that hesitation costs time, not marks.",
    };
  }
  return {
    label: "Well calibrated", kind: "good",
    text: "Your sense of how you did matched the result. Calibration like this is what lets you triage a real paper under time.",
  };
}

/* ------------------------------------------------------------------ */
/* EXAM DATE                                                            */
/* ------------------------------------------------------------------ */

export interface ExamDateView {
  /** "Sep 2026" */
  readonly display: string;
  readonly daysLeft: number;
  /** Epoch ms of the exam month's first day (for the engine examMs). */
  readonly examMs: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse the stored ISO month ("2026-09"), or null. */
export function examDateView(raw: string | null, nowMs: number): ExamDateView | null {
  if (raw === null) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(raw.trim());
  if (m === null) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const examMs = Date.UTC(year, month - 1, 1);
  return {
    display: `${MONTHS[month - 1]} ${year}`,
    daysLeft: Math.max(0, Math.ceil((examMs - nowMs) / 86_400_000)),
    examMs,
  };
}

/* ------------------------------------------------------------------ */
/* DRILL SERVING FILTER                                                 */
/* ------------------------------------------------------------------ */

/**
 * A pack whose bank is narrowed for serving (the drill's topic/difficulty
 * choice). Engine math is untouched: replay always runs on the FULL bank;
 * only the selection pool shrinks. When the filter empties the pool the
 * caller sees "none" from the selector and ends the session honestly.
 */
export function filterPack(
  pack: LoadedPack,
  filter: { readonly familyId?: string; readonly difficulty?: "L1" | "L2" | "L3" },
): LoadedPack {
  const { familyId, difficulty } = filter;
  if (familyId === undefined && difficulty === undefined) return pack;
  const bank = new Map(
    [...pack.bank.entries()].filter(([, item]) => {
      if (difficulty !== undefined && item.difficulty_label !== difficulty) return false;
      if (familyId !== undefined) {
        return item.tests.some((n) => n === familyId || n.startsWith(`${familyId}.`));
      }
      return true;
    }),
  );
  return { bank, blueprint: pack.blueprint, marking: pack.marking };
}

/* ------------------------------------------------------------------ */
/* SMALL HELPERS                                                        */
/* ------------------------------------------------------------------ */

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Marks formatting: integers plain, fractions to 2 places ("7", "6.25"). */
export function formatMarks(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(2);
}
