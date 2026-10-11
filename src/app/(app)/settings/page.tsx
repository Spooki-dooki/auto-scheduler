import { redirect } from "next/navigation";

import SettingsForm from "@/components/SettingsForm";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasGoogleConnected } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [user, connected] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, timeZone: true, calendarId: true },
    }),
    hasGoogleConnected(userId),
  ]);

  async function reconnect() {
    "use server";
    await signIn("google", { redirectTo: "/settings" });
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Google Calendar</h2>
        <p className="mt-1 text-sm text-slate-600">
          {connected
            ? "Connected. Free time is read from every calendar you have selected, and blocks are written to the one below."
            : "Not connected. Nothing can be scheduled until it is."}
        </p>
        <form action={reconnect} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {connected ? "Reconnect" : "Connect Google Calendar"}
          </button>
        </form>
      </section>

      <SettingsForm
        timeZone={user?.timeZone ?? "America/New_York"}
        calendarId={user?.calendarId ?? "primary"}
        connected={connected}
      />
    </div>
  );
}
