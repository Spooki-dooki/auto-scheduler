import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { UnauthorizedError } from "@/lib/auth";
import { GoogleNotConnectedError, GoogleReauthRequiredError } from "@/lib/google";
import { errorSummary } from "@/lib/log";

/** Field names as the screens show them. */
const FIELD_NAMES: Record<string, string> = {
  title: "What is it",
  deadline: "Due by",
  durationMinutes: "How long it takes",
  priority: "Priority",
  minBlockMinutes: "Work in chunks of",
  maxBlockMinutes: "Work in chunks of",
  name: "Name",
  color: "Color",
  bufferMinutes: "Gap around each block",
  windows: "Hours",
  timeZone: "Time zone",
  calendarId: "Write blocks to",
};

/** Maps the handful of errors route handlers actually throw onto responses. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (error instanceof ZodError) {
    // Say what to fix, in the words the screen uses, not "Invalid input".
    const first = error.issues[0];
    const field = FIELD_NAMES[String(first?.path[0] ?? "")];
    const message = first ? `${field ? `${field}: ` : ""}${first.message}` : "Check what you entered.";
    return NextResponse.json(
      { error: message, issues: error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  if (error instanceof GoogleNotConnectedError) {
    return NextResponse.json(
      { error: error.message, code: "google_not_connected" },
      { status: 409 },
    );
  }

  if (error instanceof GoogleReauthRequiredError) {
    return NextResponse.json(
      { error: error.message, code: "google_reauth_required" },
      { status: 409 },
    );
  }

  // Google said the stored grant is no good (revoked or expired): the fix is
  // to reconnect, not a server error.
  if (isGoogleUnauthorized(error)) {
    const reauth = new GoogleReauthRequiredError();
    return NextResponse.json(
      { error: reauth.message, code: "google_reauth_required" },
      { status: 409 },
    );
  }

  // Never the error object: see errorSummary.
  console.error("[api] unhandled error", errorSummary(error));
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

function isGoogleUnauthorized(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { status, code } = error as { status?: unknown; code?: unknown };
  return status === 401 || code === 401;
}
