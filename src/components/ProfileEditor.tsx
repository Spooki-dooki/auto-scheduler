"use client";

import { AlertCircle, Check, ChevronDown, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Label, Notice, Surface, Tag, cx, inputBase, inputClass } from "@/components/ui";
import { DAY_NAMES, DAY_SHORT, formatClock, labelToMinutes, minutesToLabel } from "@/lib/format";

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

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const LAST_MINUTE = 23 * 60 + 59;

const byTime = (a: WindowRow, b: WindowRow) =>
  a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute || a.endMinute - b.endMinute;
const sameWindows = (a: WindowRow[], b: WindowRow[]) =>
  JSON.stringify([...a].sort(byTime)) === JSON.stringify([...b].sort(byTime));

/** "9:00 AM – 5:00 PM", "9:00 AM – 12:00 PM, 1:00 PM – 5:00 PM", or "Off". */
function daySummary(windows: WindowRow[]): string {
  if (windows.length === 0) return "Off";
  return [...windows]
    .sort(byTime)
    .map((w) => `${formatClock(w.startMinute)} – ${formatClock(w.endMinute)}`)
    .join(", ");
}

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
        className="flex flex-wrap items-end gap-3 rounded-tile border border-dashed border-line p-4"
      >
        <div className="min-w-[min(12rem,100%)] flex-1">
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
            <Notice tone="error" icon={<AlertCircle className="size-4" />}>
              {error}
            </Notice>
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
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const dirty =
    name !== profile.name ||
    color !== profile.color ||
    bufferMinutes !== profile.bufferMinutes ||
    !sameWindows(windows, profile.windows);

  // Leaving with unsaved hours asks first: closing or reloading the tab, or
  // following any link inside the app (the tab bar, the sidebar).
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    const guard = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href") ?? "";
      if (!link || href.startsWith("#") || link.getAttribute("target") === "_blank") return;
      if (!window.confirm(`Leave without saving your changes to ${profile.name}?`)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [dirty, profile.name]);

  function edit<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setJustSaved(false);
    };
  }

  function updateWindow(target: WindowRow, patch: Partial<WindowRow>) {
    setWindows((rows) => rows.map((row) => (row === target ? { ...row, ...patch } : row)));
    setJustSaved(false);
  }

  function removeWindow(target: WindowRow) {
    setWindows((rows) => rows.filter((row) => row !== target));
    setJustSaved(false);
  }

  function addWindow(dayOfWeek: number) {
    setWindows((rows) => {
      const sameDay = rows.filter((row) => row.dayOfWeek === dayOfWeek).sort(byTime);
      const last = sameDay.at(-1);
      // First hours of a day default to a working day; more start an hour
      // after the last ones end.
      const startMinute = last ? Math.min(last.endMinute + 60, LAST_MINUTE - 60) : 9 * 60;
      const endMinute = last ? Math.min(startMinute + 120, LAST_MINUTE) : 17 * 60;
      return [...rows, { dayOfWeek, startMinute, endMinute }];
    });
    setJustSaved(false);
  }

  function undo() {
    setName(profile.name);
    setColor(profile.color);
    setBufferMinutes(profile.bufferMinutes);
    setWindows(profile.windows);
    setError(null);
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

      setJustSaved(true);
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
    setError(null);

    try {
      const response = await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't delete that. Try again.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't delete that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const uid = profile.id;

  return (
    <Surface className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <h2 id={`profile-${uid}`} className="t-heading text-text">
          {profile.name}
        </h2>
        {profile.isDefault ? <Tag>Default</Tag> : null}
        <span className="ml-auto t-small text-soft tabular">
          {profile.taskCount} {profile.taskCount === 1 ? "task" : "tasks"}
        </span>
      </div>

      {/* One line per day; tapping a day opens its hours. */}
      <ul aria-label={`${profile.name}: weekly hours`} className="mt-4 divide-y divide-line">
        {DAYS.map((day) => {
          const dayWindows = windows.filter((w) => w.dayOfWeek === day).sort(byTime);
          const open = openDay === day;
          const panelId = `day-${uid}-${day}`;
          return (
            <li key={day}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenDay(open ? null : day)}
                className="flex min-h-touch w-full items-center gap-3 rounded-control py-2 text-left hover:bg-pressed calm:px-2"
              >
                <span className="min-w-0 flex-1 tabular">
                  <span className="t-label text-text">{DAY_SHORT[day - 1]}</span>
                  <span className="t-body text-soft">
                    {" · "}
                    {daySummary(dayWindows)}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={cx(
                    "size-4 shrink-0 text-soft transition-transform duration-[var(--motion-fast)]",
                    open && "rotate-180",
                  )}
                />
              </button>

              {open ? (
                <div id={panelId} className="max-w-md space-y-2 pb-4 pt-1">
                  {dayWindows.length === 0 ? (
                    <p className="t-small text-soft">
                      Off. Nothing from {profile.name} is planned on {DAY_NAMES[day - 1]}s.
                    </p>
                  ) : null}

                  {dayWindows.map((window, index) => {
                    const id = `${uid}-${day}-${index}`;
                    const range = `${formatClock(window.startMinute)} to ${formatClock(window.endMinute)}`;
                    return (
                      <div key={id}>
                        {/* Two fields share the row; removing sits below, so
                            the times are never squeezed on a phone. */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="min-w-0">
                            <label htmlFor={`start-${id}`} className="mb-1 block t-caption text-muted">
                              From
                            </label>
                            <input
                              id={`start-${id}`}
                              type="time"
                              value={minutesToLabel(window.startMinute)}
                              onChange={(e) =>
                                updateWindow(window, { startMinute: labelToMinutes(e.target.value) })
                              }
                              className={cx(inputBase, "w-full px-3 tabular")}
                            />
                          </div>
                          <div className="min-w-0">
                            <label htmlFor={`end-${id}`} className="mb-1 block t-caption text-muted">
                              Until
                            </label>
                            <input
                              id={`end-${id}`}
                              type="time"
                              value={minutesToLabel(window.endMinute)}
                              onChange={(e) =>
                                updateWindow(window, { endMinute: labelToMinutes(e.target.value) })
                              }
                              className={cx(inputBase, "w-full px-3 tabular")}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${profile.name} hours on ${DAY_NAMES[day - 1]}, ${range}`}
                          onClick={() => removeWindow(window)}
                          className="-ml-2 mt-1 inline-flex min-h-touch items-center gap-1 rounded-control px-2 t-small text-soft hover:text-text"
                        >
                          <X aria-hidden className="size-4" />
                          Remove these hours
                        </button>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => addWindow(day)}
                    className="-ml-2 inline-flex min-h-touch items-center gap-1 rounded-control px-2 t-small text-soft hover:text-text"
                  >
                    <Plus aria-hidden className="size-4" />
                    {dayWindows.length === 0 ? "Add hours" : "Add more hours"}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        aria-expanded={showDetails}
        aria-controls={`details-${uid}`}
        onClick={() => setShowDetails((value) => !value)}
        className="-ml-2 mt-4 inline-flex min-h-touch items-center gap-1 rounded-control px-2 t-small text-soft hover:text-text"
      >
        Name, color and gap
        <ChevronDown
          aria-hidden
          className={cx(
            "size-4 transition-transform duration-[var(--motion-fast)]",
            showDetails && "rotate-180",
          )}
        />
      </button>

      <div
        id={`details-${uid}`}
        className={cx("mt-2 flex-wrap items-end gap-3", showDetails ? "flex" : "hidden")}
      >
        <div className="min-w-[min(10rem,100%)] flex-1">
          <Label htmlFor={`name-${uid}`}>Name</Label>
          <input
            id={`name-${uid}`}
            value={name}
            onChange={(e) => edit(setName)(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <Label htmlFor={`color-${uid}`}>Color</Label>
          <input
            id={`color-${uid}`}
            type="color"
            value={color}
            onChange={(e) => edit(setColor)(e.target.value)}
            className="h-button w-16 cursor-pointer rounded-input border border-control-edge bg-surface p-1"
          />
        </div>

        <div>
          <Label htmlFor={`buffer-${uid}`}>Gap around each block</Label>
          <div className="flex items-center gap-2">
            <input
              id={`buffer-${uid}`}
              type="number"
              min={0}
              max={120}
              step={5}
              value={bufferMinutes}
              onChange={(e) => edit(setBufferMinutes)(Number(e.target.value))}
              aria-describedby={`buffer-unit-${uid}`}
              className={cx(inputBase, "w-24 tabular")}
            />
            <span id={`buffer-unit-${uid}`} className="t-small text-soft">
              minutes
            </span>
          </div>
        </div>
      </div>

      {/* Saving is the card's main action only once there is something to
          save, and then it stays in view (above the phone tab bar) while you
          edit anywhere in the card. */}
      {dirty ? (
        <div className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[5] -mx-4 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-surface px-4 py-3 sm:-mx-5 sm:px-5 lg:bottom-4">
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save and re-plan"}
          </Button>
          <Button variant="text" onClick={undo} disabled={busy}>
            Undo changes
          </Button>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {!dirty && justSaved ? (
          <p className="inline-flex items-center gap-1.5 t-small text-soft">
            <Check aria-hidden className="size-4" />
            Saved
          </p>
        ) : null}

        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label={`Delete ${profile.name}`}
          className="ml-auto min-h-touch rounded-control px-3 t-small text-muted hover:text-text disabled:opacity-50"
        >
          Delete
        </button>

        {error ? (
          <div className="w-full">
            <Notice tone="error" icon={<AlertCircle className="size-4" />}>
              {error}
            </Notice>
          </div>
        ) : null}
      </div>

      {/* Announces saves without moving focus. */}
      <p role="status" className="sr-only">
        {justSaved && !dirty ? `${profile.name} saved` : ""}
      </p>
    </Surface>
  );
}
