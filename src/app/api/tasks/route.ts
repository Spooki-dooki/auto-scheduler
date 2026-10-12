import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultProfileId } from "@/lib/profiles";
import { tryRunScheduler } from "@/lib/scheduler/run";
import { taskCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const userId = await requireUserId();

    const tasks = await prisma.task.findMany({
      where: { userId, status: { not: "ARCHIVED" } },
      include: { blocks: { orderBy: { start: "asc" } }, profile: true },
      orderBy: [{ status: "asc" }, { deadline: "asc" }],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const input = taskCreateSchema.parse(await request.json());

    const profileId = input.profileId ?? (await getDefaultProfileId(userId));

    const task = await prisma.task.create({
      data: {
        userId,
        title: input.title,
        notes: input.notes ?? null,
        deadline: input.deadline,
        durationMinutes: input.durationMinutes,
        priority: input.priority,
        minBlockMinutes: input.minBlockMinutes,
        maxBlockMinutes: input.maxBlockMinutes,
        profileId,
      },
    });

    // Placing it immediately is the whole promise of the product: enter a task,
    // see where it landed. Works with or without a calendar connected.
    const summary = await tryRunScheduler(userId);

    const firstBlock = await prisma.taskBlock.findFirst({
      where: { taskId: task.id, end: { gt: new Date() } },
      orderBy: { start: "asc" },
      select: { start: true, end: true },
    });
    const shortfallMinutes =
      summary?.shortfalls.find((s) => s.taskId === task.id)?.missingMinutes ?? 0;

    return NextResponse.json({ task, summary, firstBlock, shortfallMinutes }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
