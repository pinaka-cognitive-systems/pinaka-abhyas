/**
 * Pre-mock screen logic (W5-7): the device note, the distraction-shield
 * checklist, and the mock-length / time-budget framing.
 *
 * Binding to ADR 0011 (mock device policy): allow both devices, recommend the
 * bigger screen, never block. A phone-only student gets the full mock and the
 * readiness estimate. The note is in the Fellow voice (no exclamation marks, no
 * contractions, no em-dashes; see brand-core.md) and never gates the start.
 *
 * Pure and DOM-free: the viewport, the battery reading, and the assembled mock
 * are all parameters. The React layer reads window.innerWidth and the Battery
 * API at the boundary and passes the values in; this module only shapes copy and
 * checklist state.
 */

import { formFactor, type DeviceContext } from "../practice/event.js";
import type { AssembledMock, ScaledMarking } from "./assembler.js";

/**
 * The device note shown before a mock, per the form factor. On a phone we
 * recommend a larger screen for the next mock but make clear the phone gives the
 * complete mock and the same readiness estimate (ADR 0011: never block). On a
 * laptop we confirm the screen is well suited. Fellow voice throughout.
 */
export function deviceNote(formFactorValue: DeviceContext["form_factor"]): string {
  switch (formFactorValue) {
    case "phone":
      return (
        "You are on a phone. This mock works in full on this screen, and your " +
        "result counts the same toward your readiness estimate. A two-hour paper " +
        "is easier on a larger screen if you have one for next time, but nothing " +
        "here is held back on a phone."
      );
    case "tablet":
      return (
        "You are on a tablet, which suits a long paper well. The mock and your " +
        "readiness estimate are the same on every device."
      );
    case "desktop":
      return (
        "You are on a larger screen, which suits a two-hour paper. The mock and " +
        "your readiness estimate are the same on every device."
      );
  }
}

/** The form factor for a viewport width, re-exported so the screen and the
 * note share one classifier (ADR 0011 breakpoints). */
export { formFactor };

/** A battery reading from the Battery Status API, or null where unavailable. */
export interface BatteryReading {
  /** Charge level in [0, 1]. */
  readonly level: number;
  /** True when the device is plugged in / charging. */
  readonly charging: boolean;
}

/**
 * The battery line of the distraction shield. Where the Battery API is
 * available and the device is low and not charging, we suggest plugging in
 * (a dead battery mid-mock is a lost attempt). Where the API is unavailable we
 * stay silent rather than nag with a check we cannot perform — honesty over
 * theatre. Returns null when no line should be shown.
 *
 * @param battery the reading, or null when the API is unavailable.
 * @param lowThreshold charge fraction below which to suggest charging (default 0.30).
 */
export function batteryLine(
  battery: BatteryReading | null,
  lowThreshold = 0.3,
): string | null {
  if (battery === null) return null; // API unavailable: silent, no fake check.
  if (battery.charging) {
    return "Your device is charging. Good — a full mock takes a while.";
  }
  if (battery.level < lowThreshold) {
    const pct = Math.round(battery.level * 100);
    return (
      `Your battery is at about ${pct} percent. Plug in before you begin, so a ` +
      `flat battery does not end the mock for you.`
    );
  }
  const pct = Math.round(battery.level * 100);
  return `Your battery is at about ${pct} percent, which should see you through.`;
}

/** One item of the distraction-shield checklist. Advisory: none of these gates
 * the start (ADR 0011: never block). */
export interface ShieldItem {
  readonly id: string;
  readonly label: string;
}

/**
 * The distraction-shield checklist. Fixed advisory items (do-not-disturb,
 * quiet space, time set aside) plus, conditionally, the battery line when it
 * has something honest to say. The student is encouraged to ready themselves;
 * nothing here blocks the start button.
 */
export function shieldChecklist(battery: BatteryReading | null): ShieldItem[] {
  const items: ShieldItem[] = [
    {
      id: "dnd",
      label:
        "Turn on do-not-disturb. A two-hour paper is hard to sit if a call or a " +
        "notification pulls you out of it.",
    },
    {
      id: "space",
      label: "Find a quiet spot where you will not be interrupted.",
    },
    {
      id: "time",
      label:
        "Set the time aside now. The clock runs in real time and counts any break " +
        "against you, the same as the exam hall.",
    },
  ];
  const bat = batteryLine(battery);
  if (bat !== null) items.push({ id: "battery", label: bat });
  return items;
}

/**
 * The mock-length and time-budget summary line, stated plainly and honestly
 * (W5-7: never pad with repeats; state the count plainly). When the mock is
 * shorter than the full paper, it says so and why; when it is full length it
 * says that too.
 */
export function lengthSummary(mock: AssembledMock, marking: ScaledMarking): string {
  const min = marking.durationMinutes;
  const minLine = `${min} ${min === 1 ? "minute" : "minutes"}`;
  if (mock.shortfall <= 0) {
    return (
      `This mock is the full ${mock.size}-question paper, with ${minLine} on the ` +
      `clock and a pass bar of ${marking.passMark} marks, net of negative marking.`
    );
  }
  return (
    `This mock is ${mock.size} questions, not the full ${mock.fullPaperSize}. ` +
    `The question bank does not yet hold enough verified items to fill every part ` +
    `without repeating questions, and a repeated question is not a fair test. So ` +
    `the mock is sized to what the bank honestly supports: ${minLine} on the clock, ` +
    `scaled from the two-hour paper, and a pass bar of ${marking.passMark} marks out ` +
    `of ${mock.size}, net of negative marking.`
  );
}

/** The families that fell short, for an honest per-part line in the note.
 * Only families that drew fewer than their quota appear. */
export interface ShortfallLine {
  readonly nodeId: string;
  readonly short: number;
}

export function shortfallLines(mock: AssembledMock): ShortfallLine[] {
  const out: ShortfallLine[] = [];
  for (const fam of mock.families) {
    if (fam.drawn < fam.quota) out.push({ nodeId: fam.nodeId, short: fam.quota - fam.drawn });
  }
  return out;
}
