/**
 * Pure update-decision logic (W5-4): semver parse/compare, manifest validation,
 * and decideUpdate's full branch matrix. Runs in node — no DOM, no service
 * worker, no storage — because the logic is pure (ADR 0009 update flow).
 */

import { describe, expect, it } from "vitest";
import {
  compareSemVer,
  decideUpdate,
  parseSemVer,
  validateManifest,
  type PackManifest,
} from "../../src/sw/manifest.js";

function manifest(overrides: Partial<PackManifest> = {}): PackManifest {
  return {
    pack_id: "ca-foundation-qa",
    version: "1.0.0",
    taxonomy_version: 4,
    item_count: 82,
    min_app_version: "0.1.0",
    created_at: "2026-06-10T00:00:00Z",
    content_hashes: { arn_caf_qa_000001: "abc" },
    ...overrides,
  };
}

describe("parseSemVer", () => {
  it("parses a well-formed version", () => {
    expect(parseSemVer("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });
  it("rejects malformed versions", () => {
    for (const bad of ["1.2", "1.2.3.4", "v1.2.3", "1.2.x", "", "1.2.3-rc1"]) {
      expect(parseSemVer(bad)).toBeNull();
    }
  });
});

describe("compareSemVer", () => {
  const v = (s: string) => parseSemVer(s)!;
  it("orders by major, then minor, then patch", () => {
    expect(compareSemVer(v("2.0.0"), v("1.9.9"))).toBeGreaterThan(0);
    expect(compareSemVer(v("1.2.0"), v("1.1.9"))).toBeGreaterThan(0);
    expect(compareSemVer(v("1.1.2"), v("1.1.1"))).toBeGreaterThan(0);
    expect(compareSemVer(v("1.1.1"), v("1.1.1"))).toBe(0);
    expect(compareSemVer(v("1.0.0"), v("1.0.1"))).toBeLessThan(0);
  });
});

describe("validateManifest", () => {
  it("accepts a well-formed manifest", () => {
    expect(validateManifest(manifest())).toBeNull();
  });
  it("rejects non-objects", () => {
    expect(validateManifest(null)).not.toBeNull();
    expect(validateManifest("nope")).not.toBeNull();
  });
  it("rejects a bad version", () => {
    expect(validateManifest(manifest({ version: "1.0" }))).toMatch(/version/);
  });
  it("rejects a non-integer item_count", () => {
    expect(validateManifest({ ...manifest(), item_count: 1.5 })).toMatch(/item_count/);
  });
  it("rejects a bad min_app_version", () => {
    expect(validateManifest(manifest({ min_app_version: "x" }))).toMatch(/min_app_version/);
  });
  it("rejects a non-string content hash", () => {
    expect(validateManifest({ ...manifest(), content_hashes: { a: 1 } })).toMatch(/content_hashes/);
  });
});

describe("decideUpdate", () => {
  it("installs when nothing is installed yet", () => {
    const d = decideUpdate(null, manifest({ version: "0.1.0" }), "0.1.0");
    expect(d.kind).toBe("update");
  });

  it("updates to a strictly newer compatible version", () => {
    const installed = manifest({ version: "1.0.0" });
    const d = decideUpdate(installed, manifest({ version: "1.1.0" }), "0.1.0");
    expect(d.kind).toBe("update");
    expect(d.reason).toContain("1.0.0");
    expect(d.reason).toContain("1.1.0");
  });

  it("is up-to-date when the candidate equals the installed version", () => {
    const installed = manifest({ version: "1.2.3" });
    expect(decideUpdate(installed, manifest({ version: "1.2.3" }), "0.1.0").kind).toBe("up-to-date");
  });

  it("refuses a downgrade (up-to-date)", () => {
    const installed = manifest({ version: "2.0.0" });
    expect(decideUpdate(installed, manifest({ version: "1.9.9" }), "0.1.0").kind).toBe("up-to-date");
  });

  it("ignores a candidate for a different pack", () => {
    const installed = manifest({ pack_id: "ca-foundation-qa" });
    const d = decideUpdate(installed, manifest({ pack_id: "other", version: "9.0.0" }), "0.1.0");
    expect(d.kind).toBe("incompatible-pack");
  });

  it("refuses an update that needs a newer app", () => {
    const installed = manifest({ version: "1.0.0" });
    const d = decideUpdate(installed, manifest({ version: "2.0.0", min_app_version: "0.5.0" }), "0.1.0");
    expect(d.kind).toBe("incompatible-app");
    expect(d.reason).toContain("0.5.0");
  });

  it("allows an update whose min_app_version exactly matches the app", () => {
    const installed = manifest({ version: "1.0.0" });
    const d = decideUpdate(installed, manifest({ version: "2.0.0", min_app_version: "0.1.0" }), "0.1.0");
    expect(d.kind).toBe("update");
  });

  it("treats an unparseable app version as invalid", () => {
    expect(decideUpdate(null, manifest(), "garbage").kind).toBe("invalid");
  });

  it("heals a corrupt installed version with a valid candidate", () => {
    const installed = manifest({ version: "not-a-version" as unknown as string });
    const d = decideUpdate(installed, manifest({ version: "1.0.0" }), "0.1.0");
    expect(d.kind).toBe("update");
  });
});
