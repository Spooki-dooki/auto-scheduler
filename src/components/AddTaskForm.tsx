"use client";

import { AlertCircle, ChevronDown } from "lucide-react";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Label, Notice, cx, inputClass } from "@/components/ui";
import { PRIORITY_LABELS } from "@/lib/format";
import type { ProfileOption } from "@/components/types";

const DURATION_PRESETS = [30, 60, 90, 120, 180];

function defaultDeadline(timeZone: string): string {
  // Tomorrow at 5pm is the deadline most people mean when they do not say.
  return DateTime.now()
    .setZone(timeZone)
    .plus({ days: 1 })
    .set({ hour: 17, minute: 0, second: 0, millisecond: 0 })
    .toFormat("yyyy-LL-dd'T'HH:mm");
}

export default function AddTaskForm({
  profiles,
  timeZone,
}: {
  profiles: ProfileOption[];
  timeZone: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(() => defaultDeadline(timeZone));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [priority, setPriority] = useState(2);
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minBlockMinutes, setMinBlockMinutes] = useState(30);
  const [maxBlockMinutes, setMaxBlockMinutes] = useState(120);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onProfileChange(id: string) {
    setProfileId(id);
    const profile = profiles.find((p) => p.id === id);
    if (profile) {
      setMinBlockMinutes(profile.defaultMinBlockMinutes);
      setMaxBlockMinutes(profile.defaultMaxBlockMinutes);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    // The picker returns wall-clock time; interpret it in the scheduling zone
    // rather than the browser's, which may differ when travelling.
    const deadlineIso = DateTime.fromISO(deadline, { zone: timeZone }).toISO();

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

      setTitle("");
      setDeadline(defaultDeadline(timeZone));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save the task. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-tile bg-surface p-5">
      <h2 className="t-heading text-text">Add a task</h2>
      <div>
        <Label htmlFor="title">What is it</Label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Study for the physics test"
          className={inputClass}
        />
      </div>

      <div>
        <Label htmlFor="deadline">Due by</Label>
        <input
          id="deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className="mb-2 t-small text-soft">How long it takes</legend>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((preset) => {
            const on = durationMinutes === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={on}
                onClick={() => setDurationMinutes(preset)}
                className={cx(
                  "min-h-touch min-w-touch rounded-chip px-4 t-small tabular transition-colors",
                  on
                    ? "border-[length:var(--outline-width)] border-selected-border bg-selected text-selected-fg"
                    : "border border-transparent bg-raised text-soft hover:text-text",
                )}
              >
                {preset < 60 ? `${preset}m` : `${preset / 60}h`}
              </button>
            );
          })}
        </div>
        <label htmlFor="duration" className="sr-only">
          Minutes
        </label>
        <input
          id="duration"
          type="number"
          min={5}
          max={1440}
          step={5}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className={cx(inputClass, "mt-3 tabular")}
        />
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
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

        <div>
          <Label htmlFor="profile">Hours</Label>
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

      <button
        type="button"
        aria-expanded={showAdvanced}
        onClick={() => setShowAdvanced((value) => !value)}
        className="-ml-2 inline-flex min-h-touch items-center gap-1 rounded-control px-2 t-small text-accent-ink hover:underline"
      >
        {showAdvanced ? "Hide" : "Show"} sitting length
        <ChevronDown aria-hidden className={cx("size-4 transition-transform", showAdvanced && "rotate-180")} />
      </button>

      {showAdvanced ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="minBlock">Shortest sitting (min)</Label>
            <input
              id="minBlock"
              type="number"
              min={5}
              step={5}
              value={minBlockMinutes}
              onChange={(e) => setMinBlockMinutes(Number(e.target.value))}
              className={cx(inputClass, "tabular")}
            />
          </div>
          <div>
            <Label htmlFor="maxBlock">Longest sitting (min)</Label>
            <input
              id="maxBlock"
              type="number"
              min={5}
              step={5}
              value={maxBlockMinutes}
              onChange={(e) => setMaxBlockMinutes(Number(e.target.value))}
              className={cx(inputClass, "tabular")}
            />
          </div>
        </div>
      ) : null}

      {error ? <Notice icon={<AlertCircle className="size-4" />}>{error}</Notice> : null}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Finding time…" : "Add and schedule"}
      </Button>
    </form>
  );
}
