import { signIn } from "@/lib/auth";

export default function ConnectCalendarBanner() {
  async function connect() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-sm font-semibold text-amber-900">
        Connect Google Calendar to start scheduling
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-amber-800">
        Tasks are saved, but nothing can be placed until the app can see your
        free time and write blocks back.
      </p>
      <form action={connect} className="mt-4">
        <button
          type="submit"
          className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
        >
          Connect Google Calendar
        </button>
      </form>
    </div>
  );
}
