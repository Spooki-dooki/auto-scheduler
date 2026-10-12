import { DateTime } from "luxon";
import { describe, expect, it, vi } from "vitest";

// run.ts imports the database and Google modules for its I/O half; the pure
// half under test never touches them.
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/google", () => ({ GoogleNotConnectedError: class extends Error {} }));

const { planSchedule, reconcileBlocks } = await import("@/lib/scheduler/run");

const ZONE = "America/New_York";
const local = (iso: string) => DateTime.fromISO(iso, { zone: ZONE });
const ms = (iso: string) => local(iso).toMillis();

// Monday 12 Oct 2026, 8:00 AM New York.
const NOW = ms("2026-10-12T08:00");

const STUDY = {
  id: "study",
  bufferMinutes: 10,
  // Weekdays 9:00 AM - 9:00 PM.
  windows: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startMinute: 9 * 60, endMinute: 21 * 60 })),
};

function task(overrides: Partial<Parameters<typeof planSchedule>[0]["tasks"][number]> = {}) {
  return {
    id: "bio",
    title: "Bio 201 lab report",
    deadline: new Date(ms("2026-10-14T17:00")),
    durationMinutes: 120,
    priority: 2,
    minBlockMinutes: 30,
    maxBlockMinutes: 120,
    profileId: "study",
    createdAt: new Date(NOW - 60_000),
    blocks: [],
    ...overrides,
  };
}

const plan = (tasks: ReturnType<typeof task>[], calendarBusy: { start: number; end: number }[] = []) =>
  planSchedule({
    nowMs: NOW,
    timeZone: ZONE,
    profiles: [STUDY],
    tasks,
    horizonEnd: new Date(ms("2026-10-20T00:00")),
    calendarBusy,
  });

describe("scheduling with no calendar connected", () => {
  it("places a new task straight away, inside the user's own hours", () => {
    const { plannedByTask, shortfalls } = plan([task()]);
    const blocks = plannedByTask.get("bio") ?? [];

    expect(shortfalls).toEqual([]);
    expect(blocks.reduce((sum, b) => sum + (b.end - b.start) / 60_000, 0)).toBe(120);
    for (const b of blocks) {
      const start = DateTime.fromMillis(b.start, { zone: ZONE });
      const end = DateTime.fromMillis(b.end, { zone: ZONE });
      expect(start.weekday).toBeLessThanOrEqual(5);
      expect(start.hour * 60 + start.minute).toBeGreaterThanOrEqual(9 * 60);
      expect(end.hour * 60 + end.minute).toBeLessThanOrEqual(21 * 60);
      expect(b.end).toBeLessThanOrEqual(ms("2026-10-14T17:00"));
      expect(b.start).toBeGreaterThanOrEqual(NOW);
    }
  });

  it("puts it in the first open hours: 9:00 AM today", () => {
    const blocks = plan([task()]).plannedByTask.get("bio") ?? [];
    expect(local("2026-10-12T09:00").toMillis()).toBe(blocks[0].start);
  });

  it("still flags work that can't fit before its deadline, instead of hiding it", () => {
    const { shortfalls } = plan([
      task({ durationMinutes: 60 * 30, maxBlockMinutes: 240, deadline: new Date(ms("2026-10-13T12:00")) }),
    ]);
    expect(shortfalls).toHaveLength(1);
    expect(shortfalls[0].missingMinutes).toBeGreaterThan(0);
  });

  it("uses calendar events once they are known (the connected path, same planner)", () => {
    const busy = [{ start: ms("2026-10-12T09:00"), end: ms("2026-10-12T12:00") }];
    const blocks = plan([task()], busy).plannedByTask.get("bio") ?? [];
    for (const b of blocks) {
      expect(b.start >= busy[0].end + 10 * 60_000 || b.end <= busy[0].start).toBe(true);
    }
  });

  it("never moves a block that has started, and counts its time", () => {
    // A block that has started counts in full: the user is in it.
    const running = { start: new Date(NOW - 30 * 60_000), end: new Date(NOW + 30 * 60_000) };
    const { remainingByTask, plannedByTask } = plan([task({ blocks: [running] })]);
    expect(remainingByTask.get("bio")).toBe(60);
    for (const b of plannedByTask.get("bio") ?? []) {
      expect(b.start).toBeGreaterThanOrEqual(running.end.getTime());
    }
  });

  it("is deterministic for the same input", () => {
    const a = plan([task(), task({ id: "chem", title: "Chem set", durationMinutes: 90 })]);
    const b = plan([task(), task({ id: "chem", title: "Chem set", durationMinutes: 90 })]);
    expect([...a.plannedByTask.entries()]).toEqual([...b.plannedByTask.entries()]);
  });
});

describe("reconcileBlocks (re-planning moves blocks rather than recreating them)", () => {
  const at = (h: number) => new Date(ms(`2026-10-12T${String(h).padStart(2, "0")}:00`));
  const block = (id: string, h: number) => ({ id, start: at(h), end: at(h + 1) });
  const want = (h: number) => ({ taskId: "bio", start: at(h).getTime(), end: at(h + 1).getTime() });

  it("keeps a block already in the right place", () => {
    const r = reconcileBlocks([block("a", 9)], [want(9)]);
    expect(r.keep.map((b) => b.id)).toEqual(["a"]);
    expect(r.move).toEqual([]);
  });

  it("moves, creates and removes as the plan changes", () => {
    const r = reconcileBlocks([block("b", 14), block("a", 9), block("c", 16)], [want(10), want(15)]);
    expect(r.move.map((m) => [m.block.id, new Date(m.start).getTime()])).toEqual([
      ["a", at(10).getTime()],
      ["b", at(15).getTime()],
    ]);
    expect(r.remove.map((b) => b.id)).toEqual(["c"]);
    expect(reconcileBlocks([], [want(9)]).create).toHaveLength(1);
  });
});
