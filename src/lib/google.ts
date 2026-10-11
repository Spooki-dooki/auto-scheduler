import { OAuth2Client } from "google-auth-library";
import { calendar_v3, google } from "googleapis";

import { encryptNullable, decryptNullable } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import type { Interval } from "@/lib/scheduler/types";

/** Marks an event as ours so we can move or remove it later without touching
 *  anything the user created by hand. */
export const AUTO_SCHEDULER_TAG = "autoScheduler";

export class GoogleNotConnectedError extends Error {
  constructor() {
    super("This account has no Google Calendar connected.");
    this.name = "GoogleNotConnectedError";
  }
}

export class GoogleReauthRequiredError extends Error {
  constructor(message = "Google access expired. Reconnect your calendar.") {
    super(message);
    this.name = "GoogleReauthRequiredError";
  }
}

export async function hasGoogleConnected(userId: string): Promise<boolean> {
  const count = await prisma.account.count({
    where: { userId, provider: "google" },
  });
  return count > 0;
}

/**
 * Builds an OAuth client for the user, decrypting stored tokens and persisting
 * any refreshed credentials back to the database (re-encrypted).
 */
export async function getGoogleAuth(userId: string): Promise<OAuth2Client> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) throw new GoogleNotConnectedError();

  const refreshToken = decryptNullable(account.refresh_token);
  const accessToken = decryptNullable(account.access_token);

  if (!refreshToken && !accessToken) throw new GoogleReauthRequiredError();

  const client = new OAuth2Client({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  });

  client.setCredentials({
    access_token: accessToken ?? undefined,
    refresh_token: refreshToken ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // google-auth-library refreshes on demand; persist whatever it hands back so
  // the next cron run does not have to refresh again.
  client.on("tokens", (tokens) => {
    void prisma.account
      .update({
        where: { id: account.id },
        data: {
          access_token: encryptNullable(tokens.access_token) ?? undefined,
          // Google only re-issues a refresh token occasionally; keep the old
          // one when it is absent.
          refresh_token:
            encryptNullable(tokens.refresh_token) ?? account.refresh_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : account.expires_at,
        },
      })
      .catch((error) => {
        console.error("[google] failed to persist refreshed tokens", error);
      });
  });

  return client;
}

export async function getCalendarClient(
  userId: string,
): Promise<calendar_v3.Calendar> {
  const auth = await getGoogleAuth(userId);
  return google.calendar({ version: "v3", auth });
}

/** Every busy interval on the user's calendars between two instants. */
export async function fetchBusyIntervals(
  calendar: calendar_v3.Calendar,
  calendarIds: string[],
  from: Date,
  to: Date,
  timeZone: string,
): Promise<Interval[]> {
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      timeZone,
      items: calendarIds.map((id) => ({ id })),
    },
  });

  const calendars = response.data.calendars ?? {};
  const intervals: Interval[] = [];

  for (const entry of Object.values(calendars)) {
    for (const busy of entry.busy ?? []) {
      if (!busy.start || !busy.end) continue;
      const start = new Date(busy.start).getTime();
      const end = new Date(busy.end).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        intervals.push({ start, end });
      }
    }
  }

  return intervals;
}

export async function listWritableCalendars(calendar: calendar_v3.Calendar) {
  const response = await calendar.calendarList.list({ maxResults: 250 });
  return (response.data.items ?? [])
    .filter((item) => item.accessRole === "owner" || item.accessRole === "writer")
    .map((item) => ({
      id: item.id!,
      summary: item.summary ?? item.id!,
      primary: Boolean(item.primary),
    }));
}

type BlockEventInput = {
  calendarId: string;
  taskId: string;
  blockId: string;
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  timeZone: string;
};

function eventBody(input: BlockEventInput): calendar_v3.Schema$Event {
  return {
    summary: input.title,
    description: [input.description, "Auto-scheduled block — moving or deleting this in Google will be picked up on the next sync."]
      .filter(Boolean)
      .join("\n\n"),
    start: { dateTime: input.start.toISOString(), timeZone: input.timeZone },
    end: { dateTime: input.end.toISOString(), timeZone: input.timeZone },
    extendedProperties: {
      private: {
        [AUTO_SCHEDULER_TAG]: "1",
        taskId: input.taskId,
        blockId: input.blockId,
      },
    },
    reminders: { useDefault: true },
  };
}

export async function createBlockEvent(
  calendar: calendar_v3.Calendar,
  input: BlockEventInput,
): Promise<string | null> {
  const response = await calendar.events.insert({
    calendarId: input.calendarId,
    requestBody: eventBody(input),
  });
  return response.data.id ?? null;
}

export async function updateBlockEvent(
  calendar: calendar_v3.Calendar,
  eventId: string,
  input: BlockEventInput,
): Promise<void> {
  await calendar.events.patch({
    calendarId: input.calendarId,
    eventId,
    requestBody: eventBody(input),
  });
}

export async function deleteBlockEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
): Promise<void> {
  try {
    await calendar.events.delete({ calendarId, eventId });
  } catch (error: unknown) {
    // 404/410 means the user already deleted it in Google — nothing to undo.
    const status = (error as { code?: number; status?: number })?.code ??
      (error as { status?: number })?.status;
    if (status === 404 || status === 410) return;
    throw error;
  }
}

/** Our own events currently on the calendar, keyed by the block id we wrote. */
export async function listAutoScheduledEvents(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  from: Date,
  to: Date,
): Promise<Map<string, { eventId: string; start: number; end: number }>> {
  const found = new Map<string, { eventId: string; start: number; end: number }>();
  let pageToken: string | undefined;

  do {
    const response = await calendar.events.list({
      calendarId,
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      showDeleted: false,
      maxResults: 2500,
      privateExtendedProperty: [`${AUTO_SCHEDULER_TAG}=1`],
      pageToken,
    });

    for (const event of response.data.items ?? []) {
      const blockId = event.extendedProperties?.private?.blockId;
      if (!blockId || !event.id) continue;

      const start = event.start?.dateTime ?? event.start?.date;
      const end = event.end?.dateTime ?? event.end?.date;
      if (!start || !end) continue;

      found.set(blockId, {
        eventId: event.id,
        start: new Date(start).getTime(),
        end: new Date(end).getTime(),
      });
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return found;
}
