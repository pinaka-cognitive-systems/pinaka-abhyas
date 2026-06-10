/**
 * The student's own reminder (W5-9 mechanism 4).
 *
 * Spec: "Settings gains one opt-in: a local notification at a student-chosen
 * time of day, using the Notification API where available, fully off by
 * default, with the plain line that this is the student's own alarm and the app
 * neither knows nor cares whether it is answered. No escalation, no copy
 * variation, no re-prompting when ignored. Where notifications are unavailable
 * (iOS uninstalled), the setting explains that honestly and suggests installing
 * first."
 *
 * Design: the reminder setting is two meta values (enabled flag + HH:MM time),
 * off by default. A lightweight scheduler runs on app open: it asks the browser
 * to fire ONE local notification at the next occurrence of the chosen time via
 * setTimeout, and re-arms on the next open. There is NO background sync and no
 * pretension of one; the limitation is stated honestly in the settings copy
 * (copy.ts: reminder.limitation). The browser surface (Notification API,
 * permission, scheduling) is isolated below `ReminderEnv` so the pure logic is
 * fully testable without a DOM.
 *
 * This module is pure logic + the meta seam + the scheduler. It owns NO React.
 */

import type { StorageAdapter } from "../../storage/index.js";

/** Reminder-owned meta keys. Plain strings; off by default (absent = off). */
export const REMINDER_META_KEYS = {
  /** "true" when the student turned the reminder on. Absent/anything-else = off. */
  enabled: "reminder_enabled",
  /** The chosen time, "HH:MM" 24-hour. Absent uses DEFAULT_TIME. */
  time: "reminder_time",
} as const;

/** The default time offered when the student first turns the reminder on. */
export const DEFAULT_TIME = "19:00";

/** The reminder's persisted setting. */
export interface ReminderSetting {
  readonly enabled: boolean;
  /** "HH:MM" 24-hour. */
  readonly time: string;
}

/** Off-by-default setting. */
export const REMINDER_OFF: ReminderSetting = { enabled: false, time: DEFAULT_TIME };

/** Validate an "HH:MM" 24-hour string. Returns the normalized value or null. */
export function parseTime(raw: string | null): string | null {
  if (raw === null) return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw.trim());
  if (m === null) return null;
  return `${m[1]}:${m[2]}`;
}

/** Read the reminder setting from meta. Off by default; a corrupt time falls
 * back to the default so a bad value never breaks the surface. */
export async function readReminder(adapter: StorageAdapter): Promise<ReminderSetting> {
  const [enabledRaw, timeRaw] = await Promise.all([
    adapter.getMeta(REMINDER_META_KEYS.enabled),
    adapter.getMeta(REMINDER_META_KEYS.time),
  ]);
  return {
    enabled: enabledRaw === "true",
    time: parseTime(timeRaw) ?? DEFAULT_TIME,
  };
}

/** Persist the reminder setting (one tap on, one tap off). */
export async function writeReminder(
  adapter: StorageAdapter,
  setting: ReminderSetting,
): Promise<void> {
  await adapter.setMeta(REMINDER_META_KEYS.enabled, setting.enabled ? "true" : "false");
  await adapter.setMeta(REMINDER_META_KEYS.time, setting.time);
}

/**
 * Milliseconds from `nowMs` to the next occurrence of "HH:MM" in the student's
 * LOCAL time. Pure: the local-time pieces are passed in via `local` so this is
 * deterministic and testable; the view supplies them from a Date at the
 * boundary. Always returns a strictly positive delay (if the time is now or
 * past today, it targets tomorrow), so a reminder never fires instantly.
 */
export function msUntilNext(
  time: string,
  local: { readonly nowMs: number; readonly localMsIntoDay: number },
): number {
  const parsed = parseTime(time) ?? DEFAULT_TIME;
  const [hh, mm] = parsed.split(":").map((s) => Number.parseInt(s, 10));
  const targetMsIntoDay = (hh! * 60 + mm!) * 60_000;
  const DAY = 86_400_000;
  let delta = targetMsIntoDay - local.localMsIntoDay;
  if (delta <= 0) delta += DAY;
  return delta;
}

// ---------------------------------------------------------------------------
// Availability and permission (the honest unavailability path).
// ---------------------------------------------------------------------------

/** Whether the reminder can work at all, and why not when it cannot. */
export type ReminderAvailability =
  /** Notification API present and not blocked: the reminder can be turned on. */
  | "available"
  /** API present but the browser has denied permission. */
  | "denied"
  /** No Notification API in this browser (e.g. iOS Safari not installed). */
  | "unavailable";

/** The browser capabilities the availability check reads. Injected so tests do
 * not need a DOM. */
export interface ReminderCaps {
  /** typeof window !== "undefined" && "Notification" in window. */
  readonly hasNotificationApi: boolean;
  /** Notification.permission, when the API exists. */
  readonly permission: NotificationPermission | null;
}

/** Map capabilities to availability. */
export function reminderAvailability(caps: ReminderCaps): ReminderAvailability {
  if (!caps.hasNotificationApi) return "unavailable";
  if (caps.permission === "denied") return "denied";
  return "available";
}

// ---------------------------------------------------------------------------
// The scheduler seam (browser side, isolated for testability).
// ---------------------------------------------------------------------------

/** The browser side the scheduler touches. A test supplies a fake. */
export interface ReminderEnv {
  /** Current capabilities (API present, permission). */
  caps(): ReminderCaps;
  /** Request permission; resolves to the resulting permission. */
  requestPermission(): Promise<NotificationPermission>;
  /** Schedule `fire` after `delayMs`; returns a cancel handle. */
  schedule(delayMs: number, fire: () => void): () => void;
  /** Show a notification now (called by the scheduled callback). */
  notify(title: string, body: string): void;
  /** Local-time pieces for msUntilNext, read once at arm time. */
  localNow(): { readonly nowMs: number; readonly localMsIntoDay: number };
}

/**
 * Arm the next reminder, if the setting is on and the reminder is available.
 * Returns a cancel handle (a no-op when nothing was armed). This is the whole
 * scheduler: called once on app open, it sets a single timer for the next
 * occurrence and shows one notification. It does NOT re-arm itself in the
 * background — re-arming happens on the next app open, which the honest
 * limitation copy states plainly. Pure orchestration over the injected env.
 */
export function armReminder(
  setting: ReminderSetting,
  env: ReminderEnv,
  message: { readonly title: string; readonly body: string },
): () => void {
  if (!setting.enabled) return () => {};
  if (reminderAvailability(env.caps()) !== "available") return () => {};
  if (env.caps().permission !== "granted") return () => {};
  const delay = msUntilNext(setting.time, env.localNow());
  return env.schedule(delay, () => env.notify(message.title, message.body));
}
