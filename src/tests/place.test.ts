import { describe, expect, it } from "vitest";

import { placeTasks } from "@/lib/scheduler/place";
import type { PlacementTask, ProfileAvailability } from "@/lib/scheduler/types";

const NOW = Date.parse("2026-03-02T08:00:00.000Z");
const h = (hours: number) => hours * 60 * 60 * 1000;
const at = (hoursFromNow: number) => NOW + h(hoursFromNow);

function task(overrides: Partial<PlacementTask> = {}): PlacementTask {
  return {
    id: "task-1",
    title: "Task",
    deadlineMs: at(24),
    durationMinutes: 60,
    priority: 2,
    minBlockMinutes: 30,
    maxBlockMinutes: 120,
    profileId: "study",
    createdAtMs: NOW,
    ...overrides,
  };
}

function study(intervals: Array<[number, number]>, bufferMinutes = 0): ProfileAvailability {
  return {
    profileId: "study",
    bufferMinutes,
    intervals: intervals.map(([start, end]) => ({ start: at(start), end: at(end) })),
  };
}

describe("placeTasks", () => {
  it("places a task in the earliest open slot before its deadline", () => {
    const { blocks, shortfalls } = placeTasks({
      tasks: [task()],
      availability: [study([[1, 5]])],
      nowMs: NOW,
    });

    expect(shortfalls).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toBe(at(1));
    expect(blocks[0].end).toBe(at(2));
  });

  it("never places anything outside the profile's hours", () => {
    const { blocks } = placeTasks({
      tasks: [task({ durationMinutes: 120 })],
      availability: [
        study([
          [1, 2],
          [6, 8],
        ]),
      ],
      nowMs: NOW,
    });

    for (const block of blocks) {
      const insideFirst = block.start >= at(1) && block.end <= at(2);
      const insideSecond = block.start >= at(6) && block.end <= at(8);
      expect(insideFirst || insideSecond).toBe(true);
    }
  });

  it("gives the earlier slot to the sooner deadline", () => {
    const { blocks } = placeTasks({
      tasks: [
        task({ id: "later", deadlineMs: at(20) }),
        task({ id: "sooner", deadlineMs: at(6) }),
      ],
      availability: [study([[1, 10]])],
      nowMs: NOW,
    });

    expect(blocks[0].taskId).toBe("sooner");
    expect(blocks[1].taskId).toBe("later");
  });

  it("breaks a deadline tie with priority", () => {
    const { blocks } = placeTasks({
      tasks: [
        task({ id: "normal", priority: 2 }),
        task({ id: "critical", priority: 4 }),
      ],
      availability: [study([[1, 10]])],
      nowMs: NOW,
    });

    expect(blocks[0].taskId).toBe("critical");
  });

  it("splits long work into sittings capped at maxBlockMinutes", () => {
    const { blocks, shortfalls } = placeTasks({
      tasks: [task({ durationMinutes: 300, maxBlockMinutes: 120 })],
      availability: [study([[1, 12]])],
      nowMs: NOW,
    });

    expect(shortfalls).toEqual([]);
    expect(blocks).toHaveLength(3);
    for (const block of blocks) {
      expect(block.end - block.start).toBeLessThanOrEqual(h(2));
    }
    const total = blocks.reduce((sum, b) => sum + (b.end - b.start), 0);
    expect(total).toBe(h(5));
  });

  it("leaves the profile's buffer between consecutive blocks", () => {
    const { blocks } = placeTasks({
      tasks: [task({ durationMinutes: 240, maxBlockMinutes: 120 })],
      availability: [study([[1, 12]], 15)],
      nowMs: NOW,
    });

    expect(blocks).toHaveLength(2);
    expect(blocks[1].start - blocks[0].end).toBeGreaterThanOrEqual(15 * 60_000);
  });

  it("does not double-book two tasks into the same slot", () => {
    const { blocks } = placeTasks({
      tasks: [
        task({ id: "a", durationMinutes: 60 }),
        task({ id: "b", durationMinutes: 60, createdAtMs: NOW + 1 }),
      ],
      availability: [study([[1, 4]])],
      nowMs: NOW,
    });

    expect(blocks).toHaveLength(2);
    expect(blocks[0].end).toBeLessThanOrEqual(blocks[1].start);
  });

  it("reports the shortfall when the deadline cannot be met", () => {
    const { blocks, shortfalls } = placeTasks({
      tasks: [task({ durationMinutes: 240 })],
      availability: [study([[1, 3]])],
      nowMs: NOW,
    });

    expect(blocks).toHaveLength(1);
    expect(shortfalls).toHaveLength(1);
    expect(shortfalls[0]).toMatchObject({ taskId: "task-1", missingMinutes: 120 });
  });

  it("skips slots shorter than the minimum sitting", () => {
    const { blocks } = placeTasks({
      tasks: [task({ durationMinutes: 60, minBlockMinutes: 45 })],
      availability: [
        study([
          [1, 1.5],
          [4, 6],
        ]),
      ],
      nowMs: NOW,
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toBe(at(4));
  });

  it("still places a final sliver smaller than the minimum sitting", () => {
    const { blocks, shortfalls } = placeTasks({
      tasks: [task({ durationMinutes: 150, minBlockMinutes: 60, maxBlockMinutes: 120 })],
      availability: [study([[1, 10]])],
      nowMs: NOW,
    });

    expect(shortfalls).toEqual([]);
    const total = blocks.reduce((sum, b) => sum + (b.end - b.start), 0);
    expect(total).toBe(h(2.5));
  });

  it("does not schedule a task whose deadline has already passed", () => {
    const { blocks, shortfalls } = placeTasks({
      tasks: [task({ deadlineMs: at(-1) })],
      availability: [study([[1, 10]])],
      nowMs: NOW,
    });

    expect(blocks).toEqual([]);
    expect(shortfalls[0].reason).toBe("past-deadline");
  });

  it("flags a profile with no declared hours", () => {
    const { shortfalls } = placeTasks({
      tasks: [task()],
      availability: [study([])],
      nowMs: NOW,
    });

    expect(shortfalls[0].reason).toBe("no-profile-windows");
  });

  it("keeps an untagged task inside some declared hours", () => {
    const { blocks } = placeTasks({
      tasks: [task({ profileId: null })],
      availability: [study([[2, 6]])],
      nowMs: NOW,
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toBeGreaterThanOrEqual(at(2));
    expect(blocks[0].end).toBeLessThanOrEqual(at(6));
  });
});
