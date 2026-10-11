import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tryRunScheduler } from "@/lib/scheduler/run";
import { profileUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = profileUpdateSchema.parse(await request.json());

    const existing = await prisma.profile.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (input.isDefault) {
      await prisma.profile.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const { windows, ...fields } = input;

    const profile = await prisma.profile.update({
      where: { id },
      data: {
        ...fields,
        // Windows are edited as a set, so replace rather than merge.
        ...(windows ? { windows: { deleteMany: {}, create: windows } } : {}),
      },
      include: { windows: true },
    });

    const summary = await tryRunScheduler(userId);

    return NextResponse.json({ profile, summary });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existing = await prisma.profile.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.profile.delete({ where: { id } });

    // Tasks that pointed here fall back to "any declared hours" until retagged.
    const summary = await tryRunScheduler(userId);

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return errorResponse(error);
  }
}
