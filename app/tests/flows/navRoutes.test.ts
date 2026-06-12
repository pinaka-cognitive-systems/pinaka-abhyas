/**
 * navRoutes.test.ts — unit tests for the route-to-nav-id mapping module.
 *
 * Pins the design RAIL_FOR contract (design-team/v2/App.html:44-49): which
 * routes keep the persistent rail and which are full-window flows. The
 * module is pure (no I/O, no DOM) so these tests need no environment setup.
 */

import { describe, expect, it } from "vitest";

import {
  isShellRoute,
  navIdForRoute,
  routeForNavId,
  type NavId,
} from "../../src/components/navRoutes.js";

describe("navIdForRoute", () => {
  it("maps the canonical 'today' route", () => {
    expect(navIdForRoute("today")).toBe("today");
  });

  it("maps the legacy 'home' alias to 'today'", () => {
    expect(navIdForRoute("home")).toBe("today");
  });

  it("keeps the rail on the practice hub", () => {
    expect(navIdForRoute("practice")).toBe("practice");
  });

  it("keeps Practice active on the review queue (RAIL_FOR review -> practice)", () => {
    expect(navIdForRoute("review")).toBe("practice");
  });

  it("keeps Diagnosis active on the misconception detail", () => {
    expect(navIdForRoute("misconception")).toBe("diagnosis");
    expect(navIdForRoute("misconception/compound_interest_confusion")).toBe("diagnosis");
  });

  it("maps the remaining destinations", () => {
    expect(navIdForRoute("diagnosis")).toBe("diagnosis");
    expect(navIdForRoute("syllabus")).toBe("syllabus");
    expect(navIdForRoute("settings")).toBe("settings");
  });

  it("keeps the rail on the mocks hub but not the mock phases", () => {
    expect(navIdForRoute("mock")).toBe("mock");
    expect(navIdForRoute("mock/hall")).toBeNull();
    expect(navIdForRoute("mock/reveal")).toBeNull();
    expect(navIdForRoute("mock/breakdown")).toBeNull();
    expect(navIdForRoute("mock/review/1")).toBeNull();
  });

  it("returns null for the full-window flows", () => {
    for (const r of ["drill", "firstrun", "testday", "demo", ""]) {
      expect(navIdForRoute(r)).toBeNull();
    }
  });

  it("returns null for an unknown route", () => {
    expect(navIdForRoute("unknown-route-xyz")).toBeNull();
  });
});

describe("routeForNavId", () => {
  const cases: Array<[NavId, string]> = [
    ["today",     "today"],
    ["practice",  "practice"],
    ["diagnosis", "diagnosis"],
    ["mock",      "mock"],
    ["syllabus",  "syllabus"],
    ["settings",  "settings"],
  ];

  for (const [id, expected] of cases) {
    it(`maps nav id '${id}' to route '${expected}'`, () => {
      expect(routeForNavId(id)).toBe(expected);
    });
  }
});

describe("isShellRoute", () => {
  it("is true for every rail destination", () => {
    for (const r of ["today", "home", "practice", "review", "diagnosis", "misconception/x", "syllabus", "mock", "settings"]) {
      expect(isShellRoute(r)).toBe(true);
    }
  });

  it("is false for every full-window flow", () => {
    for (const r of ["drill", "mock/hall", "mock/review/0", "firstrun", "testday", "demo", ""]) {
      expect(isShellRoute(r)).toBe(false);
    }
  });
});

describe("round-trip consistency", () => {
  it("every nav id's canonical route maps back to itself", () => {
    const ids: NavId[] = ["today", "practice", "diagnosis", "mock", "syllabus", "settings"];
    for (const id of ids) {
      expect(navIdForRoute(routeForNavId(id))).toBe(id);
    }
  });
});
