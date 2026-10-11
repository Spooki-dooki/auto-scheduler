import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { runScheduler } from "@/lib/scheduler/run";

/** Manual "re-plan my week" button. */
export async function POST() {
  try {
    const userId = await requireUserId();
    const summary = await runScheduler(userId);
    return NextResponse.json({ summary });
  } catch (error) {
    return errorResponse(error);
  }
}
