/**
 * Pack update orchestrator (W5-4): the update state machine.
 *
 * Binding to ADR 0009 ("Update flow"). When online, fetch the manifest, compare
 * versions, download a newer compatible pack into a staging slot, then swap
 * atomically — but never mid-mock. The orchestration is pure of I/O: it drives
 * the PackNetworkPort, PackStagingPort, and MockGuard (port.ts) and reports its
 * state through a listener, so the UI (W5-5) can render progress and the
 * student-visible errata note without this module importing any React.
 *
 * State machine (one update attempt):
 *
 *   idle
 *     │ checkForUpdate()
 *     ▼
 *   checking ──(network/parse/validate fail)──▶ idle (silent: offline is normal)
 *     │ decideUpdate()
 *     ├─ up-to-date / incompatible-* ─▶ idle (decision surfaced to listener)
 *     ▼ update
 *   downloading ──(fetch body fail)──▶ idle
 *     │ writeStaging()
 *     ▼
 *   staged ──(mock in progress)──▶ deferred ──(applyPending() after mock)──┐
 *     │ commitStaging()                                                     │
 *     ▼                                                                     │
 *   applied  ◀───────────────────────────────────────────────────────────┘
 *
 * "applied" carries an UpdateNote (the errata hook): the new version and the
 * top ERRATA.md entries the pack ships. The text is supplied by the pack at
 * build/serve time; this module only carries the mechanism, per the task — the
 * UI rendering lands with W5-5.
 */

import {
  decideUpdate,
  validateManifest,
  type PackManifest,
  type UpdateDecision,
} from "./manifest.js";
import { ALWAYS_ALLOW, type MockGuard, type PackNetworkPort, type PackStagingPort, type StagedPack } from "./port.js";

/**
 * The student-visible update note (the errata hook, ADR 0009: "a short, honest
 * changelog (errata notes name what was wrong)"). `errata` are the top entries
 * from the pack's ERRATA.md, shipped with the pack; this module passes them
 * through untouched. The UI renders this; W5-5 owns the rendering.
 */
export interface UpdateNote {
  readonly fromVersion: string | null;
  readonly toVersion: string;
  /** Top errata lines the new pack fixed, newest first. May be empty. */
  readonly errata: readonly string[];
}

/** Public state of the updater, observed by the UI. */
export type UpdaterState =
  | { readonly phase: "idle" }
  | { readonly phase: "checking" }
  | { readonly phase: "downloading"; readonly toVersion: string }
  | { readonly phase: "deferred"; readonly toVersion: string; readonly reason: string }
  | { readonly phase: "applied"; readonly note: UpdateNote }
  | { readonly phase: "noop"; readonly decision: UpdateDecision };

export type UpdaterListener = (state: UpdaterState) => void;

/** Dependencies the updater needs. Errata extraction is injected so the UI/pack owns the text. */
export interface UpdaterDeps {
  readonly network: PackNetworkPort;
  readonly staging: PackStagingPort;
  /** App version the engine is built for (semver). Sourced from package.json at the wiring point. */
  readonly appVersion: string;
  /** Mock guard; defaults to never-block when no mock flow has registered one. */
  readonly mockGuard?: MockGuard;
  /**
   * Extract the top errata lines for a staged pack. Injected so the data path
   * (ERRATA.md → note) is owned by the caller/pack and this module stays pure.
   * Defaults to none.
   */
  readonly extractErrata?: (staged: StagedPack) => readonly string[];
}

/**
 * The update state machine. One instance per app session. Construct it, call
 * `checkForUpdate()` when online, and `applyPending()` whenever a mock ends (to
 * flush a swap that was deferred mid-mock). Subscribe with `subscribe()` to
 * render progress and the errata note.
 */
export class PackUpdater {
  private readonly network: PackNetworkPort;
  private readonly staging: PackStagingPort;
  private readonly appVersion: string;
  private readonly mockGuard: MockGuard;
  private readonly extractErrata: (staged: StagedPack) => readonly string[];

  private state: UpdaterState = { phase: "idle" };
  private readonly listeners = new Set<UpdaterListener>();

  constructor(deps: UpdaterDeps) {
    this.network = deps.network;
    this.staging = deps.staging;
    this.appVersion = deps.appVersion;
    this.mockGuard = deps.mockGuard ?? ALWAYS_ALLOW;
    this.extractErrata = deps.extractErrata ?? (() => []);
  }

  /** Current state (synchronous read for first render). */
  getState(): UpdaterState {
    return this.state;
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: UpdaterListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(next: UpdaterState): void {
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }

  /**
   * Check for, download, and stage an update; commit it unless a mock is in
   * progress (then defer). Resolves to the terminal state of this attempt.
   * Never throws on network failure: being offline is the normal case and is
   * reported as `idle` (offline is not an error to the student).
   */
  async checkForUpdate(): Promise<UpdaterState> {
    this.setState({ phase: "checking" });

    let candidate: PackManifest;
    try {
      const raw = await this.network.fetchManifest();
      const reason = validateManifest(raw);
      if (reason !== null) {
        return this.finishNoop({ kind: "invalid", reason });
      }
      candidate = raw as PackManifest;
    } catch {
      // Offline or unreachable: silently return to idle. Not an error path.
      this.setState({ phase: "idle" });
      return this.state;
    }

    const installed = await this.staging.readLiveManifest();
    const decision = decideUpdate(installed, candidate, this.appVersion);
    if (decision.kind !== "update") {
      return this.finishNoop(decision);
    }

    // A newer compatible version exists: download the body and stage it.
    this.setState({ phase: "downloading", toVersion: candidate.version });
    let body: string;
    try {
      body = await this.network.fetchPackBody();
    } catch {
      // Download failed; leave any prior staging untouched, return to idle.
      this.setState({ phase: "idle" });
      return this.state;
    }

    const staged: StagedPack = { manifest: candidate, packJson: body };
    await this.staging.writeStaging(staged);

    return this.commitOrDefer(installed?.version ?? null, staged);
  }

  /**
   * Flush a deferred swap. Call this when a mock ends (the guard now allows it).
   * No-op unless there is staged work waiting. Idempotent.
   */
  async applyPending(): Promise<UpdaterState> {
    const staged = await this.staging.readStaging();
    if (staged === null) return this.state;
    const installed = await this.staging.readLiveManifest();
    return this.commitOrDefer(installed?.version ?? null, staged);
  }

  /**
   * Commit the staged swap, or defer if a mock is in progress. The mid-mock
   * guard is checked here, immediately before the atomic swap — the one moment
   * that must never happen mid-mock (ADR 0009).
   */
  private async commitOrDefer(fromVersion: string | null, staged: StagedPack): Promise<UpdaterState> {
    if (this.mockGuard.isMockInProgress()) {
      this.setState({
        phase: "deferred",
        toVersion: staged.manifest.version,
        reason: "A mock is in progress; the update will apply when it ends.",
      });
      return this.state;
    }

    await this.staging.commitStaging();
    const note: UpdateNote = {
      fromVersion,
      toVersion: staged.manifest.version,
      errata: this.extractErrata(staged),
    };
    this.setState({ phase: "applied", note });
    return this.state;
  }

  private finishNoop(decision: UpdateDecision): UpdaterState {
    this.setState({ phase: "noop", decision });
    return this.state;
  }
}
