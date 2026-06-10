# ADR 0008: Storage and hosting

Date: 2026-06-10
Status: Accepted. Details the storage and hosting half of ADR 0001, which named
sqlite-wasm on OPFS and "GitHub Pages or Cloudflare Pages" without choosing a VFS or a
host. Those two choices interact, so they are decided together here.

## Context

sqlite-wasm offers two persistent OPFS backends. The default `opfs` VFS requires
SharedArrayBuffer, which exists only under cross-origin isolation (COOP and COEP
response headers). GitHub Pages cannot set response headers. The `opfs-sahpool` VFS
needs no special headers, works on any static host, and is the faster backend; its
trade-off is a single connection (no concurrent multi-tab access). The audit
(PLT-01 through PLT-08) found ADR 0001's hosting sentence was therefore not a free
choice, and that nothing stated a browser floor, a byte budget, an eviction posture, or
a fallback chain. Separately, WebKit deletes all script-writable storage after seven
days of non-interaction for sites not installed to the home screen, so
`navigator.storage.persist()` alone cannot protect an iPhone tab user (PLT-02).

## Decision

- **VFS: `opfs-sahpool`.** No header requirements, best OPFS performance, host-agnostic.
- **Host: Cloudflare Pages**, with its free cookieless Web Analytics enabled for the
  app shell (page loads and return visits only; no study data, honoring the
  data-stays-on-device plank). GitHub Pages remains a documented fallback, viable
  precisely because sahpool needs no headers.
- **Browser floor:** Chrome 108+, Safari 16.4+, Firefox 111+ (the sahpool floor, all
  shipped by March 2023). Below the floor, or where OPFS is unavailable (private
  browsing, in-app webviews), the app runs in a clearly surfaced degraded mode:
  in-memory database with snapshot persistence to IndexedDB where available, and the
  export flow promoted prominently. The storage layer is an adapter interface with
  capability flags; sahpool and degraded mode are its two implementations.
- **Single connection handled with the Web Locks API.** A second tab gets an honest
  "already open in another tab" screen with a takeover option. No undefined behavior.
- **Persistence posture: install is the mechanism, persist() is a courtesy.**
  First-run on a supported device leads with install-to-home-screen. The app checks
  `navigator.storage.persisted()` and shows an honest storage-status indicator.
  Uninstalled iOS users get a periodic export reminder keyed to the seven-day
  eviction reality. Progress export/import (ADR 0001, formalized in ADR 0009) is the
  universal backstop.
- **In-app browser escape hatch.** WhatsApp and Telegram webviews are detected and the
  student is guided to open the link in a real browser before anything is stored.
- **First-load byte budget: 2.0 MB transferred, hard ceiling, enforced in CI**; the
  working target is 1.5 MB. Fonts ship subset with the OFL license text; the full
  design-drop font set does not ship. Formula rendering (the notation policy ADR)
  spends from this same budget.
- A Play Store TWA wrapper is explicitly post-v1; nothing in this decision blocks it.

## Consequences

- The storage adapter is the first code the app scaffold writes, against this contract.
- The coi-serviceworker hack for the default VFS on GitHub Pages is recorded as a
  rejected alternative: it trades a fragile bootstrap for headers we do not need.
- Analytics exist before telemetry (ADR 0006) without touching study data, so launch
  reach is measurable.
