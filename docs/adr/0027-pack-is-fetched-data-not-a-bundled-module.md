# ADR 0027: The pack is fetched data, not a bundled module

Date: 2026-09-08
Status: Accepted.

## Context

The question pack (`packs/ca-foundation-qa/pack.json`, built by
`build_and_validate.py`) was a bundled JSON module. Two files read it with a
static `import`: `app/src/engine/caPack.ts` and
`app/src/flows/practice/content.ts`. This caused four problems.

A fresh clone had no `packs/ca-foundation-qa/pack.json`, because it is a
generated, gitignored build artifact. `npm run dev` failed to start, because
Vite could not resolve the missing static import. Every app contributor
needed Python installed, just to run the pack build before they could see the
app at all.

Two loaders read the same file for two purposes. The engine loader shaped it
into engine inputs. The content loader read its human-facing fields. A change
to one had to be checked against the other by hand.

One test, `app/tests/flows/mock.assembler.test.ts`, imported the real pack
statically, so it could not load on a fresh clone either.

The pack update flow in `app/src/sw/` (ADR 0009, "Update flow") already
fetched `pack.manifest.json` and `pack.json` over HTTP. It expected the build
to emit them as served files. The build never did. Every update check hit a 404,
which the flow read as "offline" rather than reporting the real problem.

## Decision

The pack is a static data file, not a bundled module.

- `app/vite-plugin-pack.mjs` serves `pack.json` and `pack.manifest.json` from
  the dev server, and copies them into `dist/` at build time. A dev server
  without a built pack still starts, and answers a plain 404 that names the
  fix. A production build without a built pack fails, because an app without a
  pack cannot work.
- `app/src/pack/source.ts` is the one loader. It reads the pack through the
  same `PackStagingPort` the update flow already uses
  (`app/src/sw/storagePort.ts`). On the first load it fetches, validates, and
  commits the pack. On every later load it reads the live body already in
  storage. The engine loader (`app/src/engine/caPack.ts`) and the
  practice-content loader (`app/src/flows/practice/content.ts`) both call it.
  One place decides where the pack comes from.
- The dev server and the deployed app now serve the pack at the two URLs the
  update flow already expected, `DEFAULT_PACK_LOCATION` in
  `app/src/sw/network.ts`. So "check for updates" finds real files instead of
  a 404.
- `PackStagingPort` gained `readLiveBody()`, so the loader can read the
  already-staged pack text without fetching it again.

This does not contradict ADR 0008's byte budget or ADR 0009's pack lifecycle.
The pack still arrives lazily, off the entry chunk. It now arrives as a fetch
instead of a chunk. The manifest handshake, the atomic swap, and the mid-mock
guard from ADR 0009 are unchanged. This decision only fixes where the first
load's bytes come from.

## Consequences

- `npm run dev` now starts on a fresh clone with no pack built. The app shows
  a clear message naming the fix (`bash tools/dev.sh`) instead of failing to
  start.
- `npm run build` fails, with the same message, when the pack is missing,
  instead of shipping a broken app.
- The build output grows by 51 KB gzipped, from 1.724 MB to 1.775 MB. The
  manifest (33 KB) now ships beside the pack, because the update flow needs
  it. The pack as plain JSON is 18 KB larger than it was as a minified chunk.
  The ceiling in ADR 0008 is 2.0 MB.
- Offline behaviour is unchanged. The service worker's runtime cache still
  serves the pack bytes offline. The live copy committed to storage means a
  returning student never needs the network for it again.
- Tests that need the real shipped pack now read it from disk with
  `existsSync` and `readFileSync`. They skip instead of failing when it is not
  built. `app/tests/flows/mock.assembler.test.ts` and
  `app/tests/flows/machine.test.ts` follow this pattern.
