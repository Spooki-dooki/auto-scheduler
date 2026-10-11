import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tryRunScheduler } from "@/lib/scheduler/run";
import { taskUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = taskUpdateSchema.parse(await request.json());

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...input,
        completedAt:
          input.status === "COMPLETED"
            ? new Date()
            : input.status
              ? null
              : undefined,
      },
    });

    const summary = await tryRunScheduler(userId);

    return NextResponse.json({ task, summary });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Archiving first lets the scheduler clear the calendar events on its way
    // out; the row itself goes once the calendar is clean.
    await prisma.task.update({ where: { id }, data: { status: "ARCHIVED" } });
    await tryRunScheduler(userId);
    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
