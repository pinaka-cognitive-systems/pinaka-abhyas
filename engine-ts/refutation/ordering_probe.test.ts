/**
 * Probe for ATTACK H: isolate whether the order-dependence is idle drift or the
 * precision-shrink recency effect. Same outcome multiset, two orders, with
 * (a) realistic 1-day spacing and (b) zero time gap (drift removed).
 */
import { describe, it } from "vitest";
import { updateSkill, type SkillState } from "../src/mastery.js";
import { sigmoid } from "../src/scale.js";

const obs = (correct: boolean, t: number) => ({
  correct, difficultyLabel: "L2" as const, itemType: "single_best" as const, occurredAtMs: t,
});

function run(order: boolean[], spacingMs: number): SkillState {
  let s: SkillState = { rating: 0, deviation: 1.5, lastEventMs: 0, attempts: 0 };
  let t = 0;
  for (const c of order) {
    t += spacingMs;
    s = updateSkill(s, obs(c, t));
  }
  return s;
}

describe("ORDERING probe", () => {
  it("same multiset, drift on vs off", () => {
    const wThenR = [...Array(40).fill(false), ...Array(60).fill(true)];
    const rThenW = [...Array(60).fill(true), ...Array(40).fill(false)];
    const MS_PER_DAY = 86_400_000;
    for (const [name, spacing] of [["1-day spacing (drift on)", MS_PER_DAY], ["zero gap (drift off)", 0]] as const) {
      const a = run(wThenR, spacing);
      const b = run(rThenW, spacing);
      console.log(`[${name}] WthenR r=${a.rating.toFixed(4)} | RthenW r=${b.rating.toFixed(4)} | ratingGap=${Math.abs(a.rating - b.rating).toFixed(4)} | probGap=${Math.abs(sigmoid(a.rating) - sigmoid(b.rating)).toFixed(4)}`);
    }
    // Also: the maximum-likelihood estimate for 60/100 on an L2 single_best.
    // P_obs=0.6, c=0.25 => sigmoid(theta)=(0.6-0.25)/0.75=0.4667 => theta=logit(0.4667).
    const mle = Math.log(0.4667 / (1 - 0.4667));
    console.log(`[reference] MLE rating for 60/100 = ${mle.toFixed(4)}`);
  });
});
