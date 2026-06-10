/**
 * Home-surface copy: the Fellow voice gate + the W5-9 acceptance sweep.
 *
 * Two layers, both DOM-free:
 *   1. Voice gate (brand-core.md sentence rules): no contractions ("do not",
 *      never "don't"), no exclamation marks, no em-dashes (long dash, en dash,
 *      or double hyphen). Applied to every leaf string in the home COPY and the
 *      reminder block of the settings COPY (the reminder lives in settings).
 *   2. The acceptance sweep (adherence-spec.md "Acceptance"; brand-core.md
 *      "Anti-features" and "Banned terms"): NO string anywhere contains streak
 *      language, day counts of absence, or urgency. The banned list is built
 *      from brand-core.md, not invented here.
 *
 * Two spec-exact lines are pinned verbatim so a future edit cannot drift them.
 */

import { describe, expect, it } from "vitest";

import { COPY as HOME } from "../../src/flows/home/copy.js";
import { COPY as SETTINGS } from "../../src/flows/settings/copy.js";

/** Flatten a COPY tree into [path, string]; invoke function leaves with sample
 * numeric, time, and label inputs so their output is checked too. */
function leaves(node: unknown, path: string): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (typeof node === "function") {
    const fn = node as (...args: unknown[]) => unknown;
    const out: [string, string][] = [];
    // Numeric formatters (count) and string formatters (weekday/time/label).
    for (const n of [0, 1, 2, 3, 14]) {
      try {
        const v = fn(n);
        if (typeof v === "string") out.push([`${path}(${n})`, v]);
      } catch {
        /* not a numeric formatter */
      }
    }
    for (const s of ["Tuesday", "19:00", "compound interest"]) {
      try {
        const v = fn(s);
        if (typeof v === "string") out.push([`${path}(${JSON.stringify(s)})`, v]);
      } catch {
        /* not a string formatter */
      }
    }
    // stillCosts takes (label, marks).
    try {
      const v = (fn as (a: string, b: number) => unknown)("compound interest", 3);
      if (typeof v === "string") out.push([`${path}("compound interest",3)`, v]);
    } catch {
      /* not a two-arg formatter */
    }
    return out;
  }
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (node !== null && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, `${path}.${k}`));
  }
  return [];
}

const HOME_STRINGS = leaves(HOME, "HOME");
const REMINDER_STRINGS = leaves(SETTINGS.reminder, "SETTINGS.reminder");
const ALL = [...HOME_STRINGS, ...REMINDER_STRINGS];

const CONTRACTIONS =
  /\b(do|does|did|is|are|was|were|has|have|had|would|will|shall|should|could|can|might|must|need|ought)n['’]t\b|\b(it|that|there|here|what|who|let|you|we|they|i|he|she|how)['’](s|re|ve|ll|d|m)\b/i;

// ---------------------------------------------------------------------------
// Layer 1: the Fellow voice gate.
// ---------------------------------------------------------------------------

describe("home + reminder copy passes the Fellow voice gate", () => {
  it("there is copy to check", () => {
    expect(ALL.length).toBeGreaterThan(20);
  });

  for (const [path, s] of ALL) {
    it(`${path}: no exclamation mark`, () => {
      expect(s.includes("!")).toBe(false);
    });
    it(`${path}: no em-dash, en-dash, or double hyphen`, () => {
      expect(s.includes("—")).toBe(false);
      expect(s.includes("–")).toBe(false);
      expect(/--/.test(s)).toBe(false);
    });
    it(`${path}: no contraction`, () => {
      expect(CONTRACTIONS.test(s)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// Layer 2: the acceptance sweep — no streak, no absence counts, no urgency.
// The banned vocabulary is sourced from brand-core.md (Anti-features + Banned
// terms + the sentence rule that bans rhetorical-question transitions).
// ---------------------------------------------------------------------------

/** Streak / gamification language (brand-core.md Anti-features). Matched on
 * word boundaries so an innocent substring (e.g. "xp" inside "expires") never
 * false-positives; the intent is to ban the LANGUAGE, not letter sequences. */
const STREAK_WORDS = [
  "streak",
  "streaks",
  "badge",
  "badges",
  "xp",
  "leaderboard",
  "leaderboards",
  "level up",
  "levelling up",
  "daily goal",
  "keep it up",
  "do not break",
  "in a row",
  "consecutive",
  "consecutively",
];

/** Urgency / scarcity / fear (brand-core.md India-specific additions +
 * Anti-features). Phrases that manufacture pressure; matched as phrases. */
const URGENCY_WORDS = [
  "hurry",
  "last chance",
  "now or never",
  "do not miss",
  "limited seats",
  "act now",
  "running out",
  "expires soon",
  "expiring soon",
  "deadline",
  "falling behind",
  "fall behind",
  "catch up before",
  "too late",
  "you are losing",
  "you will lose",
  "do not lose",
];

/** Absence-day-count phrasing the spec forbids (mechanism 3: never the gap
 * length). Any "N day(s)" / "N week(s)" style of absence count is banned. */
const ABSENCE_COUNT_PATTERNS = [
  /\b\d+\s+days?\s+(away|gone|since|of absence|without|missed)\b/i,
  /\b\d+\s+weeks?\s+(away|gone|since|without)\b/i,
  /\baway for\s+\d+/i,
  /\bgone for\s+\d+/i,
  /\bmissed\s+\d+\s+days?\b/i,
  /\b\d+\s+days?\s+in a row\b/i,
];

/** Whole-phrase match on word boundaries (case-insensitive). Letters of a
 * banned phrase appearing inside a larger word do NOT count. */
function containsPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

describe("acceptance sweep: no streak, no absence counts, no urgency", () => {
  for (const [path, s] of ALL) {
    it(`${path}: no streak / gamification language`, () => {
      for (const w of STREAK_WORDS) {
        expect(containsPhrase(s, w), `"${w}" in ${path}`).toBe(false);
      }
    });
    it(`${path}: no urgency / scarcity / fear language`, () => {
      for (const w of URGENCY_WORDS) {
        expect(containsPhrase(s, w), `"${w}" in ${path}`).toBe(false);
      }
    });
    it(`${path}: no absence day-count phrasing`, () => {
      for (const re of ABSENCE_COUNT_PATTERNS) {
        expect(re.test(s), `${re} matched ${path}`).toBe(false);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Spec-exact lines pinned verbatim (adherence-spec.md mechanisms 1 and 3).
// ---------------------------------------------------------------------------

describe("the spec-exact lines are reproduced verbatim", () => {
  it("mechanism 1 close line", () => {
    expect(HOME.today.doneTitle).toBe(
      "Today's work is complete. More study today adds little; come back tomorrow.",
    );
  });
  it("mechanism 3 re-entry lead line", () => {
    expect(HOME.reentry.lead).toBe(
      "Welcome back. Your estimates have widened while you were away; a short session will sharpen them.",
    );
  });
});

describe("the reminder states it is the student's own alarm and the honest limitation", () => {
  it("names it the student's own alarm and disclaims caring whether it is answered", () => {
    expect(SETTINGS.reminder.body).toContain("your own");
    expect(SETTINGS.reminder.body.toLowerCase()).toContain("neither knows nor cares");
  });
  it("states the no-background-sync limitation plainly", () => {
    expect(SETTINGS.reminder.limitation.toLowerCase()).toContain("not a server that chases you");
  });
  it("has an honest unavailability path that suggests installing first", () => {
    expect(SETTINGS.reminder.unavailable.toLowerCase()).toContain("home screen first");
  });
});
