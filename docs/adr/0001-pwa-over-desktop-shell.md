# ADR 0001: PWA over desktop shell

Date: 2026-06-10
Status: Accepted

## Context

pinaka-abhyas is a free, offline-capable practice app for CA Foundation students
in India. It must run on low-end laptops, work without internet after first load,
and reach students where they already are. Most of those students coordinate in
WhatsApp and Telegram groups. The app has no backend and a zero-cost hosting
target.

Two delivery shapes were on the table: a desktop application wrapped with Tauri,
or a static client-side progressive web app.

## Decision

v1 ships as a static client-side PWA. Vite, React, and TypeScript. Storage is
sqlite-wasm persisted to OPFS. Offline is handled by a service worker that caches
the app shell and the content pack. The app is installable, calls
`navigator.storage.persist()` to resist eviction, and offers one-click export and
import of progress as a file. It is hosted free on GitHub Pages or Cloudflare
Pages. There is no backend.

## Alternatives considered

Tauri desktop shell. A single Rust-wrapped build for Windows, macOS, and Linux,
with native SQLite. Rejected for v1 on three grounds. Unsigned installers trigger
SmartScreen on Windows and Gatekeeper on macOS, and there is no budget for signing
certificates, so every student would face a security warning. An installer cannot
be forwarded inside the WhatsApp and Telegram groups where the audience lives,
which breaks the most natural distribution path. It adds per-platform packaging
work for no student-facing benefit over a PWA.

## Consequences

- Distribution is a URL. A student opens a link, uses it offline, and can install
  it to the home screen. No download warning, no installer to forward.
- Storage is sqlite-wasm on OPFS, not native SQLite. Progress export and import
  give the student a portable backup and a migration path across devices.
- Hosting cost is zero on GitHub Pages or Cloudflare Pages.
- A Tauri wrapper remains a possible later add for students who want a native
  install. It is not part of v1 and does not block anything.
