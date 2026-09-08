/**
 * Practice-content loader (ADR 0027).
 *
 * Reads the SAME pack the engine pack loader uses, but reads the human
 * content fields (stem, options, answer key, rationale, explanation) the
 * engine ignores. The pack arrives through pack/source.ts (loadRawPack),
 * which reads it from storage after the first load, or fetches it over HTTP
 * on the first load, the same way the update flow does. There is one loader
 * for the raw pack; this module and the engine loader each shape it for
 * their own fields.
 */

import { loadRawPack } from "../../pack/source.js";
import { buildContentMap, type ContentItem, type RawContentItem } from "./types.js";

interface RawPackFile {
  readonly items: readonly RawContentItem[];
}

/** Load the CA pack and build the screen-content lookup. */
export async function loadCaContent(): Promise<ReadonlyMap<string, ContentItem>> {
  const pack = (await loadRawPack()) as RawPackFile;
  return buildContentMap(pack.items);
}
