"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DAY_NAMES, labelToMinutes, minutesToLabel } from "@/lib/format";

type WindowRow = { dayOfWeek: number; startMinute: number; endMinute: number };

type ProfileRow = {
  id: string;
  name: string;
  color: string;
  bufferMinutes: number;
  defaultMinBlockMinutes: number;
  defaultMaxBlockMinutes: number;
  isDefault: boolean;
  taskCount: number;
  windows: WindowRow[];
};

const field =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function ProfileEditor({ profiles }: { profiles: ProfileRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createProfile(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          windows: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
            dayOfWeek,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not create that");
      }

      setNewName("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create that");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}

      <form
        onSubmit={createProfile}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-slate-300 p-4"
      >
        <div className="flex-1">
          <label
            className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            htmlFor="new-profile"
          >
            New set of hours
          </label>
          <input
            id="new-profile"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            maxLength={60}
            placeholder="Gym, Volunteering, Side project…"
            className={`${field} mt-1 w-full`}
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          Create
        </button>
        {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}

function ProfileCard({ profile }: { profile: ProfileRow }) {
  const router = useRouter();

  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState(profile.color);
  const [bufferMinutes, setBufferMinutes] = useState(profile.bufferMinutes);
  const [windows, setWindows] = useState<WindowRow[]>(profile.windows);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateWindow(index: number, patch: Partial<WindowRow>) {
    setWindows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, bufferMinutes, windows }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save");
      }

      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${profile.name}"? Tasks tagged with it stay, untagged.`)) {
      return;
    }

    setBusy(true);
    await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            className={`${field} mt-1`}
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Colour
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setSaved(false);
            }}
            className="mt-1 h-[38px] w-14 cursor-pointer rounded-lg border border-slate-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Buffer (min)
          </label>
          <input
            type="number"
            min={0}
            max={120}
            step={5}
            value={bufferMinutes}
            onChange={(e) => {
              setBufferMinutes(Number(e.target.value));
              setSaved(false);
            }}
            className={`${field} mt-1 w-24`}
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {profile.isDefault ? (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
              Default
            </span>
          ) : null}
          <span className="text-xs text-slate-500">
            {profile.taskCount} {profile.taskCount === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {windows.length === 0 ? (
          <p className="text-xs text-slate-500">
            No hours yet — nothing can be scheduled here.
          </p>
        ) : null}

        {windows.map((window, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              value={window.dayOfWeek}
              onChange={(e) =>
                updateWindow(index, { dayOfWeek: Number(e.target.value) })
              }
              className={`${field} w-36`}
            >
              {DAY_NAMES.map((day, i) => (
                <option key={day} value={i + 1}>
                  {day}
                </option>
              ))}
            </select>

            <input
              type="time"
              value={minutesToLabel(window.startMinute)}
              onChange={(e) =>
                updateWindow(index, { startMinute: labelToMinutes(e.target.value) })
              }
              className={field}
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="time"
              value={minutesToLabel(window.endMinute)}
              onChange={(e) =>
                updateWindow(index, { endMinute: labelToMinutes(e.target.value) })
              }
              className={field}
            />

            <button
              type="button"
              onClick={() => {
                setWindows((rows) => rows.filter((_, i) => i !== index));
                setSaved(false);
              }}
              className="text-xs text-slate-400 transition hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => {
            setWindows((rows) => [
              ...rows,
              { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 },
            ]);
            setSaved(false);
          }}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
        >
          Add a window
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : saved ? "Saved" : "Save and re-plan"}
        </button>

        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="text-xs text-slate-400 transition hover:text-red-600 disabled:opacity-50"
        >
          Delete
        </button>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
