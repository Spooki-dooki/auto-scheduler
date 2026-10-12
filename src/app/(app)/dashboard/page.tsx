import { redirect } from "next/navigation";

import AddTaskForm from "@/components/AddTaskForm";
import ConnectCalendarBanner from "@/components/ConnectCalendarBanner";
import NowCard from "@/components/NowCard";
import RescheduleButton from "@/components/RescheduleButton";
import TaskList from "@/components/TaskList";
import WeekView from "@/components/WeekView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasGoogleConnected } from "@/lib/google";
import type { BlockView, TaskView } from "@/components/types";

export const dynamic = "force-dynamic";

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
        })),
  );

  const openTasks = taskViews.filter((task) => task.status !== "COMPLETED");
  const doneTasks = taskViews.filter((task) => task.status === "COMPLETED");

  return (
    <div className="space-y-8">
      {connected ? null : <ConnectCalendarBanner />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="t-display text-text">
            {user?.name ? `Hey ${user.name.split(" ")[0]}.` : "Your week"}
          </h1>
          <p className="mt-2 t-body text-soft">
            {openTasks.length} open {openTasks.length === 1 ? "task" : "tasks"} · times in{" "}
            {timeZone.replace("_", " ")}
          </p>
        </div>
        <RescheduleButton disabled={!connected} />
      </div>

      <NowCard blocks={blocks} timeZone={timeZone} />

      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="space-y-10">
          <WeekView blocks={blocks} timeZone={timeZone} />
          <TaskList
            tasks={openTasks}
            doneTasks={doneTasks}
            timeZone={timeZone}
          />
        </div>

        {/* The one primary action comes first on phones, beside the week on
            wide screens. */}
        <aside className="order-first lg:sticky lg:top-10 lg:order-last lg:self-start">
          <AddTaskForm profiles={profiles} timeZone={timeZone} />
        </aside>
      </section>
    </div>
  );
}
