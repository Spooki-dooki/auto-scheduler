"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Calendar = { id: string; summary: string; primary: boolean };

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function supportedTimeZones(current: string): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };

  const zones = intl.supportedValuesOf?.("timeZone") ?? [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
  ];

  return zones.includes(current) ? zones : [current, ...zones];
}

export default function SettingsForm({
  timeZone: initialTimeZone,
  calendarId: initialCalendarId,
  connected,
}: {
  timeZone: string;
  calendarId: string;
  connected: boolean;
}) {
  const router = useRouter();

  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [calendarId, setCalendarId] = useState(initialCalendarId);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!connected) return;

    let cancelled = false;

    fetch("/api/calendars")
      .then((response) => (response.ok ? response.json() : { calendars: [] }))
      .then((data) => {
        if (!cancelled) setCalendars(data.calendars ?? []);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [connected]);

  async function save() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeZone, calendarId }),
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

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Scheduling</h2>

      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wide text-slate-500"
          htmlFor="timezone"
        >
          Time zone
        </label>
        <select
          id="timezone"
          value={timeZone}
          onChange={(e) => {
            setTimeZone(e.target.value);
            setSaved(false);
          }}
          className={`${field} mt-1`}
        >
          {supportedTimeZones(timeZone).map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace("_", " ")}
            </option>
          ))}
        </select>

        {browserZone && browserZone !== timeZone ? (
          <button
            type="button"
            onClick={() => {
              setTimeZone(browserZone);
              setSaved(false);
            }}
            className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            Use {browserZone.replace("_", " ")} (this device)
          </button>
        ) : null}
      </div>

      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wide text-slate-500"
          htmlFor="calendar"
        >
          Write blocks to
        </label>
        <select
          id="calendar"
          value={calendarId}
          onChange={(e) => {
            setCalendarId(e.target.value);
            setSaved(false);
          }}
          disabled={!connected}
          className={`${field} mt-1 disabled:bg-slate-50`}
        >
          {calendars.length === 0 ? (
            <option value={calendarId}>{calendarId}</option>
          ) : (
            calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.summary}
                {calendar.primary ? " (primary)" : ""}
              </option>
            ))
          )}
        </select>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          A separate calendar keeps auto-scheduled blocks easy to hide when you
          want to see only what you put there yourself.
        </p>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? "Saving…" : saved ? "Saved" : "Save and re-plan"}
      </button>
    </section>
  );
}
