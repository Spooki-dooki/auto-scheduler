"use client";

import { AlertCircle, Check, ChevronDown, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Notice, SectionLabel, Tag, cx } from "@/components/ui";
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
    <section aria-labelledby="tasks-heading" className="space-y-3">
      <SectionLabel>
        <span id="tasks-heading">Tasks</span>
      </SectionLabel>

      {tasks.length === 0 ? (
        <p className="rounded-tile border border-dashed border-line-strong p-6 t-small text-soft">
          Nothing queued. Add a task and it lands on your calendar straight away.
        </p>
      ) : (
        <ul className="divide-y divide-line calm:rounded-tile calm:bg-surface momentum:border-y momentum:border-line">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} timeZone={timeZone} />
          ))}
        </ul>
      )}

      {doneTasks.length > 0 ? (
        <details className="group pt-2">
          <summary className="flex min-h-touch cursor-pointer list-none items-center gap-2 t-label text-muted hover:text-text">
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
            Done ({doneTasks.length})
          </summary>
          <ul className="mt-2 divide-y divide-line calm:rounded-tile calm:bg-surface momentum:border-y momentum:border-line">
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
        throw new Error(payload.error ?? "That didn't work. Try again.");
      }

      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (!confirm(`Delete "${task.title}"? Its blocks come off your calendar too.`)) return;
    send("DELETE");
  }

  const futureBlocks = task.blocks.filter(
    (block) => new Date(block.end).getTime() > Date.now(),
  );

  return (
    <li className="flex items-start gap-2 py-3 calm:px-2">
      {/* A 44pt target around a 24pt box. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        disabled={busy}
        onClick={() => send("PATCH", { status: done ? "PENDING" : "COMPLETED" })}
        className="grid size-touch shrink-0 place-items-center rounded-control disabled:opacity-50"
      >
        <span
          className={cx(
            "grid size-6 place-items-center border-[length:var(--outline-width)] calm:rounded-full momentum:rounded-cell",
            done ? "border-accent bg-accent text-on-accent" : "border-control-edge",
          )}
        >
          {done ? <Check aria-hidden className="size-4" strokeWidth={2.5} /> : null}
        </span>
      </button>

      <div className="min-w-0 flex-1 pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cx("t-body-strong", done ? "text-muted line-through" : "text-text")}>
            {task.title}
          </p>
          {task.profile ? (
            <span className="inline-flex items-center gap-1.5 t-caption text-soft">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: task.profile.color }}
              />
              {task.profile.name}
            </span>
          ) : null}
          {task.priority >= 3 ? <Tag>{PRIORITY_LABELS[task.priority]}</Tag> : null}
        </div>

        <p className="mt-1 t-small text-soft tabular">
          {formatDuration(task.durationMinutes)} · {formatDeadline(task.deadline, timeZone)}
        </p>

        {task.shortfallMinutes > 0 ? (
          <div className="mt-2">
            <Notice icon={<Info className="size-4" />}>
              {formatDuration(task.shortfallMinutes)} didn&apos;t fit before the deadline. Free up
              some time, shorten it, or move the deadline.
            </Notice>
          </div>
        ) : null}

        {futureBlocks.length > 0 ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="-ml-2 mt-1 inline-flex min-h-touch items-center gap-1 rounded-control px-2 t-small text-accent-ink hover:underline"
          >
            {futureBlocks.length} scheduled {futureBlocks.length === 1 ? "block" : "blocks"}
            <ChevronDown aria-hidden className={cx("size-4 transition-transform", open && "rotate-180")} />
          </button>
        ) : null}

        {open ? (
          <ul className="mt-1 space-y-1">
            {futureBlocks.map((block) => (
              <li key={block.id} className="t-small text-soft tabular">
                {formatRange(block.start, block.end, timeZone)}
                {block.synced ? "" : " · not on your calendar yet"}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <div className="mt-2">
            <Notice icon={<AlertCircle className="size-4" />}>{error}</Notice>
          </div>
        ) : null}
      </div>

      <Button variant="text" onClick={remove} disabled={busy} className="shrink-0">
        Delete
      </Button>
    </li>
  );
}
