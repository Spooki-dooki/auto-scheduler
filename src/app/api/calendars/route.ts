import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { getCalendarClient, listWritableCalendars } from "@/lib/google";

export async function GET() {
  try {
    const userId = await requireUserId();
    const calendar = await getCalendarClient(userId);
    const calendars = await listWritableCalendars(calendar);
    return NextResponse.json({ calendars });
  } catch (error) {
    return errorResponse(error);
  }
}
