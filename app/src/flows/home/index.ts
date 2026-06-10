/**
 * Home flow barrel (W5-9 honest adherence).
 *
 * The home surface is the default route for a returning student. It exports the
 * view and the pure mechanism logic so the router lazy-imports the view and the
 * tests import the logic without a DOM.
 */

export { HomeFlow, type HomeFlowProps } from "./HomeFlow.js";

export {
  deriveTodayCard,
  isReentry,
  isTodayDone,
  lastActiveMs,
  priorDayBoundaryMs,
  eventsBefore,
  eventsSince,
  MS_PER_DAY,
  REENTRY_GAP_DAYS,
  type TodayCard,
} from "./logic.js";

export {
  buildDelta,
  deltaLine,
  firmerNodeCount,
  costliestMisconception,
  FIRMER_RATING_EPSILON,
  type Delta,
} from "./delta.js";

export {
  armReminder,
  msUntilNext,
  parseTime,
  readReminder,
  writeReminder,
  reminderAvailability,
  REMINDER_OFF,
  DEFAULT_TIME,
  REMINDER_META_KEYS,
  type ReminderSetting,
  type ReminderAvailability,
  type ReminderCaps,
  type ReminderEnv,
} from "./reminder.js";

export {
  recordDay,
  recordSessionStart,
  readInstrumentation,
  parseLog,
  utcDay,
  ADHERENCE_META_KEY,
  type DayFlags,
  type AdherenceLog,
  type InstrumentationBlock,
} from "./instrument.js";

export { COPY as HOME_COPY } from "./copy.js";
