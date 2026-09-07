# ADR 0007: One domain, marketing site renders from the repo

Date: 2026-06-10
Status: Accepted. Not published.

## Note

This decision covers the operator's marketing domain and hosting. It touches no
code, schema, engine, or content in this repository. The full record is kept in
the operator's internal documents and is not published here.

What it means for this repository, stated once:

- The repository is canonical. Any website renders from it and never duplicates
  it by hand.
- Community exam packs must pass both validator tiers and are labeled "community
  pack", which is distinct from "verified pack".
- The PWA carries no marketing content. One small about screen links out.

The ADR number is kept so that later ADRs which reference 0007 still resolve.
