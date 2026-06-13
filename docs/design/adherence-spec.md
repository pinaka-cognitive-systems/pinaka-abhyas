# Honest adherence: design spec

Date: 2026-06-10. Owner: engineering lead. Implements plan task W5-9. Constraint set:
docs/brand/brand-core.md bans streaks, badges, daily-use pressure, and dark patterns;
the beta gate requires that students return without being chased, measured per
mechanism. This spec defines what an honest product may do about coming back.

## Principle

The product never manufactures motivation. It removes the three honest reasons
students drift away: not knowing what today's work is, not seeing that work change
anything, and shame on returning after a gap. Every mechanism below is information
the student already owns, surfaced plainly. Nothing counts consecutive days. Nothing
expires. Nothing is lost by being away.

## Mechanism 1: today, bounded and finite

The home surface (replacing the demo shell at the default route) is a single
decision-bearing card: today's session, sized to the engine's session length, with
what it will contain (reviews due, the weakest family by marks, new ground) drawn
from the engine's actual selection tiers. One action: begin. When the session
completes, today is DONE and says so: "Today's work is complete. More study today
adds little; come back tomorrow." A finite end is the honest alternative to a streak:
the reward is permission to stop.

## Mechanism 2: the delta, not the dashboard

On return (a new calendar day with prior history), one line above the today card:
what changed since last time, computed from the event log: "Since Tuesday: 14
questions, two topics firmer, compound interest still costs you about 3 marks."
Marks framing, band-honest (no decimal theater). If nothing improved, the line says
what was practised without praise or blame. Implemented as a pure function over two
engine states (then, now).

## Mechanism 3: re-entry without shame

After a gap of 7 or more days, the today card leads with the honest state, not the
gap: "Welcome back. Your estimates have widened while you were away; a short session
will sharpen them." This is literally true (deviation growth, ADR 0012). The session
that follows is a normal engine-driven session; the engine's own review economics
handle the backlog (budgeted, never a wall of overdue items). Never display the gap
length, never display what was "lost".

## Mechanism 4: the student's own reminder, if asked — REMOVED (ADR 0018 ruling 8)

Removed before shipping: ADR 0018 ruling 8 dropped the reminder setting from the
product ("may return if students ask"). The design below is kept as the agreed
shape IF it ever returns: one opt-in local notification at a student-chosen time
of day, fully off by default, the student's own alarm, no escalation, no copy
variation, no re-prompting when ignored, honest fallback copy where notifications
are unavailable.

## Instrumentation for the beta gate

Locally, in storage meta only (nothing leaves the device): per-day flags of which
mechanism was on the screen when a session started (today card, delta line, re-entry
card, reminder fired). The beta's manual check-ins read these from the student's
export with consent. This is the per-mechanism return-rate measurement the gate
demands, with zero telemetry.

## Acceptance

- No string anywhere contains streak language, day counts of absence, or urgency.
- The today card derives every claim from the engine (no invented numbers).
- The delta line is a pure, tested function of two engine states.
- Re-entry copy appears only past the gap threshold and reads as stated.
- Copy passes the deterministic voice gate.

(The reminder acceptance bullet was removed with Mechanism 4, ADR 0018 ruling 8.
The instrumentation list above predates that ruling; the "reminder fired" flag is
moot while the mechanism is out.)
