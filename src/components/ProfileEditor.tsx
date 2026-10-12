"use client";

import { AlertCircle, Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Label, Notice, Surface, Tag, cx, inputBase, inputClass } from "@/components/ui";
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

// Inputs that size to their content instead of filling the row.
const field = inputBase;

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
        throw new Error(body.error ?? "Couldn't create that. Try again.");
      }

      setNewName("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create that. Try again.");
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
        className="flex flex-wrap items-end gap-3 rounded-tile border border-dashed border-line-strong p-4"
      >
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor="new-profile">New set of hours</Label>
          <input
            id="new-profile"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            maxLength={60}
            placeholder="Gym, volunteering, side project…"
            className={inputClass}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={creating}>
          <Plus aria-hidden className="size-4" />
          Create
        </Button>
        {error ? (
          <div className="w-full">
            <Notice icon={<AlertCircle className="size-4" />}>{error}</Notice>
          </div>
        ) : null}
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
        throw new Error(body.error ?? "Couldn't save. Try again.");
      }

      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save. Try again.");
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

  const uid = profile.id;

  return (
    <Surface className="p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem] flex-1">
          <Label htmlFor={`name-${uid}`}>Name</Label>
          <input
            id={`name-${uid}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          />
        </div>

        <div>
          <Label htmlFor={`color-${uid}`}>Color</Label>
          <input
            id={`color-${uid}`}
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setSaved(false);
            }}
            className="h-button w-16 cursor-pointer rounded-input border border-control-edge bg-surface p-1"
          />
        </div>

        <div>
          <Label htmlFor={`buffer-${uid}`}>Buffer (min)</Label>
          <input
            id={`buffer-${uid}`}
            type="number"
            min={0}
            max={120}
            step={5}
            value={bufferMinutes}
            onChange={(e) => {
              setBufferMinutes(Number(e.target.value));
              setSaved(false);
            }}
            className={cx(field, "w-28 tabular")}
          />
        </div>

        <div className="flex min-h-button items-center gap-3 sm:ml-auto">
          {profile.isDefault ? <Tag>Default</Tag> : null}
          <span className="t-small text-soft tabular">
            {profile.taskCount} {profile.taskCount === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      <fieldset className="mt-6 space-y-3">
        <legend className="mb-2 t-label text-muted">Weekly hours</legend>
        {windows.length === 0 ? (
          <p className="t-small text-soft">No hours yet, so nothing can be scheduled here.</p>
        ) : null}

        {windows.map((window, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`day-${uid}-${index}`}>
              Day
            </label>
            <select
              id={`day-${uid}-${index}`}
              value={window.dayOfWeek}
              onChange={(e) =>
                updateWindow(index, { dayOfWeek: Number(e.target.value) })
              }
              className={cx(field, "min-w-[9rem]")}
            >
              {DAY_NAMES.map((day, i) => (
                <option key={day} value={i + 1}>
                  {day}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor={`start-${uid}-${index}`}>
              From
            </label>
            <input
              id={`start-${uid}-${index}`}
              type="time"
              value={minutesToLabel(window.startMinute)}
              onChange={(e) =>
                updateWindow(index, { startMinute: labelToMinutes(e.target.value) })
              }
              className={cx(field, "tabular")}
            />
            <span className="t-small text-muted">to</span>
            <label className="sr-only" htmlFor={`end-${uid}-${index}`}>
              Until
            </label>
            <input
              id={`end-${uid}-${index}`}
              type="time"
              value={minutesToLabel(window.endMinute)}
              onChange={(e) =>
                updateWindow(index, { endMinute: labelToMinutes(e.target.value) })
              }
              className={cx(field, "tabular")}
            />

            <button
              type="button"
              aria-label={`Remove ${DAY_NAMES[window.dayOfWeek - 1] ?? "this"} window`}
              onClick={() => {
                setWindows((rows) => rows.filter((_, i) => i !== index));
                setSaved(false);
              }}
              className="grid size-touch place-items-center rounded-control text-soft hover:bg-pressed hover:text-text"
            >
              <X aria-hidden className="size-4" />
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
          className="-ml-2 inline-flex min-h-touch items-center gap-1 rounded-control px-2 t-small text-accent-ink hover:underline"
        >
          <Plus aria-hidden className="size-4" />
          Add a window
        </button>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {saved ? <Check aria-hidden className="size-4" /> : null}
          {busy ? "Saving…" : saved ? "Saved" : "Save and re-plan"}
        </Button>

        <Button variant="destructive" onClick={remove} disabled={busy}>
          Delete
        </Button>

        {error ? <Notice icon={<AlertCircle className="size-4" />}>{error}</Notice> : null}
      </div>
    </Surface>
  );
}
