/**
 * CLAIM 5 (DETERMINISM): same inputs give bit-identical outputs; no ordering
 * dependence. Attack: permuted event input order (incl. identical timestamps),
 * Map iteration assumptions, tie-break exhaustiveness in the selector.
 */
import { describe, it, expect } from "vitest";
import { rng } from "./sim.js";
import { replay } from "../src/replay.js";
import { selectNextAction, EMPTY_SESSION, recordServed } from "../src/selector.js";
import type { Bank, BankItem, Blueprint, Event, EngineState } from "../src/types.js";

const BLUEPRINT: Blueprint = {
  parts: [{ id: "p", marks: 100, questions: 100, sections: [{ id: "s", families: [
    { nodeId: "n.a", quota: 30 }, { nodeId: "n.b", quota: 30 }, { nodeId: "n.c", quota: 40 },
  ]}]}],
};

function bank(): Bank {
  const m = new Map<string, BankItem>();
  for (const node of ["n.a", "n.b", "n.c"]) for (let i = 0; i < 4; i++) {
    const id = `${node}#${i}`;
    m.set(id, { id, tests: [node], difficulty_label: (["L1","L2","L3"] as const)[i % 3]!, item_type: "single_best", expected_seconds: 60, verification_status: "verified" });
  }
  return m;
}

function makeEvents(n: number, seed: number, sameTimestamp: boolean): Event[] {
  const r = rng(seed);
  const out: Event[] = [];
  const nodes = ["n.a", "n.b", "n.c"];
  for (let i = 0; i < n; i++) {
    const node = nodes[Math.floor(r() * 3)]!;
    const itemIdx = Math.floor(r() * 4);
    out.push({
      event_id: `e${String(i).padStart(4, "0")}`,
      occurredAtMs: sameTimestamp ? 1_700_000_000_000 : 1_700_000_000_000 + i * 3_600_000,
      item_id: `${node}#${itemIdx}`,
      item_content_hash: "h",
      taxonomy_version: 2,
      tests: [node],
      difficulty_label: (["L1","L2","L3"] as const)[itemIdx % 3]!,
      item_type: "single_best",
      mode: "practice",
      correct: r() < 0.6,
      selected_misconception: r() < 0.3 ? `mc.${node}` : null,
      time_ms: 30000,
      resurfaced: false,
    });
  }
  return out;
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const r = rng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function stateFingerprint(s: EngineState): string {
  const skills = [...s.skills.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}:${v.rating.toFixed(12)},${v.deviation.toFixed(12)},${v.attempts}`).join("|");
  const sched = [...s.schedules.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}:${v.intervalDays},${v.stability.toFixed(6)},${v.difficulty.toFixed(6)},${v.dueAtMs},${v.consecutiveCorrect},${v.lapsed}`).join("|");
  const misc = [...s.misconceptions.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}:${v.map((h) => h.eventId).join(",")}`).join("|");
  return `S[${skills}]C[${sched}]M[${misc}]E${s.eventCount}`;
}

function tenActions(state: EngineState, b: Bank, now: number): string {
  let session = EMPTY_SESSION;
  const ids: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = selectNextAction(state, b, BLUEPRINT, now, 20, session);
    ids.push(`${a.kind}:${a.itemId}:${a.nodeId}`);
    session = recordServed(session, a);
  }
  return ids.join(">");
}

describe("DETERMINISM attacks", () => {
  it("ATTACK V: permuted event order, distinct timestamps -> identical state", () => {
    const events = makeEvents(120, 1, false);
    const b = bank();
    const now = 1_700_000_000_000 + 200 * 86_400_000;
    const base = stateFingerprint(replay(events, b, now));
    for (let k = 0; k < 8; k++) {
      const perm = shuffle(events, 100 + k);
      const fp = stateFingerprint(replay(perm, b, now));
      if (fp !== base) console.log(`[V] MISMATCH perm ${k}`);
      expect(fp).toBe(base);
    }
  });

  it("ATTACK W: IDENTICAL timestamps, permuted order -> identical state (event_id tie-break)", () => {
    const events = makeEvents(80, 2, true); // all same occurredAtMs
    const b = bank();
    const now = 1_700_000_000_000 + 10 * 86_400_000;
    const base = stateFingerprint(replay(events, b, now));
    for (let k = 0; k < 8; k++) {
      const perm = shuffle(events, 500 + k);
      const fp = stateFingerprint(replay(perm, b, now));
      if (fp !== base) console.log(`[W] MISMATCH perm ${k}: base=${base.slice(0,80)} got=${fp.slice(0,80)}`);
      expect(fp).toBe(base);
    }
  });

  it("ATTACK X: selector output is order-independent of bank Map insertion order", () => {
    const events = makeEvents(120, 3, false);
    const now = 1_700_000_000_000 + 200 * 86_400_000;
    const state = replay(events, bank(), now);
    // Build the bank in shuffled insertion orders; selector must not depend on it.
    const entries = [...bank().entries()];
    const base = tenActions(state, bank(), now);
    for (let k = 0; k < 8; k++) {
      const shuffled = new Map(shuffle(entries, 800 + k));
      const got = tenActions(replay(events, shuffled, now), shuffled, now);
      if (got !== base) console.log(`[X] MISMATCH bankperm ${k}:\n base=${base}\n got =${got}`);
      expect(got).toBe(base);
    }
  });

  it("ATTACK Y: selector order-independent of misconception/skill insertion order", () => {
    // Rebuild state with skills/misconceptions inserted in different orders.
    const events = makeEvents(120, 4, false);
    const now = 1_700_000_000_000 + 5 * 86_400_000; // recent so misconceptions are live
    const b = bank();
    const s = replay(events, b, now);
    const base = tenActions(s, b, now);
    for (let k = 0; k < 6; k++) {
      const skills = new Map(shuffle([...s.skills.entries()], 1000 + k));
      const misc = new Map(shuffle([...s.misconceptions.entries()], 2000 + k));
      const reordered: EngineState = { ...s, skills, misconceptions: misc };
      const got = tenActions(reordered, b, now);
      if (got !== base) console.log(`[Y] MISMATCH stateperm ${k}:\n base=${base}\n got =${got}`);
      expect(got).toBe(base);
    }
  });
});
