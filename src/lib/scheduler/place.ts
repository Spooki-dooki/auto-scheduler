import { clip, normalize, subtract } from "@/lib/scheduler/intervals";
import {
  minutesToMs,
  msToMinutes,
  type Interval,
  type PlacementResult,
  type PlacementTask,
  type PlannedBlock,
  type ProfileAvailability,
  type Shortfall,
} from "@/lib/scheduler/types";

/** Blocks start on a 5-minute boundary so the calendar stays readable. */
const GRANULARITY_MS = minutesToMs(5);

const roundUp = (ms: number) => Math.ceil(ms / GRANULARITY_MS) * GRANULARITY_MS;

export type PlaceInput = {
  tasks: PlacementTask[];
  availability: ProfileAvailability[];
  nowMs: number;
};

/**
 * Greedy earliest-fit placement.
 *
 * Tasks are ordered by deadline, then priority, so the work that is due
 * soonest — and the more important of two things due at the same time — claims
 * the earliest open time. Each task is then carved into chunks that respect its
 * min/max block size, and the time it takes (plus the profile's buffer) is
 * withheld from every task considered after it.
 *
 * Pure and synchronous: no calendar or database access, so it is fully testable.
 */
export function placeTasks(input: PlaceInput): PlacementResult {
  const { nowMs } = input;

  const byProfile = new Map<string | null, ProfileAvailability>();
  for (const entry of input.availability) byProfile.set(entry.profileId, entry);

  // A task with no profile may use any hours the user has declared.
  const anyProfile: ProfileAvailability = {
    profileId: null,
    bufferMinutes: Math.min(
      ...input.availability.map((a) => a.bufferMinutes),
      10,
    ),
    intervals: normalize(input.availability.flatMap((a) => a.intervals)),
  };

  const ordered = [...input.tasks].sort(
    (a, b) =>
      a.deadlineMs - b.deadlineMs ||
      b.priority - a.priority ||
      a.createdAtMs - b.createdAtMs,
  );

  const blocks: PlannedBlock[] = [];
  const shortfalls: Shortfall[] = [];

  /** Time already promised to earlier tasks, padded by their buffers. */
  const reserved: Interval[] = [];

  for (const task of ordered) {
    const profile = byProfile.get(task.profileId) ?? anyProfile;
    const bufferMs = minutesToMs(profile.bufferMinutes);
    const durationMs = minutesToMs(task.durationMinutes);

    if (task.deadlineMs <= nowMs) {
      shortfalls.push({
        taskId: task.id,
        missingMinutes: task.durationMinutes,
        reason: "past-deadline",
      });
      continue;
    }

    if (profile.intervals.length === 0) {
      shortfalls.push({
        taskId: task.id,
        missingMinutes: task.durationMinutes,
        reason: "no-profile-windows",
      });
      continue;
    }

    const window: Interval = { start: nowMs, end: task.deadlineMs };
    const free = subtract(clip(profile.intervals, window), reserved);

    const minChunkMs = minutesToMs(Math.max(1, task.minBlockMinutes));
    const maxChunkMs = minutesToMs(
      Math.max(task.minBlockMinutes, task.maxBlockMinutes),
    );

    let remainingMs = durationMs;

    for (const interval of free) {
      if (remainingMs <= 0) break;

      let cursor = roundUp(Math.max(interval.start, nowMs));

      while (remainingMs > 0 && cursor < interval.end) {
        const roomMs = interval.end - cursor;
        const chunkMs = Math.min(remainingMs, maxChunkMs, roomMs);

        // Too small to be worth scheduling — unless it is the last sliver of
        // the task, in which case a short block still finishes the job.
        if (chunkMs < minChunkMs && chunkMs < remainingMs) break;
        if (chunkMs <= 0) break;

        const block: PlannedBlock = { taskId: task.id, start: cursor, end: cursor + chunkMs };
        blocks.push(block);
        reserved.push({ start: block.start - bufferMs, end: block.end + bufferMs });

        remainingMs -= chunkMs;
        cursor = roundUp(block.end + bufferMs);
      }
    }

    if (remainingMs > 0) {
      shortfalls.push({
        taskId: task.id,
        missingMinutes: msToMinutes(remainingMs),
        reason: "no-open-time",
      });
    }
  }

  blocks.sort((a, b) => a.start - b.start);

  return { blocks, shortfalls };
}
