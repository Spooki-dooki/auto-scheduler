"use client";

import { AlertCircle, Check, ChevronDown, Plus } from "lucide-react";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Label, Notice, cx, inputBase, inputClass } from "@/components/ui";
import { scheduleCopy } from "@/lib/copy";
import { formatDuration, PRIORITY_LABELS } from "@/lib/format";
import type { ProfileOption } from "@/components/types";

const DURATION_PRESETS = [30, 60, 90, 120, 180];

/** Short enough to fit five chips on a phone: "30m", "1h", "1.5h". */
const chipLabel = (minutes: number) => (minutes < 60 ? `${minutes}m` : `${minutes / 60}h`);

function defaultDeadline(timeZone: string): string {
  // Tomorrow at 5pm is the deadline most people mean when they do not say.
  return DateTime.now()
    .setZone(timeZone)
    .plus({ days: 1 })
    .set({ hour: 17, minute: 0, second: 0, millisecond: 0 })
    .toFormat("yyyy-LL-dd'T'HH:mm");
}

type Created = {
  firstBlock: { start: string } | null;
  shortfallMinutes: number;
};

/**
 * Adding a task. On phones it starts as one "Add something…" field below the
 * plan and opens on tap; on wide screens it sits open beside the week.
 */
export default function AddTaskForm({
  profiles,
  timeZone,
}: {
  profiles: ProfileOption[];
  timeZone: string;
}) {
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(() => defaultDeadline(timeZone));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [priority, setPriority] = useState(2);
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [showChunks, setShowChunks] = useState(false);
  const [minBlockMinutes, setMinBlockMinutes] = useState(profiles[0]?.defaultMinBlockMinutes ?? 30);
  const [maxBlockMinutes, setMaxBlockMinutes] = useState(profiles[0]?.defaultMaxBlockMinutes ?? 120);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");

  function onProfileChange(id: string) {
    setProfileId(id);
    const profile = profiles.find((p) => p.id === id);
    if (profile) {
      setMinBlockMinutes(profile.defaultMinBlockMinutes);
      setMaxBlockMinutes(profile.defaultMaxBlockMinutes);
    }
  }

  // The picker shows numbers only ("10/13/2026, 05:00 PM"); echo it the way
  // every other date in the app reads.
  const deadlineEcho = DateTime.fromISO(deadline, { zone: timeZone });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult("");

    // The picker returns wall-clock time; interpret it in the scheduling zone
    // rather than the browser's, which may differ when travelling.
    const deadlineIso = DateTime.fromISO(deadline, { zone: timeZone }).toISO();
    const savedTitle = title;

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          deadline: deadlineIso,
          durationMinutes,
          priority,
          profileId: profileId || null,
          minBlockMinutes,
          maxBlockMinutes,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save the task. Try again.");
      }

      const created = (await response.json().catch(() => ({}))) as Partial<Created>;
      setResult(describeResult(savedTitle, created, timeZone));
      setTitle("");
      setDeadline(defaultDeadline(timeZone));
      setExpanded(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save the task. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Add a task"
      className="space-y-5 rounded-tile bg-surface p-4 sm:p-5"
    >
      {/* On phones it opens downward only: nothing appears above the field
          you tapped, so it never jumps away from your thumb. The form and
          field keep their names for screen readers. */}
      <h2 className="hidden t-heading text-text lg:block">
        Add a task
      </h2>

      <div>
        <label
          htmlFor="title"
          className="mb-2 hidden t-small text-soft lg:block"
        >
          What is it
        </label>
        <div className="relative">
          <Plus
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted lg:hidden"
          />
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setExpanded(true)}
            aria-label="What is it"
            required
            maxLength={200}
            placeholder={expanded ? "Study for the physics test" : scheduleCopy.addPlaceholder}
            className={cx(inputClass, "pl-12 lg:pl-4")}
          />
        </div>
      </div>

      <div className={cx("space-y-5", !expanded && "hidden lg:block")}>
        <div>
          <Label htmlFor="deadline">Due by</Label>
          <input
            id="deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
            aria-describedby="deadline-echo"
            className={inputClass}
          />
          <p id="deadline-echo" className="mt-2 t-caption text-muted tabular">
            {deadlineEcho.isValid ? deadlineEcho.toFormat("cccc d LLLL, h:mm a") : ""}
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 t-small text-soft">How long it takes</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {DURATION_PRESETS.map((preset) => {
              const on = durationMinutes === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDurationMinutes(preset)}
                  className={cx(
                    "inline-flex min-h-touch min-w-0 items-center justify-center gap-0.5 rounded-chip px-1 t-small tabular transition-colors duration-[var(--motion-fast)]",
                    on
                      ? "border-2 border-selected-border bg-selected font-semibold text-selected-fg"
                      : "border border-control-edge text-soft hover:border-line-strong hover:text-text",
                  )}
                >
                  {/* Selected says so with a mark and a heavier edge, not color alone. */}
                  {on ? <Check aria-hidden className="size-3.5 shrink-0" strokeWidth={3} /> : null}
                  <span className="sr-only">{formatDuration(preset)}</span>
                  <span aria-hidden>{chipLabel(preset)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              id="duration"
              type="number"
              min={5}
              max={1440}
              step={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className={cx(inputBase, "w-28 tabular")}
            />
            <label htmlFor="duration" className="t-small text-soft">
              minutes
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={inputClass}
            >
              {Object.entries(PRIORITY_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <Label htmlFor="profile">Schedule during</Label>
            <select
              id="profile"
              value={profileId}
              onChange={(e) => onProfileChange(e.target.value)}
              className={inputClass}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            aria-expanded={showChunks}
            aria-controls="chunks"
            onClick={() => setShowChunks((value) => !value)}
            className="-ml-2 inline-flex min-h-touch items-center gap-1 rounded-control px-2 t-small text-soft hover:text-text"
          >
            Work in chunks of {minBlockMinutes}–{maxBlockMinutes} minutes
            <ChevronDown
              aria-hidden
              className={cx(
                "size-4 transition-transform duration-[var(--motion-fast)]",
                showChunks && "rotate-180",
              )}
            />
          </button>

          {showChunks ? (
            <fieldset id="chunks" className="mt-2">
              <legend className="mb-2 t-small text-soft">Work in chunks of</legend>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="minBlock"
                  type="number"
                  min={5}
                  step={5}
                  value={minBlockMinutes}
                  onChange={(e) => setMinBlockMinutes(Number(e.target.value))}
                  aria-label="Shortest chunk, in minutes"
                  aria-describedby="chunks-hint"
                  className={cx(inputBase, "w-24 tabular")}
                />
                <span className="t-small text-soft">to</span>
                <input
                  id="maxBlock"
                  type="number"
                  min={5}
                  step={5}
                  value={maxBlockMinutes}
                  onChange={(e) => setMaxBlockMinutes(Number(e.target.value))}
                  aria-label="Longest chunk, in minutes"
                  aria-describedby="chunks-hint"
                  className={cx(inputBase, "w-24 tabular")}
                />
                <span className="t-small text-soft">minutes</span>
              </div>
              <p id="chunks-hint" className="mt-2 t-caption text-muted">
                A long task is split into sessions this size, so it is never one marathon.
              </p>
            </fieldset>
          ) : null}
        </div>

        {error ? (
          <Notice tone="error" icon={<AlertCircle className="size-4" />}>
            {error}
          </Notice>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Finding time…" : "Add and schedule"}
          </Button>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="min-h-touch rounded-control t-small text-soft hover:text-text lg:hidden"
          >
            Close
          </button>
        </div>
      </div>

      {/* Always in the page, so screen readers hear where the task landed. */}
      <p role="status" className={cx("t-small text-soft", !result && "sr-only")}>
        {result}
      </p>
    </form>
  );
}

function describeResult(title: string, created: Partial<Created>, timeZone: string): string {
  const first = created.firstBlock
    ? DateTime.fromISO(created.firstBlock.start).setZone(timeZone).toFormat("ccc d LLL, h:mm a")
    : null;
  const missing = created.shortfallMinutes ?? 0;

  if (missing > 0) {
    return `Added "${title}". ${formatDuration(missing)} didn't fit before the deadline; the task below says what to do.`;
  }
  if (first) return `Added "${title}". First session: ${first}.`;
  return `Added "${title}".`;
}
