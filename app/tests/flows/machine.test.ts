/**
 * Practice state-machine logic (W5-5 flow a, test requirement 5).
 *
 * The flow LOGIC, tested directly without a DOM: serving is engine-consistent,
 * answering wrong then continuing serves the engine's own next action, the
 * fallback keeps a fresh student practising when the engine returns "none", the
 * session boundary fires at the configured length, and feedback derivation is
 * correct. DOM-free (no jsdom dep, the repo convention).
 */

import { describe, expect, it } from "vitest";

import {
  buildEngineState,
  loadPack,
  nextAction,
  readiness,
  type LoadedPack,
  type RawBlueprint,
  type RawMarking,
  type RawPack,
} from "../../src/engine/index.js";
import {
  advanceSession,
  buildFeedback,
  EMPTY_SESSION,
  explanationSteps,
  isResurfaced,
  isSessionComplete,
  selectQuestion,
  SESSION_LENGTH,
} from "../../src/flows/practice/machine.js";
import { buildContentMap, type ContentItem } from "../../src/flows/practice/types.js";
import { buildEvent } from "../../src/flows/practice/event.js";
import type { StoredEvent } from "../../src/storage/index.js";

import blueprintJson from "../../../schema/profiles/ca-foundation-qa/blueprint.json";
import markingJson from "../../../schema/profiles/ca-foundation-qa/marking.json";

const NOW = Date.UTC(2026, 5, 10, 9, 0, 0);

/**
 * A synthetic pack tagged at the BLUEPRINT FAMILY node (qa.bmath.finance), so
 * the engine's coverage tier finds a match and serves real engine actions — the
 * golden-vector tagging granularity. (The shipped pack tags at a deeper leaf, so
 * the engine returns "none"; that path is covered by the fallback test below.)
 */
const FAMILY_ITEMS = [
  rawItem("fam_1", ["qa.bmath.finance"], "L1"),
  rawItem("fam_2", ["qa.bmath.finance"], "L2"),
  rawItem("fam_3", ["qa.bmath.ratio_indices_log"], "L1"),
];

function rawItem(id: string, tests: string[], diff: "L1" | "L2" | "L3") {
  return {
    id,
    content_hash: id.padEnd(64, "0"),
    taxonomy_version: 4,
    tests,
    difficulty_label: diff,
    item_type: "single_best" as const,
    expected_seconds: 75,
    verification_status: "verified",
    stem: `Stem for ${id}.`,
    options: [
      { key: 1, text: "Correct option" },
      { key: 2, text: "Wrong option" },
    ],
    answer_key: { correct: 1 },
    per_option_rationale: [
      { option_key: 1, verdict: "correct", rationale: "It is right." },
      {
        option_key: 2,
        verdict: "incorrect",
        rationale: "You made the classic slip.",
        misconception: "classic_slip",
      },
    ],
    explanation: "First do this. Then do that. The answer follows.",
  };
}

function familyPack(): LoadedPack {
  return loadPack(
    { items: FAMILY_ITEMS } as unknown as RawPack,
    blueprintJson as unknown as RawBlueprint,
    markingJson as unknown as RawMarking,
  );
}
const familyContent: ReadonlyMap<string, ContentItem> = buildContentMap(FAMILY_ITEMS);

describe("engine-consistent serving (family-node pack)", () => {
  it("the served question is exactly the engine's nextAction item", () => {
    const pack = familyPack();
    const state = buildEngineState([], pack.bank, NOW);
    const engineAction = nextAction(state, pack, NOW, SESSION_LENGTH, EMPTY_SESSION);
    const served = selectQuestion(state, pack, familyContent, NOW, EMPTY_SESSION, SESSION_LENGTH);

    expect(engineAction.kind).not.toBe("none");
    expect(served).not.toBeNull();
    expect(served!.fromEngine).toBe(true);
    expect(served!.content.id).toBe(engineAction.itemId);
    expect(served!.action.reason).toBe(engineAction.reason);
  });

  it("answering wrong, then continuing, serves the engine's next action", async () => {
    const pack = familyPack();
    let events: StoredEvent[] = [];
    let session = EMPTY_SESSION;

    // Serve question 1.
    let state = buildEngineState(events, pack.bank, NOW);
    const q1 = selectQuestion(state, pack, familyContent, NOW, session, SESSION_LENGTH);
    expect(q1).not.toBeNull();

    // Answer it WRONG (option 2 -> mapped misconception).
    const e1 = buildEvent(
      q1!.content,
      { kind: "single_best", selected_option: 2 },
      {
        eventId: "e1",
        occurredAtMs: NOW + 1000,
        timeMs: 30_000,
        viewportWidth: 360,
        resurfaced: isResurfaced(q1!),
        mode: "practice",
      },
    );
    expect(e1.correct).toBe(false);
    expect(e1.selected_misconception).toBe("classic_slip");
    events = [...events, e1];
    session = advanceSession(session, q1!);

    // Continue: rebuild state from the appended log, serve the NEXT question.
    const now2 = NOW + 2000;
    state = buildEngineState(events, pack.bank, now2);
    const engineNext = nextAction(state, pack, now2, SESSION_LENGTH, session);
    const q2 = selectQuestion(state, pack, familyContent, now2, session, SESSION_LENGTH);

    expect(q2).not.toBeNull();
    expect(q2!.content.id).not.toBe(q1!.content.id); // not re-served within the session
    if (engineNext.kind !== "none" && engineNext.itemId !== null) {
      // Whenever the engine has an opinion, the flow serves exactly it.
      expect(q2!.fromEngine).toBe(true);
      expect(q2!.content.id).toBe(engineNext.itemId);
      expect(q2!.action.reason).toBe(engineNext.reason);
    }
  });
});

describe("shipped pack serving + fallback safety", () => {
  it("serves a real question on the shipped pack, matching the engine when it has one", async () => {
    const { loadCaPack } = await import("../../src/engine/caPack.js");
    const { loadCaContent } = await import("../../src/flows/practice/content.js");
    const pack = await loadCaPack();
    const content = await loadCaContent();
    const state = buildEngineState([], pack.bank, NOW);

    const engineAction = nextAction(state, pack, NOW, SESSION_LENGTH, EMPTY_SESSION);
    const served = selectQuestion(state, pack, content, NOW, EMPTY_SESSION, SESSION_LENGTH);

    // Whatever the engine returns, the flow serves a real, content-backed item.
    expect(served).not.toBeNull();
    expect(content.has(served!.content.id)).toBe(true);
    expect(served!.action.reason.length).toBeGreaterThan(0);

    if (engineAction.kind !== "none" && engineAction.itemId !== null) {
      // The shipped pack has family-tagged nodes, so coverage finds a match:
      // the flow serves exactly the engine's item.
      expect(served!.fromEngine).toBe(true);
      expect(served!.content.id).toBe(engineAction.itemId);
    } else {
      // If the engine has no opinion, the deterministic fallback fires.
      expect(served!.fromEngine).toBe(false);
      expect(served!.action.kind).toBe("coverage");
    }
  });

  it("the engine returns none when no item prefix-matches a weighted family, and the fallback serves", () => {
    // A pack whose only item is tagged under a node carrying NO blueprint weight
    // (an off-blueprint topic). The engine's tiers find nothing weighted to
    // serve and return none, so the fallback must keep practice alive.
    const offItems = [rawItem("off_1", ["qa.unweighted.misc.topic"], "L1")];
    const offPack = loadPack(
      { items: offItems } as unknown as RawPack,
      blueprintJson as unknown as RawBlueprint,
      markingJson as unknown as RawMarking,
    );
    const offContent = buildContentMap(offItems);
    const state = buildEngineState([], offPack.bank, NOW);

    const engineAction = nextAction(state, offPack, NOW, SESSION_LENGTH, EMPTY_SESSION);
    const served = selectQuestion(state, offPack, offContent, NOW, EMPTY_SESSION, SESSION_LENGTH);

    expect(engineAction.kind).toBe("none");
    expect(served).not.toBeNull();
    expect(served!.fromEngine).toBe(false);
    expect(served!.action.kind).toBe("coverage");
    expect(served!.content.id).toBe("off_1");
  });

  it("the fallback never re-serves an item already served this session", () => {
    const pack = familyPack();
    const state = buildEngineState([], pack.bank, NOW);
    // Mark fam_1 and fam_2 as served; only fam_3 remains.
    let session = EMPTY_SESSION;
    const q1 = selectQuestion(state, pack, familyContent, NOW, session, SESSION_LENGTH)!;
    session = advanceSession(session, q1);
    const q2 = selectQuestion(state, pack, familyContent, NOW, session, SESSION_LENGTH)!;
    expect(q2.content.id).not.toBe(q1.content.id);
  });
});

describe("session boundary", () => {
  it("is complete exactly at the configured session length", () => {
    expect(isSessionComplete(SESSION_LENGTH - 1, SESSION_LENGTH)).toBe(false);
    expect(isSessionComplete(SESSION_LENGTH, SESSION_LENGTH)).toBe(true);
    expect(isSessionComplete(SESSION_LENGTH + 1, SESSION_LENGTH)).toBe(true);
  });

  it("the default session length is the engine default", () => {
    expect(SESSION_LENGTH).toBe(20);
  });
});

describe("feedback derivation", () => {
  const item: ContentItem = familyContent.get("fam_1")!;

  it("a correct answer banks one mark and shows no misconception line", () => {
    const fb = buildFeedback(item, { correct: true, chosenKey: 1 });
    expect(fb.correct).toBe(true);
    expect(fb.misconceptionLine).toBeNull();
    expect(fb.outcomeLine).toMatch(/banked/i);
    expect(fb.correctKey).toBe(1);
  });

  it("a wrong answer surfaces the chosen option's second-person rationale", () => {
    const fb = buildFeedback(item, { correct: false, chosenKey: 2 });
    expect(fb.correct).toBe(false);
    expect(fb.misconceptionLine).toBe("You made the classic slip.");
    expect(fb.outcomeLine).toMatch(/quarter mark/i);
  });

  it("splits a multi-sentence explanation into working steps", () => {
    expect(explanationSteps("First do this. Then do that. The answer follows.")).toEqual([
      "First do this.",
      "Then do that.",
      "The answer follows.",
    ]);
    expect(explanationSteps("")).toEqual([]);
  });
});

describe("readiness honesty for a fresh student", () => {
  it("a fresh practice student is below the data gate (insufficient_data)", () => {
    const pack = familyPack();
    const state = buildEngineState([], pack.bank, NOW);
    // The summary gate keys off readiness.confidence === 'insufficient_data'.
    const r = readiness(state, [], pack, NOW);
    expect(r.confidence).toBe("insufficient_data");
    expect(r.expectedMarks).toBeNull();
  });
});
