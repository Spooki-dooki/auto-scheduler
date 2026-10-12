import { signIn } from "@/lib/auth";
import { connectCalendarLine } from "@/lib/copy";

/**
 * Shown while no calendar is connected. Scheduling already works without one
 * (tasks go into the user's own hours), so this is one quiet line, not a gate.
 */
export default function ConnectCalendarLine({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  async function connect() {
    "use server";
    await signIn("google", { redirectTo });
  }

  return (
    <form action={connect}>
      <button
        type="submit"
        className="-ml-1 min-h-touch rounded-control px-1 text-left t-small text-soft hover:text-text"
      >
        <span className="text-text underline decoration-line-strong underline-offset-4">
          {connectCalendarLine.action}
        </span>{" "}
        {connectCalendarLine.rest}
      </button>
    </form>
  );
}
