"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
        throw new Error(body.error ?? "Could not save the task");
      }

      setTitle("");
      setDeadline(defaultDeadline(timeZone));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the task");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  const label = "block text-xs font-medium uppercase tracking-wide text-slate-500";

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-sm font-semibold text-slate-900">Add a task</h2>

      <div>
        <label className={label} htmlFor="title">
          What is it
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Study for physics test"
          className={`${field} mt-1`}
        />
      </div>

      <div>
        <label className={label} htmlFor="deadline">
          Due by
        </label>
        <input
          id="deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
          className={`${field} mt-1`}
        />
      </div>

      <div>
        <label className={label} htmlFor="duration">
          How long it takes
        </label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDurationMinutes(preset)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                durationMinutes === preset
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {preset < 60 ? `${preset}m` : `${preset / 60}h`}
            </button>
          ))}
        </div>
        <input
          id="duration"
          type="number"
          min={5}
          max={1440}
          step={5}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className={`${field} mt-2`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="priority">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className={`${field} mt-1`}
          >
            {Object.entries(PRIORITY_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="profile">
            Hours
          </label>
          <select
            id="profile"
            value={profileId}
            onChange={(e) => onProfileChange(e.target.value)}
            className={`${field} mt-1`}
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
        onClick={() => setShowAdvanced((value) => !value)}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
      >
        {showAdvanced ? "Hide" : "Show"} sitting length
      </button>

      {showAdvanced ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="minBlock">
              Shortest sitting
            </label>
            <input
              id="minBlock"
              type="number"
              min={5}
              step={5}
              value={minBlockMinutes}
              onChange={(e) => setMinBlockMinutes(Number(e.target.value))}
              className={`${field} mt-1`}
            />
          </div>
          <div>
            <label className={label} htmlFor="maxBlock">
              Longest sitting
            </label>
            <input
              id="maxBlock"
              type="number"
              min={5}
              step={5}
              value={maxBlockMinutes}
              onChange={(e) => setMaxBlockMinutes(Number(e.target.value))}
              className={`${field} mt-1`}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Finding time…" : "Add and schedule"}
      </button>
    </form>
  );
}
