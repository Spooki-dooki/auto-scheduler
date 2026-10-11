/** A half-open time range [start, end) in epoch milliseconds. */
export type Interval = { start: number; end: number };

export type PlacementTask = {
  id: string;
  title: string;
  deadlineMs: number;
  durationMinutes: number;
  /** 1 = low ... 4 = critical. Higher wins ties. */
  priority: number;
  minBlockMinutes: number;
  maxBlockMinutes: number;
  profileId: string | null;
  createdAtMs: number;
};

/** Free time for one profile, already stripped of calendar conflicts. */
export type ProfileAvailability = {
  profileId: string | null;
  bufferMinutes: number;
  intervals: Interval[];
};

export type PlannedBlock = {
  taskId: string;
  start: number;
  end: number;
};

export type Shortfall = {
  taskId: string;
  missingMinutes: number;
  reason: "no-open-time" | "past-deadline" | "no-profile-windows";
};

export type PlacementResult = {
  blocks: PlannedBlock[];
  shortfalls: Shortfall[];
};

export const MINUTE_MS = 60_000;

export const minutesToMs = (minutes: number) => minutes * MINUTE_MS;
export const msToMinutes = (ms: number) => Math.round(ms / MINUTE_MS);
