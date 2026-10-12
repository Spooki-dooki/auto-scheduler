import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { errorSummary } from "@/lib/log";
import { runScheduler } from "@/lib/scheduler/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Reactive rescheduling.
 *
 * Google's free/busy is the source of truth for what the user's week actually
 * looks like, so rather than subscribing to change notifications, this re-runs
 * placement on a schedule (every 15 minutes via vercel.json). Anything the user
 * added, moved, or deleted in Google since the last run gets absorbed here, and
 * conflicting task blocks move out of the way.
 */
export async function GET(request: Request) {
  // Fail closed: without a configured secret this endpoint would let anyone
  // trigger a full re-plan for every user.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      accounts: { some: { provider: "google" } },
      tasks: { some: { status: { in: ["PENDING", "SCHEDULED", "UNSCHEDULABLE"] } } },
    },
    select: { id: true },
  });

  const results: Array<{ userId: string; ok: boolean; error?: string }> = [];

  for (const user of users) {
    try {
      await runScheduler(user.id);
      results.push({ userId: user.id, ok: true });
    } catch (error) {
      // One user's expired Google grant must not stop everyone else's run.
      console.error(`[cron] scheduler failed for ${user.id}`, errorSummary(error));
      results.push({
        userId: user.id,
        ok: false,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    users: results.length,
    failures: results.filter((r) => !r.ok).length,
    results,
  });
}
