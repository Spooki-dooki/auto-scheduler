import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import { buildProfileAvailability } from "@/lib/scheduler/availability";

const ZONE = "America/New_York";

const local = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toJSDate();

describe("buildProfileAvailability", () => {
  it("expands a weekly window into the user's local hours", () => {
    // 2026-03-02 is a Monday.
    const [profile] = buildProfileAvailability({
      profiles: [
        {
          id: "study",
          bufferMinutes: 0,
          windows: [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 }],
        },
      ],
      busy: [],
      from: local("2026-03-02T00:00"),
      to: local("2026-03-03T00:00"),
      timeZone: ZONE,
    });

    expect(profile.intervals).toHaveLength(1);
    expect(profile.intervals[0].start).toBe(local("2026-03-02T09:00").getTime());
    expect(profile.intervals[0].end).toBe(local("2026-03-02T17:00").getTime());
  });

  it("removes calendar conflicts and honours the buffer", () => {
    const [profile] = buildProfileAvailability({
      profiles: [
        {
          id: "study",
          bufferMinutes: 15,
          windows: [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 }],
        },
      ],
      busy: [
        {
          start: local("2026-03-02T12:00").getTime(),
          end: local("2026-03-02T13:00").getTime(),
        },
      ],
      from: local("2026-03-02T00:00"),
      to: local("2026-03-03T00:00"),
      timeZone: ZONE,
    });

    expect(profile.intervals).toEqual([
      {
        start: local("2026-03-02T09:00").getTime(),
        end: local("2026-03-02T11:45").getTime(),
      },
      {
        start: local("2026-03-02T13:15").getTime(),
        end: local("2026-03-02T17:00").getTime(),
      },
    ]);
  });

  it("carries an overnight shift into the next morning", () => {
    const [profile] = buildProfileAvailability({
      profiles: [
        {
          id: "job",
          bufferMinutes: 0,
          windows: [{ dayOfWeek: 1, startMinute: 22 * 60, endMinute: 2 * 60 }],
        },
      ],
      busy: [],
      from: local("2026-03-02T00:00"),
      to: local("2026-03-04T00:00"),
      timeZone: ZONE,
    });

    expect(profile.intervals).toEqual([
      {
        start: local("2026-03-02T22:00").getTime(),
        end: local("2026-03-03T02:00").getTime(),
      },
    ]);
  });

  it("keeps 9am meaning 9am across a daylight-saving change", () => {
    // US clocks move forward on 2026-03-08.
    const [profile] = buildProfileAvailability({
      profiles: [
        {
          id: "study",
          bufferMinutes: 0,
          windows: [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 11 * 60 }],
        },
      ],
      busy: [],
      from: local("2026-03-02T00:00"),
      to: local("2026-03-10T00:00"),
      timeZone: ZONE,
    });

    const starts = profile.intervals.map((interval) =>
      DateTime.fromMillis(interval.start, { zone: ZONE }).toFormat("HH:mm"),
    );

    expect(starts).toEqual(["09:00", "09:00"]);
  });
});
