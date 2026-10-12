import Link from "next/link";
import { redirect } from "next/navigation";

import { Surface, buttonClass, cx } from "@/components/ui";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/lib/copy";

/** A worked example instead of feature columns: one task in, a week out. */
const EXAMPLE = {
  task: { title: "Bio 201 lab report", due: "Due Wed, 5:00 PM", length: "About 2.5 hours" },
  days: [
    {
      day: "Mon",
      rows: [
        { time: "9:00 – 10:15 AM", title: "Chem 110 lecture", yours: true },
        { time: "10:25 – 11:55 AM", title: "Bio 201 lab report", yours: false },
      ],
    },
    {
      day: "Tue",
      rows: [
        { time: "4:00 – 5:00 PM", title: "Bio 201 lab report", yours: false },
        { time: "5:30 – 9:00 PM", title: "Café shift", yours: true },
      ],
    },
  ],
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-gutter py-16">
      <p className="t-heading text-text">{APP_NAME}</p>
      <h1 className="mt-10 t-display text-text">
        Stop planning your week. Just tell it what is due.
      </h1>
      <p className="mt-5 max-w-xl t-body text-soft">
        Built for students and anyone stacking classes, shifts, and deadlines on top of each
        other. Your tasks get placed on your real calendar, automatically, and re-placed whenever
        something changes.
      </p>

      <Link href="/login" className={buttonClass("primary", "mt-8 w-full sm:w-fit")}>
        Get started
      </Link>

      <section aria-labelledby="example-heading" className="mt-16">
        <h2 id="example-heading" className="t-label text-muted">
          For example
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Surface className="self-start p-5">
            <p className="t-small text-soft">You type</p>
            <p className="mt-3 t-body-strong text-text">{EXAMPLE.task.title}</p>
            <p className="mt-1 t-small text-soft">
              {EXAMPLE.task.due} · {EXAMPLE.task.length}
            </p>
          </Surface>

          <Surface className="p-5">
            <p className="t-small text-soft">It plans, around what is already on your calendar</p>
            <ol className="mt-3 space-y-4">
              {EXAMPLE.days.map(({ day, rows }) => (
                <li key={day} className="flex gap-4">
                  <span className="w-10 shrink-0 t-label text-text">{day}</span>
                  <ul className="min-w-0 flex-1 space-y-2">
                    {rows.map((row) => (
                      <li key={row.time} className="flex flex-col sm:flex-row sm:gap-3">
                        <span className="shrink-0 t-small text-soft tabular sm:w-[8.5rem]">
                          {row.time}
                        </span>
                        <span
                          className={cx(
                            "flex min-w-0 items-center gap-2 t-small",
                            row.yours ? "text-muted" : "text-text",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cx(
                              "size-2 shrink-0 rounded-full",
                              row.yours ? "border border-line-strong" : "bg-accent",
                            )}
                          />
                          {row.title}
                          {row.yours ? <span className="sr-only">(already on your calendar)</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </Surface>
        </div>
        <p className="mt-4 t-small text-soft">
          Add a study group on Tuesday at 4 and that hour moves somewhere else before Wednesday.
        </p>
      </section>
    </main>
  );
}
