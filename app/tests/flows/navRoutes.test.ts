/**
 * navRoutes.test.ts — unit tests for the route-to-nav-id mapping module.
 *
 * The module is pure (no I/O, no DOM) so these tests need no environment
 * setup. They mirror the convention in machine.test.ts: no jsdom, no
 * @testing-library, no third-party fixtures.
 */

import { describe, expect, it } from "vitest";

import {
  isShellRoute,
  navIdForRoute,
  routeForNavId,
  type NavId,
} from "../../src/components/navRoutes.js";

describe("navIdForRoute", () => {
  it("maps 'home' to 'today'", () => {
    expect(navIdForRoute("home")).toBe("today");
  });

  it("maps 'diagnosis' to 'diagnosis'", () => {
    expect(navIdForRoute("diagnosis")).toBe("diagnosis");
  });

  it("maps 'mock' to 'mock'", () => {
    expect(navIdForRoute("mock")).toBe("mock");
  });

  it("maps 'settings' to 'settings'", () => {
    expect(navIdForRoute("settings")).toBe("settings");
  });

  it("maps 'syllabus' to 'syllabus'", () => {
    expect(navIdForRoute("syllabus")).toBe("syllabus");
  });

  it("returns null for full-bleed route 'practice'", () => {
    expect(navIdForRoute("practice")).toBeNull();
  });

  it("returns null for full-bleed route 'firstrun'", () => {
    expect(navIdForRoute("firstrun")).toBeNull();
  });

  it("returns null for full-bleed route 'baseline'", () => {
    expect(navIdForRoute("baseline")).toBeNull();
  });

  it("returns null for full-bleed route 'demo'", () => {
    expect(navIdForRoute("demo")).toBeNull();
  });

  it("returns null for the empty-hash boot route", () => {
    expect(navIdForRoute("")).toBeNull();
  });

  it("returns null for an unknown route", () => {
    expect(navIdForRoute("unknown-route-xyz")).toBeNull();
  });
});

describe("routeForNavId", () => {
  const cases: Array<[NavId, string]> = [
    ["today",     "home"],
    ["diagnosis", "diagnosis"],
    ["mock",      "mock"],
    ["settings",  "settings"],
    ["syllabus",  "syllabus"],
    ["practice",  "practice"],
  ];

  for (const [id, expected] of cases) {
    it(`maps nav id '${id}' to route '${expected}'`, () => {
      expect(routeForNavId(id)).toBe(expected);
    });
  }
});

describe("isShellRoute", () => {
  it("returns true for 'home'", () => {
    expect(isShellRoute("home")).toBe(true);
  });

  it("returns true for 'diagnosis'", () => {
    expect(isShellRoute("diagnosis")).toBe(true);
  });

  it("returns true for 'mock'", () => {
    expect(isShellRoute("mock")).toBe(true);
  });

  it("returns true for 'settings'", () => {
    expect(isShellRoute("settings")).toBe(true);
  });

  it("returns true for 'syllabus'", () => {
    expect(isShellRoute("syllabus")).toBe(true);
  });

  it("returns false for full-bleed 'practice'", () => {
    expect(isShellRoute("practice")).toBe(false);
  });

  it("returns false for full-bleed 'firstrun'", () => {
    expect(isShellRoute("firstrun")).toBe(false);
  });

  it("returns false for full-bleed 'baseline'", () => {
    expect(isShellRoute("baseline")).toBe(false);
  });

  it("returns false for the empty-hash boot route", () => {
    expect(isShellRoute("")).toBe(false);
  });
});

describe("round-trip consistency", () => {
  const shellRoutes = ["home", "diagnosis", "mock", "settings", "syllabus"];

  for (const r of shellRoutes) {
    it(`navIdForRoute -> routeForNavId round-trips for '${r}'`, () => {
      const id = navIdForRoute(r);
      expect(id).not.toBeNull();
      // The canonical route for the nav id must map back to the same route.
      // (home is the canonical shell route for the 'today' nav id.)
      expect(routeForNavId(id!)).toBe(r === "home" ? "home" : r);
    });
  }
});
