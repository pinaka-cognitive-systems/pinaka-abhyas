/**
 * Service-worker registration smoke test (W5-4).
 *
 * Thin by design: registration is glue, and the worker's actual caching is
 * verified by the offline self-check (scripts/check-offline.mjs) against a real
 * build, not here. This test only proves the registration glue calls register()
 * with the right script in production and skips cleanly otherwise — the parts
 * that need a browser are out of scope for a node unit test.
 */

import { describe, expect, it, vi } from "vitest";
import { registerSW } from "../../src/sw/register.js";

describe("registerSW", () => {
  it("skips entirely outside a production build (dev fights HMR)", async () => {
    const register = vi.fn();
    const container = { register } as unknown as ServiceWorkerContainer;
    const result = await registerSW({ isProduction: false, container });
    expect(result).toEqual({ status: "skipped", reason: "not a production build" });
    expect(register).not.toHaveBeenCalled();
  });

  it("registers /sw.js as a module in production", async () => {
    const register = vi.fn().mockResolvedValue({});
    const container = { register } as unknown as ServiceWorkerContainer;
    const result = await registerSW({ isProduction: true, container });
    expect(result).toEqual({ status: "registered" });
    expect(register).toHaveBeenCalledWith("/sw.js", { type: "module" });
  });

  it("skips when the serviceWorker API is unavailable", async () => {
    // No container injected and no navigator.serviceWorker in node → unavailable.
    const result = await registerSW({ isProduction: true });
    expect(result.status).toBe("skipped");
  });

  it("reports a failed registration without throwing", async () => {
    const register = vi.fn().mockRejectedValue(new Error("boom"));
    const container = { register } as unknown as ServiceWorkerContainer;
    const result = await registerSW({ isProduction: true, container });
    expect(result.status).toBe("failed");
  });
});
