# ADR 0015: Mathematical notation is unicode-first, KaTeX is the pre-approved escape

Date: 2026-06-10
Status: Accepted.

## Context

Items are markdown with raw HTML disabled. Quantitative Aptitude needs powers, roots,
fractions, set and probability notation, and basic calculus notation. No policy
existed (audit follow-up), which silently shaped generation, validation, and rendering.
A full LaTeX stack costs real bytes against the ADR 0008 2.0 MB ceiling and adds a
rendering dependency for every screen.

## Decision

- Authoring is unicode-first, with explicit conventions baked into the generation
  rubric and a content lint: multiplication ×, division ÷ or fraction slash, powers as
  superscript characters (², ³) or the word form where clearer, roots as √, set and
  probability symbols (∩, ∪, P(A|B)), inline fractions as (3/20), derivatives as
  dy/dx, simple integrals as ∫ with inline bounds. Indian digit grouping (1,00,000) in
  money contexts.
- The lint hard-rejects LaTeX commands, HTML tags, and any character outside an
  allowlisted set, ending the "LaTeX garbage passes every layer" failure mode.
- Legibility at 360px is an acceptance test for formula-bearing items on the low-end
  device profile.
- The escape hatch is decided in advance: if the Gate A pilot surfaces item classes
  that genuinely cannot be expressed legibly in unicode, a constrained KaTeX subset is
  pre-approved with a budget allocation of at most 150 KB transferred, and the
  authoring conventions for those item classes switch to delimited TeX validated by
  the lint. No other rendering technology is in scope.

## Consequences

- Generation (W4-3), validation (W3-5), and the app's item renderer share one
  convention; the renderer for v1 is plain text plus the unicode glyphs, costing zero
  bytes.
- CA Foundation Paper 3's actual notation needs (business math, LR, basic statistics
  and calculus) fit unicode comfortably; the escape hatch exists so this claim is
  falsifiable at the pilot rather than load-bearing forever.
