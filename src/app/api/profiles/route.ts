import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tryRunScheduler } from "@/lib/scheduler/run";
import { profileCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const userId = await requireUserId();

    const profiles = await prisma.profile.findMany({
      where: { userId },
      include: { windows: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const input = profileCreateSchema.parse(await request.json());

    if (input.isDefault) {
      await prisma.profile.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const count = await prisma.profile.count({ where: { userId } });

    const profile = await prisma.profile.create({
      data: {
        userId,
        name: input.name,
        color: input.color,
        bufferMinutes: input.bufferMinutes,
        defaultMinBlockMinutes: input.defaultMinBlockMinutes,
        defaultMaxBlockMinutes: input.defaultMaxBlockMinutes,
        isDefault: input.isDefault || count === 0,
        sortOrder: count,
        windows: { create: input.windows },
      },
      include: { windows: true },
    });

    await tryRunScheduler(userId);

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
