"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDeadline, formatDuration, formatRange, PRIORITY_LABELS } from "@/lib/format";
import type { TaskView } from "@/components/types";

export default function TaskList({
  tasks,
  doneTasks,
  timeZone,
}: {
  tasks: TaskView[];
  doneTasks: TaskView[];
  timeZone: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Nothing queued. Add a task and it lands on your calendar straight away.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} timeZone={timeZone} />
          ))}
        </ul>
      )}

      {doneTasks.length > 0 ? (
        <details className="pt-2">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-500">
            Done ({doneTasks.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {doneTasks.map((task) => (
              <TaskRow key={task.id} task={task} timeZone={timeZone} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function TaskRow({ task, timeZone }: { task: TaskView; timeZone: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const done = task.status === "COMPLETED";

  async function send(method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "That did not work");
      }

      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work");
    } finally {
      setBusy(false);
    }
  }

  const futureBlocks = task.blocks.filter(
    (block) => new Date(block.end).getTime() > Date.now(),
  );

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          disabled={busy}
          onChange={() =>
            send("PATCH", { status: done ? "PENDING" : "COMPLETED" })
          }
          className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-sm font-medium ${
                done ? "text-slate-400 line-through" : "text-slate-900"
              }`}
            >
              {task.title}
            </p>
            {task.profile ? (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `${task.profile.color}1a`,
                  color: task.profile.color,
                }}
              >
                {task.profile.name}
              </span>
            ) : null}
            {task.priority >= 3 ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                {PRIORITY_LABELS[task.priority]}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {formatDuration(task.durationMinutes)} ·{" "}
            {formatDeadline(task.deadline, timeZone)}
          </p>

          {task.shortfallMinutes > 0 ? (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              {formatDuration(task.shortfallMinutes)} could not be fitted before
              the deadline. Free up time, shorten it, or push the deadline.
            </p>
          ) : null}

          {futureBlocks.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              {futureBlocks.length} scheduled{" "}
              {futureBlocks.length === 1 ? "block" : "blocks"}
            </button>
          ) : null}

          {open ? (
            <ul className="mt-2 space-y-1">
              {futureBlocks.map((block) => (
                <li key={block.id} className="text-xs text-slate-600">
                  {formatRange(block.start, block.end, timeZone)}
                  {block.synced ? "" : " · not on calendar yet"}
                </li>
              ))}
            </ul>
          ) : null}

          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => send("DELETE")}
          disabled={busy}
          className="text-xs text-slate-400 transition hover:text-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
