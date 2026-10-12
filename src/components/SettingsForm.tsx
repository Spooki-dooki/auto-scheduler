"use client";

import { AlertCircle, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Label, Notice, Surface, cx, inputClass } from "@/components/ui";

type Calendar = { id: string; summary: string; primary: boolean };

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

  return (
    <section aria-labelledby="scheduling-heading" className="space-y-4">
      <h2 id="scheduling-heading" className="t-heading text-text">
        Scheduling
      </h2>

      <Surface className="space-y-5 p-5">
        <div>
          <Label htmlFor="timezone">Time zone</Label>
          <select
            id="timezone"
            value={timeZone}
            onChange={(e) => {
              setTimeZone(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
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
              className="-ml-2 mt-1 inline-flex min-h-touch items-center rounded-control px-2 t-small text-accent-ink hover:underline"
            >
              Use {browserZone.replace("_", " ")} (this device)
            </button>
          ) : null}
        </div>

        <div>
          <Label htmlFor="calendar">Write blocks to</Label>
          <select
            id="calendar"
            value={calendarId}
            onChange={(e) => {
              setCalendarId(e.target.value);
              setSaved(false);
            }}
            disabled={!connected}
            className={cx(inputClass, "disabled:text-muted")}
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
          <p className="mt-2 t-small text-soft">
            A separate calendar keeps auto-scheduled blocks easy to hide when you want to see only
            what you put there yourself.
          </p>
        </div>

        {error ? <Notice icon={<AlertCircle className="size-4" />}>{error}</Notice> : null}

        <Button onClick={save} disabled={busy}>
          {saved ? <Check aria-hidden className="size-4" /> : null}
          {busy ? "Saving…" : saved ? "Saved" : "Save and re-plan"}
        </Button>
      </Surface>
    </section>
  );
}
