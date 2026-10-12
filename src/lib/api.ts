import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { UnauthorizedError } from "@/lib/auth";
import { GoogleNotConnectedError, GoogleReauthRequiredError } from "@/lib/google";
import { errorSummary } from "@/lib/log";

/** Maps the handful of errors route handlers actually throw onto responses. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", issues: error.flatten().fieldErrors },
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
