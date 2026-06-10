# ADR 0011: Device target: phone floor, desktop best

Date: 2026-06-10
Status: Accepted.

## Context

ADR 0001 says the app must run on low-end laptops, and its distribution argument is
that a URL forwards inside WhatsApp and Telegram where an installer cannot. Those two
statements pull in different directions: a forwarded link is opened on a phone, almost
always, and in the audience this project serves (students who cannot afford coaching) a
meaningful share own a phone and no laptop at all. Meanwhile the studying itself favors
a big screen: two-hour mocks, formula reading, working steps. The real exam is on
neither device. The design team's v1 and v2 prototypes assumed a desktop window, with
v2 breakpoints stopping at 899px; the narrow half of the product was undesigned.

## Decision

One responsive app with a floor and a best, decided per surface rather than globally.

- The floor is the phone. Every screen must be fully usable at 360px width. No feature
  is gated by device. A phone-only student gets the complete product, including mocks
  and the readiness estimate.
- The best is the desktop. Mocks and deep diagnosis are designed to shine on a laptop
  while remaining fully functional on the phone.
- The daily practice loop, first-run, and install flows are designed phone-native,
  because that is where the link opens.
- Mocks on the phone get a pre-mock device note in the product voice, a distraction
  shield (do-not-disturb prompt, battery check), and interruption recovery. The form
  factor of each attempt is recorded in the event log so difficulty calibration can
  separate hard questions from small screens.
- Layouts are designed at the narrow size first, because widening is cheap and
  shrinking is rework.

## Consequences

- The corrective brief to the design team carries this framing; their v3 must cover the
  360px floor.
- The event schema gains an optional device-context field in its next version, before
  any real student exists.
- Performance budgets are set against a low-end Android profile, since the floor device
  is the constrained one.
