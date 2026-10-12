import { CalendarClock, ListTodo, Shuffle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonClass } from "@/components/ui";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/lib/copy";

const points = [
  {
    Icon: ListTodo,
    title: "Enter what you owe",
    body: "A title, a deadline, and roughly how long it will take. That is the whole form.",
  },
  {
    Icon: CalendarClock,
    title: "It finds the time",
    body: "Study hours, shifts, and class blocks are read from your Google Calendar, and work lands in the gaps.",
  },
  {
    Icon: Shuffle,
    title: "It moves when life does",
    body: "Add a shift or a study group and everything competing for that slot slides out of the way.",
  },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-gutter py-16">
      <p className="t-heading text-text">{APP_NAME}</p>
      <h1 className="mt-10 t-display text-text">
        Stop planning your week. Just tell it what is due.
      </h1>
      <p className="mt-5 max-w-2xl t-body text-soft">
        Built for students and anyone stacking classes, shifts, and deadlines on top of each
        other. Your tasks get placed on your real calendar, automatically, and re-placed whenever
        something changes.
      </p>

      <Link href="/login" className={buttonClass("primary", "mt-8 w-full sm:w-fit")}>
        Get started
      </Link>

      <ul className="mt-16 grid gap-8 sm:grid-cols-3">
        {points.map(({ Icon, title, body }) => (
          <li key={title}>
            <Icon aria-hidden className="size-6 text-soft" strokeWidth={1.75} />
            <p className="mt-3 t-body-strong text-text">{title}</p>
            <p className="mt-2 t-small text-soft">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
