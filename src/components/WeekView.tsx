import { DateTime } from "luxon";

import { SectionLabel, cx } from "@/components/ui";
import type { BlockView } from "@/components/types";

const DAYS_SHOWN = 7;

/**
 * A simple agenda per day: readable on a phone, no grid maths. Calm draws one
 * soft tile with dividers; Momentum draws hard rules between days.
 */
export default function WeekView({
  blocks,
  timeZone,
}: {
  blocks: BlockView[];
  timeZone: string;
}) {
  const today = DateTime.now().setZone(timeZone).startOf("day");

  const days = Array.from({ length: DAYS_SHOWN }, (_, index) =>
    today.plus({ days: index }),
  );

  const byDay = new Map<string, BlockView[]>();
  for (const block of blocks) {
    const key = DateTime.fromISO(block.start).setZone(timeZone).toISODate();
    if (!key) continue;
    const list = byDay.get(key) ?? [];
    list.push(block);
    byDay.set(key, list);
  }

  return (
    <section aria-labelledby="week-heading" className="space-y-3">
      <SectionLabel>
        <span id="week-heading">Next 7 days</span>
      </SectionLabel>

      <ol className="divide-y divide-line overflow-hidden calm:rounded-tile calm:bg-surface momentum:border-y momentum:border-line">
        {days.map((day) => {
          const key = day.toISODate() ?? "";
          const isToday = day.hasSame(today, "day");
          const dayBlocks = (byDay.get(key) ?? []).sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
          );

          return (
            <li key={key} className="flex gap-4 py-3 calm:px-4">
              <div className="w-20 shrink-0">
                <p className={cx("t-label", isToday ? "text-accent-ink" : "text-text")}>
                  {isToday ? "Today" : day.toFormat("ccc")}
                </p>
                <p className="t-caption text-muted">{day.toFormat("d LLL")}</p>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                {dayBlocks.length === 0 ? (
                  <p className="t-small text-muted">Clear</p>
                ) : (
                  dayBlocks.map((block) => (
                    // Phones stack the time over the title so titles aren't cut.
                    <div key={block.id} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                      <span className="shrink-0 t-small text-soft tabular sm:w-[9.5rem]">
                        {DateTime.fromISO(block.start).setZone(timeZone).toFormat("h:mm a")}
                        {" – "}
                        {DateTime.fromISO(block.end).setZone(timeZone).toFormat("h:mm a")}
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: block.color }}
                        />
                        <span className="truncate t-small text-text">{block.title}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
