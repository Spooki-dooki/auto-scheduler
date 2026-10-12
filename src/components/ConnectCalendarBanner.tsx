import { CalendarDays } from "lucide-react";

import { Button, Surface } from "@/components/ui";
import { signIn } from "@/lib/auth";

/** Shown until Google Calendar is connected. Says what's missing, never alarms. */
export default function ConnectCalendarBanner() {
  async function connect() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <Surface tone="raised" className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <CalendarDays aria-hidden className="size-6 shrink-0 text-accent-ink" strokeWidth={1.75} />
      <div className="flex-1">
        <h2 className="t-body-strong text-text">Connect Google Calendar to start scheduling</h2>
        <p className="mt-1 t-small text-soft">
          Your tasks are saved. Nothing can be placed until the app can see your free time and
          write blocks back.
        </p>
      </div>
      <form action={connect}>
        <Button type="submit" className="w-full sm:w-auto">
          Connect Google Calendar
        </Button>
      </form>
    </Surface>
  );
}
