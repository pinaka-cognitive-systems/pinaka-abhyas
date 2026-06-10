/**
 * CLAIM 3 deep probe: "reviews never starve coverage or remediation; every
 * blueprint family gets practice." The review BUDGET is capped at 50%, but
 * REMEDIATION is uncapped and outranks everything. Can a student with chronic
 * recurring misconceptions on already-seen nodes be permanently starved of
 * coverage on an UNSEEN, weighted family?
 *
 * Design: nodes n.a, n.b have items that always trigger a misconception when
 * wrong; the student keeps getting them wrong (low ability). Node n.d has never
 * been touched. Each session, does coverage of n.d EVER get a turn?
 */
import { describe, it, expect } from "vitest";
import { rng } from "./sim.js";
import { replay } from "../src/replay.js";
import { selectNextAction, recordServed, EMPTY_SESSION, type SessionProgress } from "../src/selector.js";
import type { Bank, BankItem, Blueprint, Event, EngineState } from "../src/types.js";

const MS_PER_DAY = 86_400_000;
const T0 = 1_700_000_000_000;

const BLUEPRINT: Blueprint = {
  parts: [{ id: "p", marks: 100, questions: 100, sections: [{ id: "s", families: [
    { nodeId: "n.a", quota: 25 }, { nodeId: "n.b", quota: 25 },
    { nodeId: "n.c", quota: 25 }, { nodeId: "n.d", quota: 25 },
  ]}]}],
};
const NODES = ["n.a", "n.b", "n.c", "n.d"];

function makeBank(): Bank {
  const m = new Map<string, BankItem>();
  for (const node of NODES) for (let i = 0; i < 6; i++) {
    const id = `${node}#${String(i).padStart(2, "0")}`;
    m.set(id, { id, tests: [node], difficulty_label: (["L1","L2","L3"] as const)[i % 3]!, item_type: "single_best", expected_seconds: 60, verification_status: "verified", targets_misconceptions: [`mc.${node}`] });
  }
  return m;
}

describe("REMEDIATION starvation probe", () => {
  it("ATTACK EE: chronic misconceptions on n.a/n.b — does n.d coverage ever get served?", () => {
    const b = makeBank();
    const r = rng(77);
    let events: Event[] = [];
    // Seed: build recurring misconceptions on n.a and n.b (wrong + misconception),
    // keep them RECENT every day so the 14-day window never lapses.
    let dNdServed = 0;
    let totalRemediate = 0, totalCoverage = 0;
    for (let day = 0; day < 20; day++) {
      const now = T0 + day * MS_PER_DAY;
      let session: SessionProgress = EMPTY_SESSION;
      for (let i = 0; i < 20; i++) {
        const state = replay(events, b, now);
        const action = selectNextAction(state, b, BLUEPRINT, now, 20, session);
        if (action.kind === "remediate") totalRemediate++;
        if (action.kind === "coverage") { totalCoverage++; if (action.nodeId === "n.d") dNdServed++; }
        if (action.itemId !== null) {
          const item = b.get(action.itemId)!;
          const node = item.tests[0]!;
          // n.a and n.b: always wrong + misconception (chronic). Others: correct.
          const chronic = node === "n.a" || node === "n.b";
          events.push({
            event_id: `d${day}_${i}`, occurredAtMs: now + i * 60_000, item_id: action.itemId,
            item_content_hash: "h", taxonomy_version: 2, tests: item.tests,
            difficulty_label: item.difficulty_label, item_type: "single_best",
            mode: action.kind === "review" ? "review" : "practice",
            correct: !chronic, selected_misconception: chronic ? `mc.${node}` : null,
            time_ms: 30000, resurfaced: false,
          });
        }
        session = recordServed(session, action);
      }
    }
    console.log(`[EE] over 20 days x20: totalRemediate=${totalRemediate} totalCoverage=${totalCoverage} n.d-coverage-served=${dNdServed}`);
    // The claim is "every blueprint family gets practice". n.d must be served
    // at least once across 400 picks. If 0, coverage is STARVED by remediation.
    expect(dNdServed).toBeGreaterThan(0);
  });
});
