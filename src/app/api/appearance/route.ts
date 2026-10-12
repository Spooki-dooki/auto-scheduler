import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  APPEARANCE_COOKIE,
  encodeAppearance,
  normalizeAppearance,
} from "@/lib/theme/appearance";
import { THEME_NAMES } from "@/lib/theme/tokens";

const appearanceSchema = z.object({
  theme: z.enum(THEME_NAMES as [string, ...string[]]),
  accents: z.object({
    calm: z.string().max(20),
    momentum: z.string().max(20),
  }),
});

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Saves Settings -> Appearance on the account, and refreshes the cookie that
 * lets every page render in the chosen theme without a flash.
 */
export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const appearance = normalizeAppearance(appearanceSchema.parse(await request.json()));

    const stored: Prisma.InputJsonObject = {
      theme: appearance.theme,
      accents: { calm: appearance.accents.calm, momentum: appearance.accents.momentum },
    };
    await prisma.user.update({
      where: { id: userId },
      data: { appearance: stored },
      select: { id: true },
    });

    const response = NextResponse.json({ appearance });
    response.cookies.set(APPEARANCE_COOKIE, encodeAppearance(appearance), {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
