/**
 * DiagnosisFlow — the topic x misconception matrix and the MisconceptionDetail
 * drill-through, per design-team/v2/scr-diagnosis.jsx.
 *
 * Routing: #/diagnosis renders the matrix; #/misconception/{id} renders the
 * detail. Both routes are passed to DiagnosisFlow by the shell (router.tsx is
 * already wired). The component reads window.location.hash itself and listens
 * for hashchange so it can switch between the two views without remounting.
 *
 * Data: both views load once via loadAppSnapshot() (the shared cached loader).
 * The misconception detail additionally calls loadCaContent() to resolve item
 * stems and options for the instance ledger.
 *
 * Shared layers (READ-ONLY from this file):
 *   - app/src/theme/design.css  (mx-*, md-*, empty-note, early-flag, caveat …)
 *   - app/src/components/ui.tsx (Icon, Caveat, ScreenHead)
 *   - app/src/components/navigate.ts (navigate)
 *   - app/src/state/appData.ts (loadAppSnapshot, AppSnapshot)
 *   - app/src/engine/insights.ts (misconceptionMatrix, matrixCellStyle,
 *       MATRIX_SCALE_MAX, relativeDate, fallbackName, MisconceptionCost)
 */

import { useEffect, useState } from "react";

import { Caveat, Icon, ScreenHead } from "../../components/ui.js";
import { navigate } from "../../components/navigate.js";
import { loadAppSnapshot, type AppSnapshot } from "../../state/appData.js";
import {
  misconceptionMatrix,
  matrixCellStyle,
  MATRIX_SCALE_MAX,
  relativeDate,
  fallbackName,
  type MisconceptionCost,
} from "../../engine/insights.js";
import { loadCaContent } from "../practice/content.js";
import type { ContentItem } from "../practice/types.js";
import type { Event } from "@pinaka/engine";
import "./diagnosis.css";

export interface DiagnosisFlowProps {
  readonly onExit: () => void;
}

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

function currentRoute(): string {
  if (typeof window === "undefined") return "diagnosis";
  return window.location.hash.replace(/^#\/?/, "");
}

function misconceptionIdFromRoute(route: string): string | null {
  const m = /^misconception\/(.+)$/.exec(route);
  return m ? m[1]! : null;
}

// ---------------------------------------------------------------------------
// Top-level component
// ---------------------------------------------------------------------------

export function DiagnosisFlow({ onExit: _unused }: DiagnosisFlowProps): JSX.Element {
  void _unused;
  const [route, setRoute] = useState<string>(currentRoute);
  const [snap, setSnap] = useState<AppSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reread the hash whenever it changes (the router already handles this flow's
  // routes; we just need to switch sub-views on hashchange).
  useEffect(() => {
    const handler = (): void => setRoute(currentRoute());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  // Load the shared snapshot once.
  useEffect(() => {
    let cancelled = false;
    loadAppSnapshot()
      .then((s) => { if (!cancelled) setSnap(s); })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load the diagnosis.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (loadError !== null) {
    return (
      <main className="screen">
        <div className="screen__scroll">
          <div className="screen__pad">
            <p style={{ color: "var(--color-danger-text)", marginTop: "var(--space-8)" }}>
              {loadError}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (snap === null) {
    return (
      <main className="screen">
        <div className="screen__scroll">
          <div className="screen__pad">
            <p className="subtle" style={{ marginTop: "var(--space-8)" }}>Loading…</p>
          </div>
        </div>
      </main>
    );
  }

  const misId = misconceptionIdFromRoute(route);
  if (misId !== null) {
    return <MisconceptionDetail id={misId} snap={snap} />;
  }
  return <DiagnosisScreen snap={snap} />;
}

// ---------------------------------------------------------------------------
// Diagnosis screen — the matrix view
// ---------------------------------------------------------------------------

function DiagnosisScreen({ snap }: { readonly snap: AppSnapshot }): JSX.Element {
  const dataState = snap.dataState;
  const empty = dataState === "empty" || snap.costs.length === 0;
  const early = dataState === "early";
  const progressing = dataState === "progressing";

  if (empty) {
    return (
      <main className="screen">
        <div className="screen__scroll">
          <div className="screen__pad">
            <ScreenHead
              eyebrow="Diagnosis · Paper 3 QA"
              eyebrowIcon="layers"
              title="Nothing to diagnose yet"
              lede="The diagnosis reads your wrong answers and names the misconception behind each one. It needs a mock first."
            />
            <div className="empty-note" style={{ alignItems: "flex-start" }}>
              <div className="empty-note__icon"><Icon name="lock" size={20} /></div>
              <div className="empty-note__text">
                After one full mock, this becomes a map of every topic against the specific
                errors costing you marks, weakest first. A number with nothing behind it would
                be a guess.
                <div style={{ marginTop: "var(--space-4)" }}>
                  <button
                    type="button"
                    className="sa-btn sa-btn--primary"
                    onClick={() => navigate("mock")}
                  >
                    Take your first mock
                    <Icon name="arrow-right" size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const matrix = misconceptionMatrix(snap.events, snap.pack, snap.costs, snap.topicNames);

  // Early state: cap to 2 rows x 3 cols and scale = 1 (no progressing scale).
  const rows = early ? matrix.rows.slice(0, 2) : matrix.rows;
  const cols = early ? matrix.cols.slice(0, 3) : matrix.cols;
  const cells = early
    ? matrix.cells.slice(0, 2).map((row) => row.slice(0, 3))
    : matrix.cells;
  const scale = progressing ? 0.55 : 1;

  const sidebarTitle = progressing ? "Shrinking, recurring first" : "Recurring first";
  const misList = snap.costs.slice(0, 6);

  const lede = early
    ? "Provisional after one mock. Rows are topics, columns are the misconceptions behind your wrong answers. It will deepen as you attempt more."
    : "One map, two axes. Rows are topics, columns are the misconceptions behind your wrong answers. Darker means more marks lost. Open any misconception at right to see the pattern.";

  const hiddenNote = early
    ? "Most topics still below the attempt threshold"
    : `${matrix.hiddenCount} topics below threshold hidden`;

  return (
    <main className="screen">
      <div className="screen__scroll">
        <div className="screen__pad">
          <ScreenHead
            eyebrow="Diagnosis · Paper 3 QA"
            eyebrowIcon="layers"
            title="Where you are losing points"
            lede={lede}
            right={early
              ? <span className="early-flag"><Icon name="alert" size={12} />Provisional · 1 mock</span>
              : undefined}
          />
          <div className="mx-wrap">
            <div>
              <div className="mx">
                <div
                  className="mx__grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `132px repeat(${cols.length}, 1fr)`,
                  }}
                >
                  <div className="mx__corner" />
                  {cols.map((c) => (
                    <div className="mx__colhead" key={c.id}>{c.name}</div>
                  ))}
                  {rows.map((r, ri) => (
                    <CellRow
                      key={r.id}
                      rowName={r.name}
                      cellValues={(cells[ri] ?? []).map((v) => v * scale)}
                      cols={cols}
                    />
                  ))}
                </div>
              </div>
              <div className="mx__legend">
                <span>Marks lost</span>
                <div className="mx__legend-scale">
                  {([0.5, 2, 3.5, 5, 7] as const).map((v) => (
                    <span
                      key={v}
                      className="mx__legend-chip"
                      style={matrixCellStyle(v)}
                    />
                  ))}
                </div>
                <span>none → {MATRIX_SCALE_MAX.toFixed(1)}</span>
                <span style={{ marginLeft: "auto" }}>
                  <Caveat icon="lock">{hiddenNote}</Caveat>
                </span>
              </div>
              {progressing && (
                <p className="caveat" style={{ marginTop: "var(--space-4)" }}>
                  <Icon name="trend-down" size={12} />
                  Every misconception is costing less than a month ago.
                </p>
              )}
            </div>
            <aside className="mx-side">
              <h3 className="mx-side__title">{sidebarTitle}</h3>
              {misList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="mx-mis"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid var(--color-border-hairline)",
                    cursor: "pointer",
                    font: "inherit",
                    display: "block",
                    padding: "var(--space-3) 0",
                  }}
                  onClick={() => navigate(`misconception/${m.id}`)}
                >
                  <div className="mx-mis__name">
                    <span>{m.name}</span>
                    <span className="mx-mis__cost mono">
                      {"−"}{formatCost(m.marksLost)}
                    </span>
                  </div>
                  <div className="mx-mis__meta">{m.count} questions · {m.topics}</div>
                </button>
              ))}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Matrix cell row
// ---------------------------------------------------------------------------

function CellRow({
  rowName,
  cellValues,
  cols,
}: {
  readonly rowName: string;
  readonly cellValues: readonly number[];
  readonly cols: readonly { readonly id: string }[];
}): JSX.Element {
  return (
    <>
      <div className="mx__rowhead">{rowName}</div>
      {cols.map((c, ci) => {
        const v = cellValues[ci] ?? 0;
        const style = matrixCellStyle(v);
        return (
          <div className="mx__cell" key={c.id} style={style}>
            <span
              className="mono"
              style={{ fontSize: 11, fontWeight: 500, opacity: v > 0 ? 1 : 0.25 }}
            >
              {v > 0 ? formatCellValue(v) : "·"}
            </span>
          </div>
        );
      })}
    </>
  );
}

/** Format a cell value: integer shows as integer, else 2 dp. */
function formatCellValue(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

/** Format marks cost for the sidebar: same rule as cell. */
function formatCost(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

// ---------------------------------------------------------------------------
// MisconceptionDetail
// ---------------------------------------------------------------------------

interface DetailData {
  readonly cost: MisconceptionCost;
  readonly schema: SchemaEntry | null;
  readonly instances: InstanceRow[];
}

interface SchemaEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

interface InstanceRow {
  readonly event: Event;
  readonly ctxLabel: string;
  readonly dateLabel: string;
  readonly stem: string | null;
  readonly chosenText: string;
  readonly correctText: string;
  readonly lost: number;
}

function MisconceptionDetail({
  id,
  snap,
}: {
  readonly id: string;
  readonly snap: AppSnapshot;
}): JSX.Element {
  const [detail, setDetail] = useState<DetailData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void buildDetail(id, snap).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => { cancelled = true; };
  }, [id, snap]);

  if (detail === null) {
    return (
      <main className="screen">
        <div className="screen__scroll">
          <div className="screen__pad">
            <p className="subtle" style={{ marginTop: "var(--space-8)" }}>Loading…</p>
          </div>
        </div>
      </main>
    );
  }

  const { cost, schema, instances } = detail;

  // Primary family name for the eyebrow (first family, display-resolved).
  const familyName = cost.families.length > 0
    ? (snap.topicNames.get(cost.families[0]!) ?? fallbackName(cost.families[0]!))
    : "Mixed";

  // Attempt count: total events carrying this misconception id (wrong + right
  // for items that have ever had this id selected).
  const totalAttempts = snap.events.filter(
    (e) => e.selected_misconception === id,
  ).length;
  const wrongCount = instances.length; // all instances are wrong events

  const trendText =
    cost.trend === "up"
      ? "getting more frequent"
      : cost.trend === "down"
        ? "getting rarer"
        : null;

  return (
    <main className="screen">
      <div className="screen__scroll">
        <div className="screen__pad">
          <button
            type="button"
            className="sa-btn sa-btn--ghost"
            style={{ marginBottom: "var(--space-5)", fontSize: 13, paddingLeft: 0 }}
            onClick={() => navigate("diagnosis")}
          >
            <Icon name="arrow-left" size={15} />Back to diagnosis
          </button>

          <div className="md-hero">
            <div>
              <div className="screen__eyebrow" style={{ marginBottom: 0 }}>
                <Icon name="crosshair" size={13} />
                Misconception · {familyName}
              </div>
              <h1 className="md-hero__name">{cost.name}</h1>
              <div className="md-hero__fam">
                Seen in {wrongCount} of your {totalAttempts} attempts on this pattern
                {trendText !== null && (
                  <span className="subtle"> · {trendText}</span>
                )}
              </div>
            </div>
            <div className="md-hero__stat">
              <div className="md-hero__stat-num mono">{formatCost(cost.marksLost)}</div>
              <div className="md-hero__stat-label">Marks lost</div>
            </div>
          </div>

          {schema !== null && (
            <div
              className="md-cards"
              style={{ marginTop: "var(--space-6)" }}
            >
              <div className="md-card md-card--what">
                <div className="md-card__label">
                  <Icon name="x" size={13} />What happens
                </div>
                <p className="md-card__text">{schema.description}</p>
              </div>
            </div>
          )}

          <h3 className="section-title" style={{ marginTop: "var(--space-8)" }}>
            Every time it bit you
          </h3>
          <div className="brk">
            {instances.map((inst, i) => (
              <div className="md-inst" key={i}>
                <div>
                  <div className="md-inst__ctx">{inst.ctxLabel}</div>
                  <div className="md-inst__ctx-date">{inst.dateLabel}</div>
                </div>
                <div className="md-inst__stem">
                  {inst.stem !== null ? truncate(inst.stem, 80) : "(item not found)"}
                </div>
                <div className="md-inst__ans">
                  <span className="md-inst__wrong">{inst.chosenText}</span>
                  {" → "}
                  <span className="md-inst__right">{inst.correctText}</span>
                </div>
                <div className="md-inst__ans">
                  {"−"}{inst.lost.toFixed(2)}
                </div>
              </div>
            ))}
            {instances.length === 0 && (
              <div style={{ padding: "var(--space-5)", color: "var(--color-muted-foreground)", fontSize: "var(--text-sm)" }}>
                No recorded instances yet.
              </div>
            )}
          </div>

          <div className="btn-row" style={{ marginTop: "var(--space-6)", justifyContent: "space-between" }}>
            <Caveat icon="repeat">
              These questions resurface in your review queue on a spaced schedule.
            </Caveat>
            <button
              type="button"
              className="sa-btn sa-btn--primary"
              onClick={() => navigate("drill")}
            >
              Drill this pattern<Icon name="arrow-right" size={15} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Detail builder (async, called once per id+snap)
// ---------------------------------------------------------------------------

async function buildDetail(
  id: string,
  snap: AppSnapshot,
): Promise<DetailData> {
  // Find the cost entry.
  const cost = snap.costs.find((c) => c.id === id) ?? buildFallbackCost(id, snap);

  // Load the schema entry (description, canonical name).
  const schema = await loadSchemaEntry(id);

  // Load content for stems/options.
  const content = await loadCaContent();

  // Filter wrong events for this misconception, newest first, cap 6.
  const wrongEvents = snap.events
    .filter((e) => !e.correct && e.selected_misconception === id)
    .slice()
    .sort((a, b) => b.occurredAtMs - a.occurredAtMs)
    .slice(0, 6);

  const nowMs = Date.now();
  const instances: InstanceRow[] = wrongEvents.map((e) => {
    const item = content.get(e.item_id) ?? null;
    const ctxLabel = buildCtxLabel(e);
    const dateLabel = relativeDate(e.occurredAtMs, nowMs);

    // Resolve chosen / correct option texts.
    const { chosenText, correctText } = resolveOptions(e, item);

    // Marks lost per event: mock = 1.25, practice = 1.0.
    const lost = e.mode === "mock" ? 1 + snap.pack.marking.negativePerWrong : 1.0;

    return {
      event: e,
      ctxLabel,
      dateLabel,
      stem: item?.stem ?? null,
      chosenText,
      correctText,
      lost,
    };
  });

  return { cost, schema, instances };
}

/** Build a minimal cost record when the id is not in snap.costs (e.g. never
 * met the minOccurrences threshold but was navigated to directly). */
function buildFallbackCost(id: string, snap: AppSnapshot): MisconceptionCost {
  const wrongEvents = snap.events.filter(
    (e) => !e.correct && e.selected_misconception === id,
  );
  const marksLost = wrongEvents.reduce(
    (sum, e) => sum + (e.mode === "mock" ? 1 + snap.pack.marking.negativePerWrong : 1.0),
    0,
  );
  return {
    id,
    name: snap.misNames.get(id) ?? fallbackName(id),
    count: wrongEvents.length,
    marksLost: Math.round(marksLost * 100) / 100,
    families: [],
    topics: "",
    trend: "flat",
  };
}

/** Load the canon description from the misconceptions JSON. */
let schemaCache: Map<string, SchemaEntry> | null = null;

async function loadSchemaEntry(id: string): Promise<SchemaEntry | null> {
  if (schemaCache === null) {
    const mod = await import(
      "../../../../schema/profiles/ca-foundation-qa/misconceptions.json"
    );
    const data = mod.default as {
      misconceptions: Array<{ id: string; name: string; description: string }>;
    };
    schemaCache = new Map(data.misconceptions.map((m) => [m.id, m]));
  }
  return schemaCache.get(id) ?? null;
}

/** Build the context label ("Mock · Q14" or "Drill · Finance"). */
function buildCtxLabel(e: Event): string {
  if (e.mode === "mock") return "Mock";
  const topicHint = e.tests[0];
  if (topicHint !== undefined) {
    const leaf = topicHint.slice(topicHint.lastIndexOf(".") + 1).replace(/_/g, " ");
    const short = leaf.charAt(0).toUpperCase() + leaf.slice(1);
    return `Drill · ${short}`;
  }
  return "Drill";
}

/** Resolve the chosen and correct option texts. Falls back to letter labels.
 * Event.response is stored as { kind: "single_best", selected_option: number }
 * (see flows/practice/event.ts). */
function resolveOptions(
  e: Event,
  item: ContentItem | null,
): { chosenText: string; correctText: string } {
  // Extract chosen option key from the stored response.
  const responseObj = e.response as { selected_option?: number } | null | undefined;
  const chosenKey = responseObj?.selected_option ?? null;

  // Correct option key lives in the content item.
  const correctKey = item?.answer_key?.correct ?? null;

  if (item === null || item.options.length === 0) {
    return {
      chosenText: chosenKey !== null ? optionLetter(chosenKey) : "?",
      correctText: correctKey !== null ? optionLetter(correctKey) : "?",
    };
  }

  const chosenOpt = chosenKey !== null ? item.options.find((o) => o.key === chosenKey) : null;
  const correctOpt = correctKey !== null ? item.options.find((o) => o.key === correctKey) : null;
  return {
    chosenText: chosenOpt?.text ?? (chosenKey !== null ? optionLetter(chosenKey) : "?"),
    correctText: correctOpt?.text ?? (correctKey !== null ? optionLetter(correctKey) : "?"),
  };
}

function optionLetter(key: number): string {
  return String.fromCharCode(64 + key); // 1->"A", 2->"B", …
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
