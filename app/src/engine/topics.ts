/**
 * topics.ts — human names for taxonomy nodes.
 *
 * The Profile taxonomy carries the official name of every node ("Simple
 * interest", "Arithmetic mean"). Student surfaces show those names, never raw
 * node ids: a student reads "Simple interest", not
 * "qa.bmath.finance.simple_interest". Loaded lazily so the taxonomy joins the
 * pack-data chunk, not the entry bundle (ADR 0008).
 *
 * The leaf-segment fallback covers ids the loaded taxonomy does not know
 * (e.g. a newer pack served mid-update): it title-cases the id's leaf, which
 * is right for single-word leaves and merely plain for compound ones.
 */

interface TaxonomyNode {
  readonly id: string;
  readonly name: string;
}

let cache: ReadonlyMap<string, string> | null = null;

/** Load (once) the node-id to display-name map from the Profile taxonomy. */
export async function loadTopicNames(): Promise<ReadonlyMap<string, string>> {
  if (cache !== null) return cache;
  const mod = await import("../../../schema/profiles/ca-foundation-qa/taxonomy.json");
  const nodes = (mod.default as { readonly nodes: readonly TaxonomyNode[] }).nodes;
  cache = new Map(nodes.map((n) => [n.id, n.name]));
  return cache;
}

/** Title-case a node id's leaf segment, e.g. "qa.bmath.finance.simple_interest"
 * to "Simple Interest". Fallback only; the taxonomy name wins when known. */
export function fallbackTopicLabel(nodeId: string): string {
  const leaf = nodeId.slice(nodeId.lastIndexOf(".") + 1);
  return leaf
    .split("_")
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** The display name for a node id: taxonomy name, else leaf fallback, else
 * null when there is no node id to name. */
export function topicLabel(
  names: ReadonlyMap<string, string> | null,
  nodeId: string | null,
): string | null {
  if (nodeId === null) return null;
  return names?.get(nodeId) ?? fallbackTopicLabel(nodeId);
}

let misconceptionCache: ReadonlyMap<string, string> | null = null;

/** Load (once) the misconception-id to display-name map from the Profile
 * canon ("arithmetic_slip" reads "Arithmetic slip"). Same lazy-chunk rationale
 * as loadTopicNames. */
export async function loadMisconceptionNames(): Promise<ReadonlyMap<string, string>> {
  if (misconceptionCache !== null) return misconceptionCache;
  const mod = await import("../../../schema/profiles/ca-foundation-qa/misconceptions.json");
  const entries = (mod.default as { readonly misconceptions: readonly TaxonomyNode[] }).misconceptions;
  misconceptionCache = new Map(entries.map((n) => [n.id, n.name]));
  return misconceptionCache;
}
