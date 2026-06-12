/**
 * SyllabusFlow — the whole-paper coverage map (design scr-diagnosis.jsx:160-203).
 *
 * Coverage ONLY: touched / in progress / mastered / not started. Mastery
 * numbers live solely in Diagnosis — no duplicated bars (Handout addendum,
 * honesty refinements). 18 chapters in 3 parts, from the blueprint; the
 * FOCUS chip marks the chapter losing the most marks.
 */

import { useEffect, useState } from "react";

import { Chip, ScreenHead } from "../../components/ui.js";
import { loadAppSnapshot } from "../../state/appData.js";
import {
  syllabusCoverage,
  weakestFamily,
  COVERAGE_LABEL,
  type SyllabusPart,
  type Coverage,
} from "../../engine/insights.js";

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | { readonly kind: "ready"; readonly parts: readonly SyllabusPart[] };

const ORDER: readonly Coverage[] = ["mastered", "progressing", "touched", "untouched"];

export function SyllabusFlow(): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void loadAppSnapshot()
      .then((snap) => {
        if (cancelled) return;
        const focus = weakestFamily(snap.costs, snap.topicNames);
        const parts = syllabusCoverage(
          snap.engineState,
          snap.pack,
          snap.topicNames,
          snap.topicNames,
          snap.leavesByFamily,
          focus?.id ?? null,
          Date.now(),
        );
        setPhase({ kind: "ready", parts });
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
        <div className="screen__scroll"><div className="screen__pad">
          <p className="screen__lede">Loading syllabus</p>
        </div></div>
      </main>
    );
  }

  if (phase.kind === "error") {
    return (
      <main className="screen"><div className="screen__scroll"><div className="screen__pad">
        <ScreenHead
          title="The syllabus could not load"
          lede="Your data is on this device and nothing was lost. Reload the page to try again."
        />
      </div></div></main>
    );
  }

  const parts = phase.parts;
  const all = parts.flatMap((p) => p.chapters);
  const touched = all.filter((c) => c.coverage !== "untouched").length;
  const counts = new Map<Coverage, number>();
  for (const c of all) counts.set(c.coverage, (counts.get(c.coverage) ?? 0) + 1);

  return (
    <main className="screen"><div className="screen__scroll"><div className="screen__pad">
      <ScreenHead
        eyebrow="Paper 3 · Quantitative Aptitude"
        eyebrowIcon="book"
        title="The whole paper, and where you stand"
        lede={
          touched === 0
            ? "The full ICAI Paper 3 syllabus. Nothing is touched yet — this map fills in as you practise and sit mocks."
            : `${touched} of ${all.length} chapters touched. Coverage only — mastery lives in Diagnosis.`
        }
      />

      {touched > 0 && (
        <div className="syl-legend" style={{ marginBottom: "var(--space-6)" }}>
          {ORDER.map((cov) => (
            <span className="syl-leg" key={cov}>
              <span className={`syl-row__dot syl-row__dot--${cov}`} />
              {COVERAGE_LABEL[cov]}&nbsp;<span className="mono">{counts.get(cov) ?? 0}</span>
            </span>
          ))}
        </div>
      )}

      {parts.map((part) => (
        <div className="syl-part" key={part.id}>
          <div className="syl-part__head">
            <span className="syl-part__name">{part.name}</span>
            <span className="syl-part__meta">{part.marks} marks · {part.chapters.length} chapters</span>
          </div>
          {part.chapters.map((ch) => (
            <div className="syl-row" key={ch.id}>
              <span className={`syl-row__dot syl-row__dot--${ch.coverage}`} />
              <div>
                <div className="syl-row__name">
                  {ch.name}{" "}
                  {ch.focus && <Chip kind="focus">Focus</Chip>}
                </div>
                <div className="syl-row__sub">
                  {ch.leaves} subtopics
                  {ch.coverage === "touched" && ` · ${ch.attempts} attempts`}
                </div>
              </div>
              <span className="syl-row__status">{COVERAGE_LABEL[ch.coverage]}</span>
            </div>
          ))}
        </div>
      ))}
    </div></div></main>
  );
}
