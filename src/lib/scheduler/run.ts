import type { calendar_v3 } from "googleapis";
import { TaskStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  GoogleNotConnectedError,
  createBlockEvent,
  deleteBlockEvent,
  fetchBusyIntervals,
  getCalendarClient,
  listAutoScheduledEvents,
  updateBlockEvent,
} from "@/lib/google";
import { buildProfileAvailability, type ProfileSpec } from "@/lib/scheduler/availability";
import { splitAtNow, startedMinutes } from "@/lib/scheduler/history";
import { subtract } from "@/lib/scheduler/intervals";
import { placeTasks } from "@/lib/scheduler/place";
import {
  type Interval,
  type PlacementTask,
  type PlannedBlock,
  type Shortfall,
} from "@/lib/scheduler/types";

/** How far ahead the scheduler will ever look, regardless of deadlines. */
const MAX_HORIZON_DAYS = 60;

const ACTIVE_STATUSES: TaskStatus[] = [
  TaskStatus.PENDING,
  TaskStatus.SCHEDULED,
  TaskStatus.UNSCHEDULABLE,
];

export type RunSummary = {
  userId: string;
  scheduledTasks: number;
  blocksCreated: number;
  blocksMoved: number;
  blocksRemoved: number;
  shortfalls: Array<{ taskId: string; title: string; missingMinutes: number }>;
  ranAt: Date;
};

/** One task as the planner needs it. */
export type PlanTask = {
  id: string;
  title: string;
  deadline: Date;
  durationMinutes: number;
  priority: number;
  minBlockMinutes: number;
  maxBlockMinutes: number;
  profileId: string | null;
  createdAt: Date;
  blocks: Array<{ start: Date; end: Date }>;
};

export type PlanInput = {
  nowMs: number;
  timeZone: string;
  profiles: ProfileSpec[];
  tasks: PlanTask[];
  horizonEnd: Date;
  /**
   * Busy time read from the user's calendars. Empty when no calendar is
   * connected: then tasks go into the user's own hours as if they were free,
   * and the app says so.
   */
  calendarBusy: Interval[];
};

export type Plan = {
  plannedByTask: Map<string, PlannedBlock[]>;
  shortfalls: Shortfall[];
  remainingByTask: Map<string, number>;
};

/**
 * The pure part of a run: where every unfinished task should go. No database,
 * no Google. Blocks that have started are history: never moved, and the time
 * they covered counts toward the task.
 */
export function planSchedule(input: PlanInput): Plan {
  const { nowMs, timeZone, profiles, tasks, horizonEnd, calendarBusy } = input;

  // Our own blocks that have not started are the very thing being re-placed,
  // so they don't count as busy. A block already running stays busy.
  const ownFutureBlocks: Interval[] = tasks.flatMap((task) =>
    splitAtNow(task.blocks, nowMs).upcoming.map((block) => ({
      start: block.start.getTime(),
      end: block.end.getTime(),
    })),
  );
  const busy = subtract(calendarBusy, ownFutureBlocks);

  const availability = buildProfileAvailability({
    profiles,
    busy,
    from: new Date(nowMs),
    to: horizonEnd,
    timeZone,
  });

  const remainingByTask = new Map<string, number>();
  const placementTasks: PlacementTask[] = [];

  for (const task of tasks) {
    const remaining = Math.max(0, task.durationMinutes - startedMinutes(task.blocks, nowMs));
    remainingByTask.set(task.id, remaining);
    if (remaining <= 0) continue;

    placementTasks.push({
      id: task.id,
      title: task.title,
      deadlineMs: task.deadline.getTime(),
      durationMinutes: remaining,
      priority: task.priority,
      minBlockMinutes: task.minBlockMinutes,
      maxBlockMinutes: task.maxBlockMinutes,
      profileId: task.profileId,
      createdAtMs: task.createdAt.getTime(),
    });
  }

  const { blocks: planned, shortfalls } = placeTasks({
    tasks: placementTasks,
    availability,
    nowMs,
  });

  const plannedByTask = new Map<string, PlannedBlock[]>();
  for (const block of planned) {
    const list = plannedByTask.get(block.taskId) ?? [];
    list.push(block);
    plannedByTask.set(block.taskId, list);
  }

  return { plannedByTask, shortfalls, remainingByTask };
}

/**
 * Pairs a task's upcoming blocks with the new plan (earliest with earliest),
 * so a re-plan moves blocks instead of deleting and recreating them.
 */
export function reconcileBlocks<B extends { id: string; start: Date; end: Date }>(
  existing: B[],
  wanted: PlannedBlock[],
): {
  move: Array<{ block: B; start: number; end: number }>;
  keep: B[];
  create: PlannedBlock[];
  remove: B[];
} {
  const have = [...existing].sort((a, b) => a.start.getTime() - b.start.getTime());
  const want = [...wanted].sort((a, b) => a.start - b.start);
  const pairs = Math.min(have.length, want.length);
  const move: Array<{ block: B; start: number; end: number }> = [];
  const keep: B[] = [];
  for (let i = 0; i < pairs; i += 1) {
    const same = have[i].start.getTime() === want[i].start && have[i].end.getTime() === want[i].end;
    if (same) keep.push(have[i]);
    else move.push({ block: have[i], start: want[i].start, end: want[i].end });
  }
  return { move, keep, create: want.slice(pairs), remove: have.slice(pairs) };
}

/**
 * Recomputes the whole future schedule for one user. With Google Calendar
 * connected, it plans around everything on the user's calendars and mirrors
 * the blocks there. Without it, it plans into the user's own hours right away
 * and keeps the blocks in the app; connecting later puts them on the calendar.
 *
 * Idempotent: running it twice with nothing changed produces no writes.
 */
export async function runScheduler(userId: string): Promise<RunSummary> {
  const now = new Date();
  const nowMs = now.getTime();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, timeZone: true, calendarId: true },
  });
  if (!user) throw new Error(`No such user: ${userId}`);

  const [profiles, tasks] = await Promise.all([
    prisma.profile.findMany({
      where: { userId },
      include: { windows: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, status: { in: ACTIVE_STATUSES } },
      include: { blocks: { orderBy: { start: "asc" } } },
    }),
  ]);

  let calendar: calendar_v3.Calendar | null = null;
  try {
    calendar = await getCalendarClient(userId);
  } catch (error) {
    if (!(error instanceof GoogleNotConnectedError)) throw error;
  }

  const profileSpecs: ProfileSpec[] = profiles.map((profile) => ({
    id: profile.id,
    bufferMinutes: profile.bufferMinutes,
    windows: profile.windows.map((w) => ({
      dayOfWeek: w.dayOfWeek,
      startMinute: w.startMinute,
      endMinute: w.endMinute,
    })),
  }));

  if (!calendar) {
    return runWithoutCalendar({ userId, now, timeZone: user.timeZone, profiles: profileSpecs, tasks });
  }

  // Clean up anything still on the calendar for tasks that are done or archived.
  const blocksRemovedFromClosedTasks = await removeFutureBlocksForClosedTasks(
    calendar,
    userId,
    nowMs,
  );

  const horizonEnd = computeHorizonEnd(tasks.map((t) => t.deadline), nowMs);

  // Everything already on the user's calendars...
  const calendarIds = await listBusyCalendarIds(calendar, user.calendarId);
  const rawBusy = await fetchBusyIntervals(
    calendar,
    calendarIds,
    now,
    horizonEnd,
    user.timeZone,
  );

  const { plannedByTask, shortfalls, remainingByTask } = planSchedule({
    nowMs,
    timeZone: user.timeZone,
    profiles: profileSpecs,
    tasks,
    horizonEnd,
    calendarBusy: rawBusy,
  });

  // Which of our events actually still exist in Google right now.
  const liveEvents = await listAutoScheduledEvents(
    calendar,
    user.calendarId,
    now,
    horizonEnd,
  );

  let created = 0;
  let moved = 0;
  let removed = blocksRemovedFromClosedTasks;

  for (const task of tasks) {
    const result = await syncTaskBlocks({
      calendar,
      calendarId: user.calendarId,
      timeZone: user.timeZone,
      nowMs,
      task,
      planned: plannedByTask.get(task.id) ?? [],
      liveEvents,
    });

    created += result.created;
    moved += result.moved;
    removed += result.removed;

    const shortfall = shortfalls.find((s) => s.taskId === task.id);
    const remaining = remainingByTask.get(task.id) ?? task.durationMinutes;
    const hasFutureBlocks = result.futureBlockCount > 0;

    await prisma.task.update({
      where: { id: task.id },
      data: {
        shortfallMinutes: shortfall?.missingMinutes ?? 0,
        status: shortfall
          ? TaskStatus.UNSCHEDULABLE
          : hasFutureBlocks || remaining <= 0
            ? TaskStatus.SCHEDULED
            : TaskStatus.PENDING,
      },
    });
  }

  return {
    userId,
    scheduledTasks: plannedByTask.size,
    blocksCreated: created,
    blocksMoved: moved,
    blocksRemoved: removed,
    shortfalls: shortfalls.map((s) => ({
      taskId: s.taskId,
      title: tasks.find((t) => t.id === s.taskId)?.title ?? "",
      missingMinutes: s.missingMinutes,
    })),
    ranAt: now,
  };
}

/**
 * The no-calendar path: plan into the user's own hours (nothing is known to
 * be busy) and keep the blocks in the database. Nothing is sent anywhere.
 */
async function runWithoutCalendar(input: {
  userId: string;
  now: Date;
  timeZone: string;
  profiles: ProfileSpec[];
  tasks: Array<PlanTask & { id: string; userId: string; status: TaskStatus; blocks: Array<{ id: string; start: Date; end: Date; calendarId: string }> }>;
}): Promise<RunSummary> {
  const { userId, now, timeZone, profiles, tasks } = input;
  const nowMs = now.getTime();

  // Finished or archived tasks give their future time back.
  const stale = await prisma.taskBlock.deleteMany({
    where: {
      userId,
      start: { gt: now },
      task: { status: { in: [TaskStatus.COMPLETED, TaskStatus.ARCHIVED] } },
    },
  });

  const horizonEnd = computeHorizonEnd(tasks.map((t) => t.deadline), nowMs);
  const { plannedByTask, shortfalls, remainingByTask } = planSchedule({
    nowMs,
    timeZone,
    profiles,
    tasks,
    horizonEnd,
    calendarBusy: [],
  });

  let created = 0;
  let moved = 0;
  let removed = stale.count;

  for (const task of tasks) {
    const wanted = plannedByTask.get(task.id) ?? [];
    const plan = reconcileBlocks(splitAtNow(task.blocks, nowMs).upcoming, wanted);

    for (const { block, start, end } of plan.move) {
      await prisma.taskBlock.update({
        where: { id: block.id },
        data: { start: new Date(start), end: new Date(end) },
      });
      moved += 1;
    }
    for (const target of plan.create) {
      await prisma.taskBlock.create({
        data: {
          taskId: task.id,
          userId,
          start: new Date(target.start),
          end: new Date(target.end),
          synced: false,
        },
      });
      created += 1;
    }
    for (const block of plan.remove) {
      await prisma.taskBlock.delete({ where: { id: block.id } });
      removed += 1;
    }

    const shortfall = shortfalls.find((s) => s.taskId === task.id);
    const remaining = remainingByTask.get(task.id) ?? task.durationMinutes;
    await prisma.task.update({
      where: { id: task.id },
      data: {
        shortfallMinutes: shortfall?.missingMinutes ?? 0,
        status: shortfall
          ? TaskStatus.UNSCHEDULABLE
          : wanted.length > 0 || remaining <= 0
            ? TaskStatus.SCHEDULED
            : TaskStatus.PENDING,
      },
    });
  }

  return {
    userId,
    scheduledTasks: plannedByTask.size,
    blocksCreated: created,
    blocksMoved: moved,
    blocksRemoved: removed,
    shortfalls: shortfalls.map((s) => ({
      taskId: s.taskId,
      title: tasks.find((t) => t.id === s.taskId)?.title ?? "",
      missingMinutes: s.missingMinutes,
    })),
    ranAt: now,
  };
}

/** Runs the scheduler for a user, swallowing a missing Google connection. */
export async function tryRunScheduler(
  userId: string,
): Promise<RunSummary | null> {
  try {
    return await runScheduler(userId);
  } catch (error) {
    if (error instanceof GoogleNotConnectedError) return null;
    throw error;
  }
}

// ---------------------------------------------------------------------------

export function computeHorizonEnd(deadlines: Date[], nowMs: number): Date {
  const cap = nowMs + MAX_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const latest = deadlines.reduce(
    (max, deadline) => Math.max(max, deadline.getTime()),
    nowMs,
  );
  // A day of slack past the last deadline keeps free/busy lookups honest at
  // the boundary.
  return new Date(Math.min(cap, latest + 24 * 60 * 60 * 1000));
}

async function listBusyCalendarIds(
  calendar: calendar_v3.Calendar,
  writeCalendarId: string,
): Promise<string[]> {
  try {
    const response = await calendar.calendarList.list({ maxResults: 250 });
    const ids = (response.data.items ?? [])
      .filter((item) => item.id && item.selected !== false)
      .map((item) => item.id!);
    return ids.length > 0 ? ids : [writeCalendarId];
  } catch {
    return [writeCalendarId];
  }
}

type SyncInput = {
  calendar: calendar_v3.Calendar;
  calendarId: string;
  timeZone: string;
  nowMs: number;
  task: {
    id: string;
    userId: string;
    title: string;
    notes: string | null;
    blocks: Array<{
      id: string;
      start: Date;
      end: Date;
      googleEventId: string | null;
      calendarId: string;
    }>;
  };
  planned: PlannedBlock[];
  liveEvents: Map<string, { eventId: string; start: number; end: number }>;
};

/**
 * Reconciles one task's future blocks with the plan, reusing existing calendar
 * events where possible so the user's calendar does not churn on every run.
 */
async function syncTaskBlocks(input: SyncInput) {
  const { calendar, calendarId, timeZone, nowMs, task, planned, liveEvents } = input;

  // Only blocks that have not started are paired with the new plan; a block
  // already running is left exactly where it is.
  const existing = splitAtNow(task.blocks, nowMs).upcoming.sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const wanted = [...planned].sort((a, b) => a.start - b.start);

  let created = 0;
  let moved = 0;
  let removed = 0;

  const pairs = Math.min(existing.length, wanted.length);

  for (let i = 0; i < pairs; i += 1) {
    const block = existing[i];
    const target = wanted[i];
    const live = liveEvents.get(block.id);

    const sameTime =
      block.start.getTime() === target.start && block.end.getTime() === target.end;
    const eventMatches =
      live && live.start === target.start && live.end === target.end;

    if (sameTime && eventMatches && block.googleEventId) continue;

    const eventInput = {
      calendarId,
      taskId: task.id,
      blockId: block.id,
      title: task.title,
      description: task.notes,
      start: new Date(target.start),
      end: new Date(target.end),
      timeZone,
    };

    let eventId = block.googleEventId ?? live?.eventId ?? null;

    if (eventId) {
      await updateBlockEvent(calendar, eventId, eventInput);
      moved += 1;
    } else {
      eventId = await createBlockEvent(calendar, eventInput);
      created += 1;
    }

    await prisma.taskBlock.update({
      where: { id: block.id },
      data: {
        start: eventInput.start,
        end: eventInput.end,
        googleEventId: eventId,
        calendarId,
        synced: Boolean(eventId),
      },
    });
  }

  // New blocks the plan added.
  for (let i = pairs; i < wanted.length; i += 1) {
    const target = wanted[i];

    const block = await prisma.taskBlock.create({
      data: {
        taskId: task.id,
        userId: task.userId,
        start: new Date(target.start),
        end: new Date(target.end),
        calendarId,
      },
    });

    const eventId = await createBlockEvent(calendar, {
      calendarId,
      taskId: task.id,
      blockId: block.id,
      title: task.title,
      description: task.notes,
      start: block.start,
      end: block.end,
      timeZone,
    });

    await prisma.taskBlock.update({
      where: { id: block.id },
      data: { googleEventId: eventId, synced: Boolean(eventId) },
    });

    created += 1;
  }

  // Blocks the plan no longer needs.
  for (let i = pairs; i < existing.length; i += 1) {
    const block = existing[i];
    const eventId = block.googleEventId ?? liveEvents.get(block.id)?.eventId;

    if (eventId) {
      await deleteBlockEvent(calendar, block.calendarId || calendarId, eventId);
    }
    await prisma.taskBlock.delete({ where: { id: block.id } });
    removed += 1;
  }

  return { created, moved, removed, futureBlockCount: wanted.length };
}

/** Pulls future calendar events for tasks the user finished or archived. */
async function removeFutureBlocksForClosedTasks(
  calendar: calendar_v3.Calendar,
  userId: string,
  nowMs: number,
): Promise<number> {
  const stale = await prisma.taskBlock.findMany({
    where: {
      userId,
      start: { gt: new Date(nowMs) },
      task: { status: { in: [TaskStatus.COMPLETED, TaskStatus.ARCHIVED] } },
    },
  });

  for (const block of stale) {
    if (block.googleEventId) {
      await deleteBlockEvent(calendar, block.calendarId, block.googleEventId);
    }
    await prisma.taskBlock.delete({ where: { id: block.id } });
  }

  return stale.length;
}
