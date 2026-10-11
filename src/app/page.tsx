import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

const points = [
  {
    title: "Enter what you owe",
    body: "A title, a deadline, and roughly how long it will take. That is the whole form.",
  },
  {
    title: "It finds the time",
    body: "Study hours, shifts, and class blocks are read from your Google Calendar, and work lands in the gaps.",
  },
  {
    title: "It moves when life does",
    body: "Add a shift or a study group and everything competing for that slot slides out of the way.",
  },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-indigo-600">
        Auto-Scheduler
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
        Stop planning your week. Just tell it what is due.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
        Built for students and anyone stacking classes, shifts, and deadlines on
        top of each other. Your tasks get placed on your real calendar,
        automatically, and re-placed whenever something changes.
      </p>

      <Link
        href="/login"
        className="mt-8 inline-flex w-fit items-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        Get started
      </Link>

      <dl className="mt-16 grid gap-8 sm:grid-cols-3">
        {points.map((point) => (
          <div key={point.title}>
            <dt className="text-sm font-semibold text-slate-900">{point.title}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-600">
              {point.body}
            </dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
