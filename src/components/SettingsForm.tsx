"use client";

import { AlertCircle, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button, Label, Notice, Surface, cx, inputClass } from "@/components/ui";
import { zoneLabel } from "@/lib/format";

type Calendar = { id: string; summary: string; primary: boolean };

const noSubscribe = () => () => undefined;

let browserZones: string[] | null = null;
const NO_ZONES: string[] = [];

/** The browser's own list of zones, read once and kept (a stable snapshot). */
function readBrowserZones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  browserZones ??= intl.supportedValuesOf?.("timeZone") ?? [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
  ];
  return browserZones;
}

function withCurrent(zones: string[], current: string): string[] {
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
  const [calendarsFailed, setCalendarsFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The zone list differs between Node and each browser, so the server
  // renders only the saved zone and the browser fills in the rest.
  const zones = useSyncExternalStore(noSubscribe, readBrowserZones, () => NO_ZONES);

  // Read on the client only: the server's zone is not the visitor's, and
  // rendering it on the server made React rebuild the page (hydration error).
  const browserZone = useSyncExternalStore(
    noSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => initialTimeZone,
  );

  useEffect(() => {
    if (!connected) return;

    let cancelled = false;

    fetch("/api/calendars")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setCalendars(data.calendars ?? []);
      })
      .catch(() => {
        if (!cancelled) setCalendarsFailed(true);
      });

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
            {withCurrent(zones, timeZone).map((zone) => (
              <option key={zone} value={zone}>
                {zoneLabel(zone)}
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
              className="-ml-2 mt-1 inline-flex min-h-touch items-center rounded-control px-2 t-small text-soft underline underline-offset-4 hover:text-text"
            >
              Use {zoneLabel(browserZone)} (this device)
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
              <option value={calendarId}>
                {calendarId === "primary" ? "Your main calendar" : calendarId}
              </option>
            ) : (
              calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                  {calendar.primary ? " (primary)" : ""}
                </option>
              ))
            )}
          </select>
          {calendarsFailed ? (
            <div className="mt-2">
              <Notice tone="error" icon={<AlertCircle className="size-4" />}>
                Couldn&apos;t load your calendars. Reconnect above to choose one.
              </Notice>
            </div>
          ) : null}
          <p className="mt-2 t-small text-soft">
            {connected
              ? "A separate calendar keeps auto-scheduled blocks easy to hide when you want to see only what you put there yourself."
              : "Available once a calendar is connected."}
          </p>
        </div>

        {error ? <Notice tone="error" icon={<AlertCircle className="size-4" />}>{error}</Notice> : null}

        {/* Same rule as Hours: Save appears once something changed. */}
        {timeZone !== initialTimeZone || calendarId !== initialCalendarId ? (
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save and re-plan"}
          </Button>
        ) : saved ? (
          <p role="status" className="inline-flex items-center gap-1.5 t-small text-soft">
            <Check aria-hidden className="size-4" />
            Saved
          </p>
        ) : null}
      </Surface>
    </section>
  );
}
