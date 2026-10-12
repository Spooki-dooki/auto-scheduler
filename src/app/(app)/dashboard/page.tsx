import { DateTime } from "luxon";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AddTaskForm from "@/components/AddTaskForm";
import ConnectCalendarLine from "@/components/ConnectCalendarLine";
import NowCard from "@/components/NowCard";
import RescheduleButton from "@/components/RescheduleButton";
import TaskList from "@/components/TaskList";
import WeekView from "@/components/WeekView";
import ZoneNote from "@/components/ZoneNote";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasGoogleConnected } from "@/lib/google";
import type { BlockView, TaskView } from "@/components/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Schedule" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [user, connected, tasks, profiles] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { timeZone: true, calendarId: true, name: true },
    }),
    hasGoogleConnected(userId),
    prisma.task.findMany({
      where: { userId, status: { not: "ARCHIVED" } },
      include: {
        blocks: { orderBy: { start: "asc" } },
        profile: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ deadline: "asc" }],
    }),
    prisma.profile.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, defaultMinBlockMinutes: true, defaultMaxBlockMinutes: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const timeZone = user?.timeZone ?? "America/New_York";

  const taskViews: TaskView[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    notes: task.notes,
    deadline: task.deadline.toISOString(),
    durationMinutes: task.durationMinutes,
    priority: task.priority,
    status: task.status,
    shortfallMinutes: task.shortfallMinutes,
    profile: task.profile,
    blocks: task.blocks.map((block) => ({
      id: block.id,
      start: block.start.toISOString(),
      end: block.end.toISOString(),
      synced: block.synced,
    })),
  }));

  const blocks: BlockView[] = taskViews.flatMap((task) =>
    task.status === "COMPLETED"
      ? []
      : task.blocks.map((block) => ({
          ...block,
          taskId: task.id,
          title: task.title,
          color: task.profile?.color ?? "var(--text-muted)",
          category: task.profile?.name ?? null,
        })),
  );

  const openTasks = taskViews.filter((task) => task.status !== "COMPLETED");
  const doneTasks = taskViews.filter((task) => task.status === "COMPLETED");

  // DESIGN.md's voice: Calm greets you, Momentum states the day.
  const calmGreeting = user?.name ? `Hey ${user.name.split(" ")[0]}.` : "Your week";
  const momentumGreeting = DateTime.now().setZone(timeZone).toFormat("ccc d LLL");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="t-display text-text momentum:hidden">{calmGreeting}</h1>
          <h1 className="hidden t-display text-text momentum:block">{momentumGreeting}</h1>
          {openTasks.length > 0 ? (
            <p className="mt-2 t-body text-soft">
              {openTasks.length} open {openTasks.length === 1 ? "task" : "tasks"}
              <ZoneNote timeZone={timeZone} />
            </p>
          ) : null}
          {connected ? null : <ConnectCalendarLine />}
        </div>
        {/* Nothing to re-plan on an empty account; adding is the only action. */}
        {openTasks.length > 0 ? <RescheduleButton /> : null}
      </div>

      {/* Phones: the plan first (now, then the week), then adding, then the
          list. Wide screens keep adding beside the plan. The source order is
          the phone order, so keyboard and screen-reader order match it. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
          <NowCard blocks={blocks} timeZone={timeZone} />
          <WeekView blocks={blocks} timeZone={timeZone} />
        </div>

        <aside
          aria-label="Add a task"
          className="min-w-0 lg:sticky lg:top-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
        >
          <AddTaskForm profiles={profiles} timeZone={timeZone} />
        </aside>

        {/* A brand-new account already hears "nothing planned" from the card
            and the week; an empty list would say it a third time. */}
        {taskViews.length > 0 ? (
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <TaskList tasks={openTasks} doneTasks={doneTasks} timeZone={timeZone} connected={connected} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
