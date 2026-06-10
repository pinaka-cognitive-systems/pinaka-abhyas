/**
 * Lazy practice-content loader (W5-5 flow a).
 *
 * Loads the SAME pack.json artifact the engine pack loader uses, but reads the
 * human content fields (stem, options, answer key, rationale, explanation) the
 * engine ignores. Uses dynamic import() so the pack bytes stay in their own lazy
 * chunk and never bloat the entry chunk (ADR 0008 byte budget). Because the
 * engine's caPack loader imports the same JSON module, Vite serves it from one
 * shared chunk — the content view costs no extra item bytes.
 */

import { buildContentMap, type ContentItem, type RawContentItem } from "./types.js";

interface RawPackFile {
  readonly items: readonly RawContentItem[];
}

/** Dynamically import the CA pack and build the screen-content lookup. */
export async function loadCaContent(): Promise<ReadonlyMap<string, ContentItem>> {
  const pack = (await import("../../../../packs/ca-foundation-qa/pack.json")) as {
    default: RawPackFile;
  };
  return buildContentMap(pack.default.items);
}
