import { DateTime } from "luxon";

import { clip, normalize, pad, subtract } from "@/lib/scheduler/intervals";
import {
  minutesToMs,
  type Interval,
  type ProfileAvailability,
} from "@/lib/scheduler/types";

export type WindowSpec = {
  /** 1 = Monday ... 7 = Sunday. */
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type ProfileSpec = {
  id: string;
  bufferMinutes: number;
  windows: WindowSpec[];
};

/**
 * Turns a weekly window (e.g. "Mon 09:00–21:00") into concrete instants across
 * the horizon, in the user's own time zone. Using `set` rather than adding
 * minutes to midnight keeps 9am meaning 9am across a DST change.
 */
function expandWindow(
  dayStart: DateTime,
  startMinute: number,
  endMinute: number,
): Interval | null {
  // An end at or before the start means the window runs past midnight,
  // e.g. a 22:00–02:00 job shift.
  const normalizedEnd = endMinute <= startMinute ? endMinute + 1440 : endMinute;

  const at = (minute: number) =>
    dayStart
      .plus({ days: Math.floor(minute / 1440) })
      .set({
        hour: Math.floor(minute / 60) % 24,
        minute: minute % 60,
        second: 0,
        millisecond: 0,
      });

  const start = at(startMinute).toMillis();
  const end = at(normalizedEnd).toMillis();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return { start, end };
}

/**
 * Free time per profile: the profile's weekly windows across the horizon, minus
 * everything already on the calendar (padded by the profile's buffer).
 */
export function buildProfileAvailability(input: {
  profiles: ProfileSpec[];
  busy: Interval[];
  from: Date;
  to: Date;
  timeZone: string;
}): ProfileAvailability[] {
  const fromMs = input.from.getTime();
  const toMs = input.to.getTime();
  const horizon: Interval = { start: fromMs, end: toMs };

  const zone = input.timeZone;
  const firstDay = DateTime.fromMillis(fromMs, { zone }).startOf("day");
  const lastDay = DateTime.fromMillis(toMs, { zone }).startOf("day");

  const days: DateTime[] = [];
  for (
    let day = firstDay;
    day <= lastDay;
    day = day.plus({ days: 1 }).startOf("day")
  ) {
    days.push(day);
    if (days.length > 400) break; // guardrail against a runaway horizon
  }

  const busyIntervals = normalize(input.busy);

  return input.profiles.map((profile) => {
    const raw: Interval[] = [];

    for (const day of days) {
      for (const window of profile.windows) {
        if (window.dayOfWeek !== day.weekday) continue;
        const interval = expandWindow(day, window.startMinute, window.endMinute);
        if (interval) raw.push(interval);
      }
    }

    const padded = pad(busyIntervals, minutesToMs(profile.bufferMinutes));

    return {
      profileId: profile.id,
      bufferMinutes: profile.bufferMinutes,
      intervals: subtract(clip(raw, horizon), padded),
    };
  });
}
