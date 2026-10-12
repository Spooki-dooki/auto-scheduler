import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import AppearancePicker from "@/components/AppearancePicker";
import SettingsForm from "@/components/SettingsForm";
import { Button, Surface } from "@/components/ui";
import { auth, signIn } from "@/lib/auth";
import { connectCalendarLine } from "@/lib/copy";
import { prisma } from "@/lib/db";
import { hasGoogleConnected } from "@/lib/google";
import { APPEARANCE_COOKIE, decodeAppearance, normalizeAppearance } from "@/lib/theme/appearance";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [user, connected] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, timeZone: true, calendarId: true, appearance: true },
    }),
    hasGoogleConnected(userId),
  ]);

  async function reconnect() {
    "use server";
    await signIn("google", { redirectTo: "/settings" });
  }

  // The account is the source of truth; before the first choice is saved,
  // show whatever this device is already using.
  const appearance = user?.appearance
    ? normalizeAppearance(user.appearance)
    : decodeAppearance((await cookies()).get(APPEARANCE_COOKIE)?.value);

  return (
    <div className="max-w-2xl space-y-12">
      <div>
        <h1 className="t-display text-text">Settings</h1>
        <p className="mt-2 t-body text-soft">{user?.email}</p>
      </div>

      <AppearancePicker initial={appearance} />

      <section aria-labelledby="calendar-heading" className="space-y-4">
        <h2 id="calendar-heading" className="t-heading text-text">
          Google Calendar
        </h2>
        <Surface className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <CalendarDays aria-hidden className="size-6 shrink-0 text-soft" strokeWidth={1.75} />
          <p className="flex-1 t-small text-soft">
            {connected
              ? "Connected. Free time is read from every calendar you have selected, and blocks are written to the one below."
              : `Not connected. Tasks go into your own hours for now. ${connectCalendarLine.action} ${connectCalendarLine.rest}`}
          </p>
          <form action={reconnect}>
            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              {connected ? "Reconnect" : "Connect Google Calendar"}
            </Button>
          </form>
        </Surface>
      </section>

      <SettingsForm
        timeZone={user?.timeZone ?? "America/New_York"}
        calendarId={user?.calendarId ?? "primary"}
        connected={connected}
      />
    </div>
  );
}
