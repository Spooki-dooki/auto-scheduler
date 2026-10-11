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

/**
 * Recomputes the whole future schedule for one user and mirrors it to Google
 * Calendar.
 *
 * Idempotent: running it twice with nothing changed produces no calendar writes.
 * Blocks that have already started are treated as history — they are never
 * moved, and the time they covered counts toward the task's duration.
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

  const calendar = await getCalendarClient(userId);

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

  // ...minus our own blocks that have not started, which are the very thing we
  // are re-placing. A block already running stays busy.
  const ownFutureBlocks: Interval[] = tasks.flatMap((task) =>
    splitAtNow(task.blocks, nowMs)
      .upcoming.map((block) => ({
        start: block.start.getTime(),
        end: block.end.getTime(),
      })),
  );
  const busy = subtract(rawBusy, ownFutureBlocks);

  const profileSpecs: ProfileSpec[] = profiles.map((profile) => ({
    id: profile.id,
    bufferMinutes: profile.bufferMinutes,
    windows: profile.windows.map((w) => ({
      dayOfWeek: w.dayOfWeek,
      startMinute: w.startMinute,
      endMinute: w.endMinute,
    })),
  }));

  const availability = buildProfileAvailability({
    profiles: profileSpecs,
    busy,
    from: now,
    to: horizonEnd,
    timeZone: user.timeZone,
  });

  // Time already spent in blocks that have started counts toward the task.
  const remainingByTask = new Map<string, number>();
  const placementTasks: PlacementTask[] = [];

  for (const task of tasks) {
    const elapsedMinutes = startedMinutes(task.blocks, nowMs);

    const remaining = Math.max(0, task.durationMinutes - elapsedMinutes);
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

function computeHorizonEnd(deadlines: Date[], nowMs: number): Date {
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
