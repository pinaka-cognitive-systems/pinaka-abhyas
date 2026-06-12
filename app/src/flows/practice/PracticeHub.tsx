/**
 * PracticeHub — the railed practice setup screen (design scr-practice.jsx:24-123).
 *
 * Two halves: Review (system-chosen, spaced — "Pinaka chooses these") and
 * Drill (self-chosen topic, difficulty, length, method). Start drill persists
 * choices to sessionStorage key "drill_setup_v1", then navigates to #/drill.
 *
 * Topic mastery: rolls up per-family skill p-values from snapshot.engineState
 * using masteryProbability + skillsAsOf from @pinaka/engine, rounded to whole %.
 * Families below threshold (< 12 attempts = "touched") show "—", never a
 * fabricated number.
 */

import { useEffect, useState } from "react";

import { Icon, ScreenHead } from "../../components/ui.js";
import { navigate } from "../../components/navigate.js";
import { loadAppSnapshot } from "../../state/appData.js";
import {
  blueprintFamilies,
  COVERAGE_THRESHOLD,
  familyOf,
  fallbackName,
} from "../../engine/insights.js";
import { masteryProbability, skillsAsOf } from "@pinaka/engine";
import type { AppSnapshot } from "../../state/appData.js";

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */

export interface DrillSetup {
  /** familyId | "weakest" */
  readonly topic: string;
  readonly difficulty: "adaptive" | "L1" | "L2" | "L3";
  readonly count: 5 | 10 | 20;
  readonly solveFirst: boolean;
  readonly confidence: boolean;
}

export const DRILL_SETUP_KEY = "drill_setup_v1";

function persistSetup(s: DrillSetup): void {
  try {
    sessionStorage.setItem(DRILL_SETUP_KEY, JSON.stringify(s));
  } catch {
    // sessionStorage unavailable in some environments; silently continue.
  }
}

/* ------------------------------------------------------------------ */
/* Topic list derivation                                                 */
/* ------------------------------------------------------------------ */

interface TopicOption {
  readonly id: string;
  readonly name: string;
  /** Whole-number mastery %, or null when below threshold. */
  readonly mastery: number | null;
  /** Display string for pick__meta. */
  readonly meta: string;
}

/**
 * Build the top-5 topic options ranked by marks lost, each with a mastery %
 * rolled up from per-family skill p-values. Families with fewer than
 * COVERAGE_THRESHOLD attempts show "—" for mastery.
 */
function buildTopics(snap: AppSnapshot): TopicOption[] {
  const familyIds = blueprintFamilies(snap.pack);
  const skills = skillsAsOf(snap.engineState, Date.now());

  // Per-family: sum mastery p and count nodes with attempts.
  const familyP = new Map<string, { sum: number; count: number; attempts: number }>();
  for (const [nodeId, skill] of skills) {
    if (skill.attempts === 0) continue;
    const fam = familyOf(nodeId, familyIds);
    let a = familyP.get(fam);
    if (a === undefined) {
      a = { sum: 0, count: 0, attempts: 0 };
      familyP.set(fam, a);
    }
    a.sum += masteryProbability(skill).p;
    a.count += 1;
    a.attempts += skill.attempts;
  }

  // Collect families that appear in costs (marks-lost ranked).
  const costFamilies = new Set<string>();
  const familyCost = new Map<string, number>();
  for (const c of snap.costs) {
    for (const f of c.families) {
      costFamilies.add(f);
      familyCost.set(f, (familyCost.get(f) ?? 0) + c.marksLost);
    }
  }

  // Rank by marks lost descending, take up to 5.
  const ranked = [...costFamilies]
    .sort((a, b) => (familyCost.get(b) ?? 0) - (familyCost.get(a) ?? 0))
    .slice(0, 5);

  return ranked.map((fam) => {
    const a = familyP.get(fam);
    let mastery: number | null = null;
    if (a !== undefined && a.attempts >= COVERAGE_THRESHOLD && a.count > 0) {
      mastery = Math.round((a.sum / a.count) * 100);
    }
    const name = snap.topicNames.get(fam) ?? fallbackName(fam);
    return {
      id: fam,
      name,
      mastery,
      meta: mastery !== null ? `${mastery}%` : "—",
    };
  });
}

/* ------------------------------------------------------------------ */
/* Hub component                                                         */
/* ------------------------------------------------------------------ */

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | { readonly kind: "ready"; readonly snap: AppSnapshot };

export function PracticeHub(): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  // Drill setup state.
  const [topic, setTopic] = useState<string>("weakest");
  const [diff, setDiff] = useState<"adaptive" | "L1" | "L2" | "L3">("adaptive");
  const [count, setCount] = useState<5 | 10 | 20>(10);
  const [solveFirst, setSolveFirst] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<boolean>(true);
  const [showOpts, setShowOpts] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    void loadAppSnapshot()
      .then((snap) => {
        if (!cancelled) setPhase({ kind: "ready", snap });
      })
      .catch(() => {
        if (!cancelled) setPhase({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.kind === "loading") {
    return (
      <main className="screen" aria-busy="true">
        <div className="screen__scroll">
          <div className="screen__pad">
            <p className="screen__lede">Loading practice</p>
          </div>
        </div>
      </main>
    );
  }

  if (phase.kind === "error") {
    return (
      <main className="screen">
        <div className="screen__scroll">
          <div className="screen__pad">
            <ScreenHead
              title="Practice could not load"
              lede="Your data is on this device and nothing was lost. Reload the page to try again."
            />
          </div>
        </div>
      </main>
    );
  }

  const snap = phase.snap;
  const due = snap.queue.due;
  const dueCount = due.length;
  const topicOptions: TopicOption[] = buildTopics(snap);

  const allTopics = [
    { id: "weakest", name: "Weakest first", meta: "recommended" },
    ...topicOptions.map((t) => ({ id: t.id, name: t.name, meta: t.meta })),
  ];

  function startDrill(): void {
    persistSetup({ topic, difficulty: diff, count, solveFirst, confidence });
    navigate("drill");
  }

  return (
    <main className="screen">
      <div className="screen__scroll">
        <div className="screen__pad">
          <ScreenHead
            title="Practice"
            lede="Two ways to work. Review is chosen for you from your own mistakes. Drills are yours to choose. Both feed the same diagnosis."
          />

          <div className="stack-6">
            {/* ---- Review half ---- */}
            <section className="hub-block">
              <div className="hub-block__head">
                <div>
                  <div className="hub-block__eyebrow">
                    <Icon name="repeat" size={13} />
                    Review · recommended for you
                  </div>
                  <h2 className="hub-block__title">
                    {dueCount > 0 ? `${dueCount} due today` : "Nothing due today"}
                  </h2>
                </div>
                <span className="hub-tag hub-tag--auto">Pinaka chooses these</span>
              </div>
              {dueCount > 0 ? (
                <>
                  <p className="hub-block__lede">
                    Past mistakes, resurfaced on a spaced schedule based on what you have gotten
                    wrong and when. The cheapest marks you will find, because you have seen them
                    before.
                  </p>
                  <div className="hub-due">
                    {due.slice(0, 3).map((r) => (
                      <div className="hub-due__row" key={r.itemId}>
                        <span className="hub-due__dot" />
                        <span className="hub-due__topic">{r.topic}</span>
                        <span className="hub-due__mis">{r.mis ?? ""}</span>
                        <span className="hub-due__why">{r.reason}</span>
                      </div>
                    ))}
                    {dueCount > 3 && (
                      <div className="hub-due__more">+ {dueCount - 3} more</div>
                    )}
                  </div>
                  <div className="btn-row" style={{ marginTop: "var(--space-4)" }}>
                    <button
                      className="sa-btn sa-btn--primary"
                      type="button"
                      onClick={() => navigate("drill")}
                    >
                      Start review<Icon name="arrow-right" size={15} />
                    </button>
                    <button
                      className="sa-btn sa-btn--ghost"
                      type="button"
                      onClick={() => navigate("review")}
                    >
                      See the full queue
                    </button>
                  </div>
                </>
              ) : (
                <p className="caveat" style={{ marginTop: "var(--space-2)" }}>
                  <Icon name="check" size={13} />
                  You are clear. Past mistakes return here when they are due, not before.
                </p>
              )}
            </section>

            {/* ---- Drill half ---- */}
            <section className="hub-block" style={{ marginTop: "var(--space-6)" }}>
              <div className="hub-block__head">
                <div>
                  <div className="hub-block__eyebrow">
                    <Icon name="crosshair" size={13} />
                    Drill · your choice
                  </div>
                  <h2 className="hub-block__title">Drill a topic</h2>
                </div>
                <span className="hub-tag">You choose</span>
              </div>
              <p className="hub-block__lede">
                Fresh questions on a topic you pick. New material, not resurfaced. Use this to
                build a weak area before it shows up in a mock.
              </p>

              <div className="opt-grp__label" style={{ marginTop: "var(--space-4)" }}>
                Topic
              </div>
              <div className="opt-pick">
                {allTopics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`pick${topic === t.id ? " is-sel" : ""}`}
                    onClick={() => setTopic(t.id)}
                  >
                    <span className="pick__radio" />
                    <span className="pick__name">{t.name}</span>
                    <span className="pick__meta">{t.meta}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="hub-opts-toggle"
                onClick={() => setShowOpts((v) => !v)}
              >
                <Icon name={showOpts ? "chevron-down" : "chevron-right"} size={15} />
                {showOpts ? "Hide options" : "Difficulty, length, method"}
              </button>

              {showOpts && (
                <div className="hub-opts">
                  <div className="opt-grp">
                    <div className="opt-grp__label">Difficulty</div>
                    <div className="seg">
                      {(["adaptive", "L1", "L2", "L3"] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={diff === d ? "is-on" : ""}
                          onClick={() => setDiff(d)}
                        >
                          {d === "adaptive" ? "Adaptive" : d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="opt-grp">
                    <div className="opt-grp__label">Questions</div>
                    <div className="seg">
                      {([5, 10, 20] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={count === c ? "is-on" : ""}
                          onClick={() => setCount(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sa-card" style={{ padding: "var(--space-4) var(--space-5)" }}>
                    <div className="set-row" style={{ padding: "var(--space-2) 0" }}>
                      <div>
                        <div
                          className="set-row__title"
                          style={{ fontSize: "var(--text-sm)" }}
                        >
                          Solve before options
                        </div>
                        <div className="set-row__detail" style={{ fontSize: 12, marginTop: 2 }}>
                          Hide the four options until you commit to an answer.
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`toggle${solveFirst ? " is-on" : ""}`}
                        role="switch"
                        aria-checked={solveFirst}
                        onClick={() => setSolveFirst((v) => !v)}
                      >
                        <span className="toggle__thumb" />
                      </button>
                    </div>
                    <div
                      className="set-row"
                      style={{ padding: "var(--space-2) 0", borderBottom: "none" }}
                    >
                      <div>
                        <div
                          className="set-row__title"
                          style={{ fontSize: "var(--text-sm)" }}
                        >
                          Confidence check
                        </div>
                        <div className="set-row__detail" style={{ fontSize: 12, marginTop: 2 }}>
                          One question at the end, not every question. Read against your score, it
                          shows over- or under-confidence.
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`toggle${confidence ? " is-on" : ""}`}
                        role="switch"
                        aria-checked={confidence}
                        onClick={() => setConfidence((v) => !v)}
                      >
                        <span className="toggle__thumb" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* On its own row: the prototype renders this inline with the
                  options toggle and the two collide — a canvas defect fixed
                  here (recorded in as-built). */}
              <div className="btn-row" style={{ marginTop: "var(--space-4)" }}>
                <button
                  type="button"
                  className="sa-btn sa-btn--secondary"
                  onClick={startDrill}
                >
                  Start drill<Icon name="arrow-right" size={15} />
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
