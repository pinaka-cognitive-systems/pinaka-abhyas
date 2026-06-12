/**
 * MockReview — question-by-question, triage-first walkthrough
 * (design scr-review-mock.jsx, transcribed).
 *
 * Anatomy: 48px fb-context bar (Breakdown back, "{Mock NN} · review · net N",
 * X close), the six-filter pill row, then rv-body: a 300px navigator and the
 * detail split (question column + 360px rv-diag panel). The diagnosis panel
 * leads with the speed x correctness verdict (insights.timeVerdict, cutoffs
 * declared provisional), names the misconception behind a wrong answer, shows
 * the working with the key step ringed, and states when the item is queued
 * back into Review.
 *
 * Read-only: the mock is already scored; nothing here writes to storage.
 * Keyboard: ArrowUp/Down and j/k move through the filtered list.
 */

import { useCallback, useEffect, useState } from "react";

import { Icon } from "../../components/ui.js";
import { navigate } from "../../components/navigate.js";
import { loadAppSnapshot } from "../../state/appData.js";
import {
  timeVerdict,
  fallbackName,
  PACE_CAVEAT,
  type TimeVerdict,
} from "../../engine/insights.js";
import type { ContentItem } from "../practice/types.js";
import type { MockSession } from "./state.js";
import type { MockScore } from "./scoring.js";
import {
  applyFilter,
  buildFilterCounts,
  buildReviewEntries,
  type FilterCounts,
  type ReviewEntry,
  type ReviewFilterId,
} from "./reviewFilter.js";

/* ------------------------------------------------------------------ */
/* Props                                                                */
/* ------------------------------------------------------------------ */

export interface MockReviewProps {
  readonly session: MockSession;
  readonly score: MockScore;
  readonly content: ReadonlyMap<string, ContentItem>;
  /** "Mock 03" — the device-numbered name of this mock. */
  readonly mockLabel?: string;
  readonly onBack: () => void;
  readonly onExit: () => void;
}

/* ------------------------------------------------------------------ */
/* Display helpers (design scr-review-mock.jsx:5-23)                    */
/* ------------------------------------------------------------------ */

const OUTCOME_DOT: Record<ReviewEntry["outcome"], string> = {
  correct: "var(--color-success)",
  wrong: "var(--color-danger)",
  skipped: "var(--color-border-strong)",
};

const FILTER_TABS: readonly { readonly id: ReviewFilterId; readonly label: string }[] = [
  { id: "toReview", label: "To review" },
  { id: "wrong",    label: "Wrong" },
  { id: "skipped",  label: "Skipped" },
  { id: "correct",  label: "Correct" },
  { id: "marked",   label: "Marked" },
  { id: "all",      label: "All" },
];

/** "2m 1s" / "38s" / em-dash for no data (design fmtTime). */
function fmtTime(timeMs: number): string {
  const s = Math.round(timeMs / 1000);
  if (s <= 0) return "—";
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return m > 0 ? `${m}m ${ss}s` : `${ss}s`;
}

const LETTERS = ["A", "B", "C", "D", "E"] as const;

function letterFor(key: number | null): string {
  if (key === null) return "—";
  return LETTERS[key - 1] ?? String(key);
}

/** "Business Mathematics" -> "Business Maths" in the navigator (design). */
function shortPart(name: string): string {
  return name === "Business Mathematics" ? "Business Maths" : name;
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function MockReview({
  session,
  score,
  content,
  mockLabel,
  onBack,
  onExit,
}: MockReviewProps): JSX.Element {
  const allEntries = buildReviewEntries(session, score, content);
  const counts: FilterCounts = buildFilterCounts(allEntries);

  const [filterId, setFilterId] = useState<ReviewFilterId>("toReview");
  const filtered = applyFilter(allEntries, filterId);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    () => filtered[0]?.itemId ?? null,
  );

  // Part names + review-queue intervals come from the shared snapshot.
  const [partNames, setPartNames] = useState<ReadonlyMap<string, string> | null>(null);
  const [misNames, setMisNames] = useState<ReadonlyMap<string, string> | null>(null);
  const [queueDays, setQueueDays] = useState<ReadonlyMap<string, number> | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadAppSnapshot()
      .then((snap) => {
        if (cancelled) return;
        setPartNames(snap.topicNames);
        setMisNames(snap.misNames);
        const days = new Map<string, number>();
        const nowMs = Date.now();
        for (const [itemId, s] of snap.engineState.schedules) {
          days.set(itemId, Math.max(1, Math.round((s.dueAtMs - nowMs) / 86_400_000)));
        }
        setQueueDays(days);
      })
      .catch(() => undefined); // panel extras degrade silently
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep selection valid when the filter changes.
  useEffect(() => {
    if (selectedItemId === null || !filtered.some((e) => e.itemId === selectedItemId)) {
      setSelectedItemId(filtered[0]?.itemId ?? null);
    }
    // Mirror of the design effect: the selection reset is filter-driven only.
  }, [filterId]);

  // Keyboard: up/down and j/k through the filtered list.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (!["ArrowDown", "ArrowUp", "j", "k"].includes(e.key)) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      e.preventDefault();
      const idx = filtered.findIndex((x) => x.itemId === selectedItemId);
      if (e.key === "ArrowDown" || e.key === "j") {
        const next = filtered[Math.min(filtered.length - 1, idx + 1)];
        if (next) setSelectedItemId(next.itemId);
      } else {
        const prev = filtered[Math.max(0, idx - 1)];
        if (prev) setSelectedItemId(prev.itemId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, selectedItemId]);

  const selectEntry = useCallback((itemId: string) => setSelectedItemId(itemId), []);

  const entry = selectedItemId !== null
    ? (allEntries.find((e) => e.itemId === selectedItemId) ?? null)
    : null;

  const partNameFor = (e: ReviewEntry): string => {
    const node = content.get(e.itemId)?.tests[0];
    if (node === undefined) return "";
    const part = node.split(".").slice(0, 2).join(".");
    return partNames?.get(part) ?? fallbackName(part);
  };

  return (
    // Full-window frame: the page never scrolls; the navigator and the two
    // detail panes scroll internally (design scr-review-mock layout).
    <main
      className="screen flow-screen"
      style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}
    >
      {/* Context bar */}
      <div className="fb-context" style={{ height: 48 }}>
        <div className="fb-context__left">
          <button
            className="sa-btn sa-btn--ghost"
            style={{ fontSize: 13, paddingLeft: 0 }}
            type="button"
            onClick={onBack}
          >
            <Icon name="arrow-left" size={14} />Breakdown
          </button>
          <span className="eyebrow">
            {mockLabel ?? "Mock"} · review · net <span className="mono">{score.net.toFixed(2)}</span>
          </span>
        </div>
        <div className="fb-context__right">
          <button className="win__ctrl" type="button" aria-label="Close review" onClick={onExit}>
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="rv-filters" role="tablist" aria-label="Question filter">
        {FILTER_TABS.map((f) => (
          <button
            key={f.id}
            className={`rv-filter ${filterId === f.id ? "is-on" : ""}`}
            type="button"
            role="tab"
            aria-selected={filterId === f.id}
            onClick={() => setFilterId(f.id)}
          >
            {f.label}
            <span className="rv-filter__n">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <div className="rv-body">
        {/* Navigator */}
        <aside className="rv-nav" aria-label="Questions">
          {filtered.length === 0 && (
            <div className="empty-note" style={{ margin: "var(--space-4)" }}>
              <div className="empty-note__text">Nothing in this filter.</div>
            </div>
          )}
          {filtered.map((e) => (
            <button
              key={e.itemId}
              className={`rv-item ${selectedItemId === e.itemId ? "is-sel" : ""}`}
              type="button"
              aria-current={selectedItemId === e.itemId ? "true" : undefined}
              onClick={() => selectEntry(e.itemId)}
            >
              <span className="rv-item__dot" style={{ background: OUTCOME_DOT[e.outcome] }} />
              <span className="rv-item__n mono">{e.num}</span>
              <span className="rv-item__body">
                <span className="rv-item__top">
                  {shortPart(partNameFor(e))}
                  {e.marked && (
                    <Icon name="flag" size={11} style={{ color: "var(--color-warning)", marginLeft: 4 }} />
                  )}
                </span>
                <span className="rv-item__sub">
                  {e.outcome === "skipped" ? (
                    "skipped"
                  ) : (
                    <>
                      you <b className={e.outcome === "wrong" ? "rv-x" : "rv-ok"}>{letterFor(e.yourPick)}</b>
                      {e.outcome === "wrong" && (
                        <> · ans <b className="rv-ok">{letterFor(e.correctKey)}</b></>
                      )}
                    </>
                  )}{" "}
                  · {fmtTime(e.timeMs)}
                </span>
              </span>
            </button>
          ))}
        </aside>

        {/* Detail */}
        {entry !== null && (
          <ReviewDetail
            key={entry.itemId}
            entry={entry}
            item={content.get(entry.itemId)}
            partName={partNameFor(entry)}
            total={session.order.length}
            misNames={misNames}
            queueDays={queueDays?.get(entry.itemId) ?? null}
          />
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Detail split: question column + the 360px diagnosis panel            */
/* ------------------------------------------------------------------ */

function ReviewDetail({
  entry,
  item,
  partName,
  total,
  misNames,
  queueDays,
}: {
  readonly entry: ReviewEntry;
  readonly item: ContentItem | undefined;
  readonly partName: string;
  readonly total: number;
  readonly misNames: ReadonlyMap<string, string> | null;
  readonly queueDays: number | null;
}): JSX.Element {
  const v: TimeVerdict = timeVerdict(entry.outcome, entry.timeMs / 1000);

  // The misconception behind the chosen wrong option, with its rationale line.
  const chosenRationale =
    entry.outcome === "wrong" && item !== undefined && entry.yourPick !== null
      ? item.per_option_rationale.find((r) => r.option_key === entry.yourPick)
      : undefined;
  const misId = chosenRationale?.misconception ?? null;
  const misName =
    misId !== null ? (misNames?.get(misId) ?? fallbackName(misId)) : null;

  // Working steps: structured explanation when present, else sentences.
  const steps: readonly { readonly body: string; readonly key: boolean }[] =
    item === undefined
      ? []
      : item.explanation
          .split(/(?<=\.)\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s, i, arr) => ({ body: s, key: arr.length > 1 && i === 1 }));

  return (
    <div className="rv-detail">
      <div className="rv-detail__scroll">
        <div className="q-num">
          Q {entry.num} / {total}
          <span>·</span>
          {partName}
          <span className="rv-time-chip" data-kind={v.kind}>
            <Icon name="clock" size={11} />
            {v.label} · {fmtTime(entry.timeMs)}
          </span>
        </div>
        {item !== undefined && (
          <p className="q-stem" style={{ fontSize: "var(--text-lg)" }}>{item.stem}</p>
        )}
        {item?.options.map((o) => {
          const isCorrect = o.key === entry.correctKey;
          const isYour = o.key === entry.yourPick && !isCorrect;
          const cls = isCorrect ? "opt opt--correct" : isYour ? "opt opt--chosen" : "opt";
          return (
            <div className={cls} key={o.key}>
              <span className="opt__letter">{letterFor(o.key)}</span>
              <span className="opt__body">{o.text}</span>
              <span className="opt__spacer" />
              {isCorrect && (
                <span className="opt__tag"><Icon name="check" size={14} />Correct</span>
              )}
              {isYour && (
                <span className="opt__tag"><Icon name="x" size={14} />Your answer</span>
              )}
            </div>
          );
        })}
      </div>

      <aside className="rv-diag">
        <div className="rv-diag__scroll">
          <div className={`rv-verdict rv-verdict--${v.kind}`}>
            <div className="rv-verdict__label">{v.label}</div>
            <p className="rv-verdict__note">{v.note}</p>
            {entry.timeMs > 0 && <p className="rv-cal">{PACE_CAVEAT}</p>}
          </div>

          {entry.outcome === "wrong" && misName !== null ? (
            <>
              <div className="mis-card__eyebrow" style={{ marginTop: "var(--space-6)" }}>
                <Icon name="crosshair" size={13} />Named misconception
              </div>
              <h3
                className="mis-card__name"
                style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-2)" }}
              >
                {misName}
              </h3>
              {chosenRationale !== undefined && (
                <p className="mis-card__line" style={{ marginBottom: "var(--space-5)" }}>
                  {chosenRationale.rationale}
                </p>
              )}
            </>
          ) : (
            chosenRationale !== undefined && (
              <p
                className="mis-card__line"
                style={{ marginTop: "var(--space-6)", marginBottom: "var(--space-5)" }}
              >
                {chosenRationale.rationale}
              </p>
            )
          )}

          {steps.length > 0 && (
            <>
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>The working</div>
              <div className="work__steps" style={{ marginTop: 0 }}>
                {steps.map((s, i) => (
                  <div className={`work__step ${s.key ? "work__step--key" : ""}`} key={i}>
                    <span className="work__step-n">{i + 1}</span>
                    <span className="work__step-body">{s.body}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {entry.outcome === "wrong" && queueDays !== null && (
            <div className="rv-queue">
              <Icon name="repeat" size={14} />
              <span>
                Queued in Review · returns in <span className="mono">{queueDays} {queueDays === 1 ? "day" : "days"}</span>
              </span>
              {misId !== null && (
                <button
                  className="sa-btn sa-btn--ghost"
                  style={{ marginLeft: "auto", fontSize: 12, padding: "4px 8px" }}
                  type="button"
                  onClick={() => navigate(`misconception/${misId}`)}
                >
                  Pattern
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
