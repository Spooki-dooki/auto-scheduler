import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tryRunScheduler } from "@/lib/scheduler/run";
import { settingsSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const input = settingsSchema.parse(await request.json());

    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: { id: true, timeZone: true, calendarId: true },
    });

    // A different time zone or target calendar changes every placement.
    const summary = await tryRunScheduler(userId);

    return NextResponse.json({ user, summary });
  } catch (error) {
    return errorResponse(error);
  }
}
