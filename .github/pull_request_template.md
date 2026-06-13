<!-- Thanks for contributing to Pinaka Abhyas. Keep PRs focused and small. -->

## What and why

<!-- One or two sentences: what does this change and why. -->

## Type

- [ ] Content (questions / taxonomy / misconceptions)
- [ ] App or engine code
- [ ] Docs / ADR
- [ ] Build / CI / tooling

## Linked issue / ADR

<!-- e.g. Closes #123, or "implements ADR 0024". Load-bearing decisions need an ADR. -->

## Checklist

- [ ] Commit messages follow Conventional Commits (`type(scope): summary`) with **no** `Co-Authored-By` or `Generated with` trailers.
- [ ] Ran the gates relevant to this change:
  - Content: `python3 schema/validate.py` and `python3 schema/validator/run_checks.py` (and the solution harness if items changed).
  - App: `npm --prefix app run typecheck && npm --prefix app run lint && npm --prefix app test`.
  - Engine: `cd engine-ts && npx tsc --noEmit && npx vitest run`.
- [ ] No secrets, personal emails, or ICAI source material added (syllabus/, internal/, design-team/ stay untracked).
- [ ] Docs updated if behaviour or process changed.

## Notes for reviewers

<!-- Anything that helps review: trade-offs, follow-ups, screenshots. -->
