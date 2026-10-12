import { DateTime } from "luxon";

export function formatRange(
  start: Date | string,
  end: Date | string,
  timeZone: string,
): string {
  const from = DateTime.fromJSDate(new Date(start)).setZone(timeZone);
  const to = DateTime.fromJSDate(new Date(end)).setZone(timeZone);

  return `${from.toFormat("ccc d LLL, h:mm a")} – ${to.toFormat("h:mm a")}`;
}

export function formatDeadline(deadline: Date | string, timeZone: string): string {
  const dt = DateTime.fromJSDate(new Date(deadline)).setZone(timeZone);
  const now = DateTime.now().setZone(timeZone);
  const days = Math.ceil(dt.diff(now, "days").days);

  const absolute = dt.toFormat("ccc d LLL, h:mm a");

  // "Due date passed", not "overdue": no red piles, no guilt (brief, principle
  // 5). Compared as instants: rounding the day count made a deadline earlier
  // today (or late yesterday) read "today".
  if (dt < now) return `${absolute} · due date passed`;
  if (days === 0) return `${absolute} · today`;
  if (days === 1) return `${absolute} · tomorrow`;
  return `${absolute} · in ${days} days`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function minutesToLabel(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function labelToMinutes(label: string): number {
  const [h, m] = label.split(":").map((part) => Number.parseInt(part, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Low",
  2: "Normal",
  3: "High",
  4: "Critical",
};
