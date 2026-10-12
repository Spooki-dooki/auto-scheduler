import { msToMinutes } from "@/lib/scheduler/types";

type TimedBlock = { start: Date; end: Date };

/**
 * Splits a task's blocks at `nowMs`.
 *
 * A block that has started — including one still running — is history: it is
 * never moved, it stays busy on the calendar, and its time counts toward the
 * task. Only blocks that have not started yet are up for re-placement.
 */
export function splitAtNow<T extends TimedBlock>(
  blocks: T[],
  nowMs: number,
): { started: T[]; upcoming: T[] } {
  const started: T[] = [];
  const upcoming: T[] = [];

  for (const block of blocks) {
    if (block.start.getTime() <= nowMs) started.push(block);
    else upcoming.push(block);
  }

  return { started, upcoming };
}

/** Minutes covered by blocks that have already started. */
export function startedMinutes(blocks: TimedBlock[], nowMs: number): number {
  return splitAtNow(blocks, nowMs).started.reduce(
    (sum, block) => sum + msToMinutes(block.end.getTime() - block.start.getTime()),
    0,
  );
}
