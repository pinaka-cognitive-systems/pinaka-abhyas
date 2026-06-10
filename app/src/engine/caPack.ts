/**
 * Lazy CA Foundation QA pack loader (W5-3).
 *
 * Loads the REAL shipped pack — packs/ca-foundation-qa/pack.json (the build
 * artifact) plus the profile's blueprint.json and marking.json — into the three
 * engine inputs, via dynamic import() so the pack bytes land in their OWN lazy
 * chunk and never bloat the entry chunk (ADR 0008 byte budget; W5-3 requires the
 * pack to load lazily).
 *
 * This is the dev/demo path. The production update flow (service worker fetch,
 * manifest handshake, atomic swap, errata notes) is W5-4 and supersedes this;
 * the shaping (loadPack) is shared between them.
 */

import { loadPack, type LoadedPack, type RawPack } from "./pack.js";

/**
 * Dynamically import and shape the real CA pack. The three import()s are split
 * by Vite into chunks separate from the entry, so the practice/diagnosis data
 * is only fetched when a screen actually needs it.
 */
export async function loadCaPack(): Promise<LoadedPack> {
  const [pack, blueprint, marking] = await Promise.all([
    import("../../../packs/ca-foundation-qa/pack.json"),
    import("../../../schema/profiles/ca-foundation-qa/blueprint.json"),
    import("../../../schema/profiles/ca-foundation-qa/marking.json"),
  ]);
  // pack.json carries item fields (stem, options, …) the RawPack type omits, so
  // it needs a cast; the blueprint and marking JSON are structurally assignable.
  return loadPack(pack.default as unknown as RawPack, blueprint.default, marking.default);
}
