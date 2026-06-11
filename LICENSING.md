# Licensing

pinaka-abhyas ships under two licenses. Both are in effect.

## Application (code): GNU AGPL-3.0

The app and the engine are free and open-source under the GNU Affero General
Public License v3.0. Full text in `LICENSE`. You may use, study, modify, and
redistribute the code. If you distribute a modified version, or run one as a
network service, you must release your source under the same license.

## Questions (content): CC BY-NC-SA 4.0

The shipped question bank is free for students to download and use, under
Creative Commons Attribution-NonCommercial-ShareAlike 4.0. Full notice in
`LICENSE-CONTENT.md`.

- BY: credit Pinaka.
- NC: no commercial use.
- SA: derivatives must stay under this same license.

Free of cost, and open to fixes and translations. NC blocks a coaching company
from repackaging the bank for sale. SA keeps every derivative open.

## Our content is original

Every shipped question is authored by Pinaka from the public CA Foundation
syllabus. We do not redistribute ICAI's papers, or any exam board's questions.
Pinaka owns what it ships, which is what lets us grant the content license.

## The generator: private

The content generator (prashna) is not released.

## Fonts: SIL OFL 1.1

The app ships subset builds of IBM Plex Sans and IBM Plex Mono (Copyright IBM
Corp.), licensed under the SIL Open Font License 1.1. The full license text
ships with the fonts at `app/public/fonts/OFL.txt`. Subsetting is permitted by
the OFL; the subsets are built by `app/scripts/make-fonts.py`.

## Per-item license field

Every question carries `provenance.license`, an SPDX identifier:

- `CC-BY-NC-SA-4.0`: shipped, Pinaka-owned content.
- `LicenseRef-pinaka-internal-unreleased`: internal drafts not cleared for
  release. Never shipped.

## Copyright

- Code: Copyright 2026 Shiv Padakanti, under AGPL-3.0.
- Content: Copyright 2026 Pinaka (Shiv Padakanti), under CC BY-NC-SA 4.0.
