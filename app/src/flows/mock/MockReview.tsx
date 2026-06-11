/**
 * MockReview — per-question walkthrough after the mock breakdown (W5 mock review).
 *
 * Reached from the breakdown via "Review the answers" and back again via the
 * context bar back button. Stays inside MockFlow's phase machine: no new hash
 * route. The component is read-only: the mock is already scored; nothing here
 * writes to storage or mutates the session.
 *
 * Layout:
 *   context bar (back, title, score, close)
 *   filter tab row (To review / Wrong / Skipped / Correct / Marked / All)
 *   two-column body at >=1024px (navigator left, detail right),
 *   single-column on mobile (list then detail)
 *
 * The page never scrolls as a whole on desktop. The navigator and the detail
 * pane each scroll internally (overflow-y: auto, min-height: 0). On mobile the
 * page scrolls once and the detail pane flows below the list.
 *
 * Keyboard: arrow-up/down and j/k navigate the filtered list.
 * The navigator entry for the selected question carries aria-current="true".
 *
 * Styles live in mock.css under the rv- prefix (review).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { RevealSection } from "../practice/reveals.js";
import {
  loadTopicNames,
  fallbackTopicLabel,
} from "../../engine/topics.js";
import type { ContentItem } from "../practice/types.js";
import type { MockSession } from "./state.js";
import type { MockScore } from "./scoring.js";
import {
  applyFilter,
  buildFilterCounts,
  buildReviewEntries,
  formatMs,
  pacingWord,
  type FilterCounts,
  type ReviewEntry,
  type ReviewFilterId,
} from "./reviewFilter.js";

// ---------------------------------------------------------------------------
// Props.
// ---------------------------------------------------------------------------

export interface MockReviewProps {
  readonly session: MockSession;
  readonly score: MockScore;
  readonly content: ReadonlyMap<string, ContentItem>;
  readonly onBack: () => void;
  readonly onExit: () => void;
}

// ---------------------------------------------------------------------------
// Filter tab configuration.
// ---------------------------------------------------------------------------

interface FilterTab {
  readonly id: ReviewFilterId;
  readonly label: string;
}

const FILTER_TABS: readonly FilterTab[] = [
  { id: "toReview", label: "To review" },
  { id: "wrong",    label: "Wrong" },
  { id: "skipped",  label: "Skipped" },
  { id: "correct",  label: "Correct" },
  { id: "marked",   label: "Marked" },
  { id: "all",      label: "All" },
];

// ---------------------------------------------------------------------------
// MockReview component.
// ---------------------------------------------------------------------------

export function MockReview({
  session,
  score,
  content,
  onBack,
  onExit,
}: MockReviewProps): JSX.Element {
  const allEntries = buildReviewEntries(session, score, content);
  const counts: FilterCounts = buildFilterCounts(allEntries);

  const [filterId, setFilterId] = useState<ReviewFilterId>("toReview");
  const filtered = applyFilter(allEntries, filterId);

  // Selected item: default to the first entry in the current filter.
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    () => filtered[0]?.itemId ?? null,
  );

  // When the filter changes, keep selection if it's still visible; else reset
  // to the first item in the new filter.
  useEffect(() => {
    if (selectedItemId === null || !filtered.some((e) => e.itemId === selectedItemId)) {
      setSelectedItemId(filtered[0]?.itemId ?? null);
    }
  }, [filterId]); // intentionally omit selectedItemId and filtered to avoid loops

  const selectedEntry = selectedItemId !== null
    ? (allEntries.find((e) => e.itemId === selectedItemId) ?? null)
    : null;

  // Navigator ref for focus management.
  const navRef = useRef<HTMLElement>(null);

  // Keyboard: arrow-up/down and j/k navigate the filtered list.
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

  const selectEntry = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
  }, []);

  const netDisplay = score.net.toFixed(2);

  return (
    <div className="rv-screen">
      {/* Context bar */}
      <header className="rv-bar">
        <div className="rv-bar__left">
          <button
            type="button"
            className="rv-bar__back"
            onClick={onBack}
            aria-label="Back to breakdown"
          >
            Back
          </button>
          <span className="rv-bar__title">
            <span className="rv-bar__label">Mock review</span>
            <span className="rv-bar__score rv-mono">{netDisplay}</span>
          </span>
        </div>
        <button
          type="button"
          className="rv-bar__close"
          onClick={onExit}
          aria-label="Close and return home"
        >
          Close
        </button>
      </header>

      {/* Filter tabs */}
      <div className="rv-filters" role="tablist" aria-label="Question filter">
        {FILTER_TABS.map((tab) => {
          const count = counts[tab.id];
          const isOn = filterId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isOn}
              aria-pressed={isOn}
              className={`rv-filter${isOn ? " rv-filter--on" : ""}`}
              onClick={() => setFilterId(tab.id)}
            >
              {tab.label}
              <span className="rv-filter__n rv-mono">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Body: navigator + detail */}
      <div className="rv-body">
        <nav
          ref={navRef}
          className="rv-nav"
          aria-label="Question navigator"
        >
          {filtered.length === 0 ? (
            <p className="rv-empty">Nothing in this filter.</p>
          ) : (
            filtered.map((entry) => (
              <NavigatorEntry
                key={entry.itemId}
                entry={entry}
                content={content}
                isSelected={entry.itemId === selectedItemId}
                onSelect={selectEntry}
              />
            ))
          )}
        </nav>

        <div className="rv-detail" aria-label="Question detail">
          {selectedEntry !== null ? (
            <DetailPane
              entry={selectedEntry}
              content={content}
              total={session.order.length}
            />
          ) : (
            <p className="rv-empty rv-empty--detail">Select a question to review it.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavigatorEntry.
// ---------------------------------------------------------------------------

function NavigatorEntry({
  entry,
  content,
  isSelected,
  onSelect,
}: {
  readonly entry: ReviewEntry;
  readonly content: ReadonlyMap<string, ContentItem>;
  readonly isSelected: boolean;
  readonly onSelect: (itemId: string) => void;
}): JSX.Element {
  const item = content.get(entry.itemId);
  const topicName = item
    ? (item.tests[0] !== undefined ? fallbackTopicLabel(item.tests[0]) : null)
    : null;

  const outcomeWord =
    entry.outcome === "correct" ? "Correct"
    : entry.outcome === "wrong"   ? "Wrong"
    : "Skipped";

  const timeLabel = entry.timeMs > 0 ? formatMs(entry.timeMs) : null;

  return (
    <button
      type="button"
      className={`rv-item${isSelected ? " rv-item--sel" : ""}`}
      aria-current={isSelected ? "true" : undefined}
      onClick={() => onSelect(entry.itemId)}
    >
      {/* Outcome dot + accessible word */}
      <span
        className={`rv-item__dot rv-item__dot--${entry.outcome}`}
        aria-label={outcomeWord}
        role="img"
      />
      <span className="rv-item__n rv-mono">{entry.num}</span>
      <span className="rv-item__body">
        <span className="rv-item__top">
          {topicName ?? entry.itemId}
          {entry.marked && (
            <span className="rv-item__flag" aria-label="Marked for review">
              F
            </span>
          )}
        </span>
        <span className="rv-item__sub">
          <span className={`rv-item__outcome rv-item__outcome--${entry.outcome}`}>
            {outcomeWord}
          </span>
          {entry.outcome === "wrong" && entry.yourPick !== null && (
            <span className="rv-item__picks">
              {" "}you {entry.yourPick}
              {entry.correctKey !== null ? ` · ans ${entry.correctKey}` : ""}
            </span>
          )}
          {timeLabel !== null && (
            <span className="rv-item__time"> · {timeLabel}</span>
          )}
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// DetailPane.
// ---------------------------------------------------------------------------

function DetailPane({
  entry,
  content,
  total,
}: {
  readonly entry: ReviewEntry;
  readonly content: ReadonlyMap<string, ContentItem>;
  readonly total: number;
}): JSX.Element {
  const item = content.get(entry.itemId);
  const [topicNames, setTopicNames] = useState<ReadonlyMap<string, string> | null>(null);

  useEffect(() => {
    void loadTopicNames().then(setTopicNames);
  }, []);

  const nodeId = item?.tests[0] ?? null;
  const topicName = nodeId !== null
    ? (topicNames?.get(nodeId) ?? fallbackTopicLabel(nodeId))
    : null;

  const pacing = pacingWord(entry);
  const timeDisplay = entry.timeMs > 0 ? formatMs(entry.timeMs) : null;

  return (
    <div className="rv-detail__scroll">
      {/* Question header */}
      <div className="rv-q-meta">
        <span className="rv-q-num rv-mono">
          Q {entry.num} / {total}
        </span>
        {topicName !== null && (
          <span className="rv-q-topic">{topicName}</span>
        )}
        {timeDisplay !== null && (
          <span
            className={`rv-time-chip${pacing !== null ? ` rv-time-chip--${pacing.toLowerCase()}` : ""}`}
          >
            {timeDisplay}
            {pacing !== null && <span className="rv-time-chip__word">{pacing}</span>}
          </span>
        )}
      </div>

      {/* Stem */}
      {item !== undefined && (
        <p className="rv-stem">{item.stem}</p>
      )}

      {/* Options in review state */}
      {item !== undefined && item.options.length > 0 && (
        <div className="rv-options">
          {item.options.map((opt) => {
            const isCorrect = opt.key === entry.correctKey;
            const isYourWrong = opt.key === entry.yourPick && !isCorrect && entry.outcome === "wrong";
            const cls =
              `rv-opt` +
              (isCorrect ? " rv-opt--correct" : "") +
              (isYourWrong ? " rv-opt--wrong" : "");

            const rationale = item.per_option_rationale.find(
              (r) => r.option_key === opt.key,
            );

            return (
              <div key={opt.key} className="rv-opt-row">
                <div className={cls}>
                  <span className="rv-opt__key">{opt.key}</span>
                  <span className="rv-opt__text">{opt.text}</span>
                  {isCorrect && (
                    <span className="rv-opt__tag rv-opt__tag--correct">Correct</span>
                  )}
                  {isYourWrong && (
                    <span className="rv-opt__tag rv-opt__tag--wrong">Your answer</span>
                  )}
                </div>
                {rationale !== undefined && (
                  <p className="rv-opt__rationale">{rationale.rationale}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Structured teaching via RevealSection (reuse from practice). */}
      {item !== undefined && (
        <ReviewTeaching item={item} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewTeaching — structured reveals, graceful fallback.
// ---------------------------------------------------------------------------

function ReviewTeaching({ item }: { readonly item: ContentItem }): JSX.Element {
  const sections = item.explanationSections;

  if (sections !== undefined) {
    // Full structured path: five numbered reveals.
    return (
      <div className="rv-reveals">
        <RevealSection num="01" label="Why each option">
          <div className="rv-reveal-rationale">
            {item.per_option_rationale.map((r) => (
              <p key={r.option_key} className="rv-reveal-rationale__line">
                <span className="rv-reveal-rationale__key rv-mono">{r.option_key}</span>
                {r.rationale}
              </p>
            ))}
          </div>
        </RevealSection>
        <RevealSection num="02" label="The working">
          <p className="pr-reveal__prose">{item.explanation}</p>
        </RevealSection>
        <RevealSection num="03" label="How to approach this">
          <p className="pr-reveal__prose">{sections.approach}</p>
        </RevealSection>
        <RevealSection num="04" label="Take-home lesson">
          <p className="pr-reveal__prose">{sections.lesson}</p>
        </RevealSection>
        <RevealSection num="05" label="Timing">
          <p className="pr-reveal__prose">{sections.timing}</p>
        </RevealSection>
      </div>
    );
  }

  // Graceful fallback: verdict line + explanation working steps.
  const steps = item.explanation
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return (
    <div className="rv-fallback">
      {steps.length > 0 && (
        <div className="rv-work">
          <p className="rv-work__eyebrow">The working</p>
          <ol className="rv-work__steps">
            {steps.map((s, i) => (
              <li key={i} className="rv-work__step">
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
