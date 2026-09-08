/**
 * CA Foundation QA pack loader (ADR 0027).
 *
 * Loads the REAL shipped pack plus the profile's blueprint.json and
 * marking.json, and shapes them into the three engine inputs. The pack body
 * itself is no longer a bundled module: it arrives at runtime through
 * pack/source.ts, which reads it from storage (after the first load) or
 * fetches it over HTTP (on the first load), the same way the update flow
 * does. blueprint.json and marking.json stay static imports because they are
 * small, tracked schema files, not the pack build artifact.
 *
 * This is the one place the app shapes the pack into engine inputs. The
 * practice-content loader (flows/practice/content.ts) reads the same raw pack
 * for its own, different fields.
 */

import { loadRawPack } from "../pack/source.js";
import { loadPack, type LoadedPack, type RawPack } from "./pack.js";

/**
 * Load the raw pack and the profile's blueprint and marking, then shape them
 * into the engine's LoadedPack. The blueprint and marking import()s are split
 * by Vite into chunks separate from the entry, so this data is only fetched
 * when a screen actually needs it.
 */
export async function loadCaPack(): Promise<LoadedPack> {
  const [pack, blueprint, marking] = await Promise.all([
    loadRawPack(),
    import("../../../schema/profiles/ca-foundation-qa/blueprint.json"),
    import("../../../schema/profiles/ca-foundation-qa/marking.json"),
  ]);
  // The raw pack carries item fields (stem, options, …) the RawPack type
  // omits, so it needs a cast; the blueprint and marking JSON are structurally
  // assignable.
  return loadPack(pack as RawPack, blueprint.default, marking.default);
}
