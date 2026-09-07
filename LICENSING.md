# Licensing

pinaka-abhyas ships under two licenses, both in effect, plus a commercial license you
can buy if neither fits your use.

| What | License | File |
|---|---|---|
| Application and engine code | GNU AGPL-3.0 | `LICENSE` |
| Question content | CC BY-NC-SA 4.0 | `LICENSE-CONTENT.md` |
| Commercial use of either | Negotiated, paid | `COMMERCIAL.md` |
| The name and logo | Not licensed by default | `TRADEMARK.md` |
| Contributing | Contributor License Agreement | `CLA.md` |

## Application (code): GNU AGPL-3.0

The app and the engine are free and open-source under the GNU Affero General
Public License v3.0. Full text in `LICENSE`. You may use, study, modify, and
redistribute the code. If you distribute a modified version, or run one as a
network service, you must release your source under the same license.

AGPL does not forbid commercial use. It forbids closed-source use. A company that
cannot meet the source-disclosure obligation buys a commercial license instead.

## Questions (content): CC BY-NC-SA 4.0

The shipped question bank is free for students to download and use, under
Creative Commons Attribution-NonCommercial-ShareAlike 4.0. Full notice in
`LICENSE-CONTENT.md`.

- BY: credit Pinaka.
- NC: no commercial use.
- SA: derivatives must stay under this same license.

Free of cost, and open to fixes and translations. NC blocks a coaching company
from repackaging the bank for sale. SA keeps every derivative open.

Unlike AGPL, the NonCommercial term cannot be complied with. Commercial use of the
content is simply not licensed. It needs a separate agreement.

## Commercial license

If you are making money from this, you need one. `COMMERCIAL.md` defines what counts
as commercial use, with worked examples on both sides of the line, and explains what a
commercial license grants. Email `license@mypinaka.com`.

## Trademarks

Neither license grants any right to the Pinaka name or logo. Fork the code freely;
rename before you distribute. See `TRADEMARK.md`.

## Contributing

Every contributor signs the CLA in `CLA.md` before their first merge. It grants the
Licensor the right to relicense contributions, which is what keeps the commercial
license sellable over the whole work. Contributors keep their own copyright. The gate
is automated in `.github/workflows/cla.yml`.

## Our content is original

Every shipped question is written for Pinaka from the public CA Foundation
syllabus. We do not redistribute ICAI's papers, or any exam board's questions.

The questions are drafted by Claude models at build time, under a rubric Pinaka
wrote, and each one then has to pass an executable solution that re-derives its
answer key in CI. `docs/adr/0004-build-time-ai-zero-runtime-ai.md` and
`specs/content-pipeline.md` describe the pipeline, and every item records its
generator in `provenance.generator`. No model runs on a student's device.

Pinaka holds whatever rights exist in this output, which is what lets us grant
the content license. How copyright applies to machine-generated text is unsettled
in several countries, and we do not claim more than the law gives us.

## The generator: private

The content generator (prashna) is not released.

## Fonts: SIL OFL 1.1

The app ships subset builds of IBM Plex Sans and IBM Plex Mono (Copyright IBM
Corp.), licensed under the SIL Open Font License 1.1. The full license text
ships with the fonts at `app/public/fonts/OFL.txt`. Subsetting is permitted by
the OFL; the subsets are built by `app/scripts/make-fonts.py`.

## Bundled third-party code

The production build bundles three runtime dependencies, all under licenses
compatible with AGPL-3.0 redistribution:

- React and React DOM (Meta Platforms) — MIT.
- `@sqlite.org/sqlite-wasm` (SQLite Consortium) — the SQLite source is public
  domain; the wasm distribution ships its own notice.

Every other dependency in `app/` and `engine-ts/` is a build or test tool and does
not ship. See `SECURITY.md`.

## Per-item license field

Every question carries `provenance.license`, an SPDX identifier:

- `CC-BY-NC-SA-4.0`: shipped, Pinaka-owned content.
- `LicenseRef-pinaka-internal-unreleased`: internal drafts not cleared for
  release. Never shipped.

## Copyright

Copyright 2026 Shiva Padakanti. Code under AGPL-3.0, question content under
CC BY-NC-SA 4.0. Pinaka is the project and brand name; Shiva Padakanti is the
copyright holder and the party who grants commercial licenses.
