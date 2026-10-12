import { DateTime } from "luxon";

import { cx } from "@/components/ui";
import { scheduleCopy } from "@/lib/copy";
import { formatHoursNumber } from "@/lib/format";
import type { BlockView } from "@/components/types";

const DAYS_SHOWN = 7;

/**
 * A simple agenda per day: readable on a phone, no grid maths. Calm draws one
 * soft tile with dividers; Momentum draws hard rules between days and leads
 * with the week's planned hours as its big numeral.
 */
export default function WeekView({
  blocks,
  timeZone,
}: {
  blocks: BlockView[];
  timeZone: string;
}) {
  const today = DateTime.now().setZone(timeZone).startOf("day");
  const days = Array.from({ length: DAYS_SHOWN }, (_, index) => today.plus({ days: index }));
  const weekStart = today.toMillis();
  const weekEnd = today.plus({ days: DAYS_SHOWN }).toMillis();

  const spans = blocks
    .map((block) => ({
      block,
      start: new Date(block.start).getTime(),
      end: new Date(block.end).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  // Time planned inside the seven days shown, counting only the part of a
  // block that falls inside them.
  const plannedMinutes = spans.reduce(
    (sum, { start, end }) =>
      sum + Math.max(0, Math.min(end, weekEnd) - Math.max(start, weekStart)) / 60_000,
    0,
  );
  const hours = formatHoursNumber(plannedMinutes);
  const hoursUnit = hours === "1" ? "hour" : "hours";

  const time = (iso: string) => DateTime.fromISO(iso).setZone(timeZone).toFormat("h:mm a");

  return (
    <section aria-labelledby="week-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="week-heading" className="t-heading text-text">
          Next 7 days
        </h2>
        {plannedMinutes > 0 ? (
          <p className="t-small text-soft tabular momentum:hidden">
            {hours} {hoursUnit} planned
          </p>
        ) : null}
      </div>

      {plannedMinutes > 0 ? (
        <p className="hidden items-end gap-3 momentum:flex">
          <span className="t-numeral text-text tabular">{hours}</span>
          <span className="mb-2 t-label text-soft">{hoursUnit} planned</span>
        </p>
      ) : null}

      {plannedMinutes === 0 ? (
        <p className="rounded-tile border border-dashed border-line p-6 t-small text-soft">
          {scheduleCopy.weekEmpty}
        </p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden calm:rounded-tile calm:bg-surface momentum:border-y momentum:border-line">
          {days.map((day) => {
            const key = day.toISODate() ?? "";
            const isToday = day.hasSame(today, "day");
            const dayStart = day.toMillis();
            const dayEnd = day.plus({ days: 1 }).toMillis();
            // A block shows on every day it touches, so one that runs past
            // midnight is still under "Today" while it's on.
            const dayBlocks = spans.filter(({ start, end }) => start < dayEnd && end > dayStart);

            return (
              <li key={key} className="flex gap-4 py-3 calm:px-4">
                <div className="w-16 shrink-0">
                  <p className={cx("t-label", isToday ? "text-accent-ink" : "text-text")}>
                    {isToday ? "Today" : day.toFormat("ccc")}
                  </p>
                  <p className="t-caption text-muted">{day.toFormat("d LLL")}</p>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  {dayBlocks.length === 0 ? (
                    <p className="t-small text-muted">{scheduleCopy.dayEmpty}</p>
                  ) : (
                    dayBlocks.map(({ block }) => (
                      // Phones stack the time over the title so titles aren't cut.
                      <div
                        key={block.id}
                        className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-3"
                      >
                        <span className="shrink-0 t-small text-soft tabular sm:w-[9.5rem]">
                          {time(block.start)} – {time(block.end)}
                        </span>
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: block.color }}
                          />
                          <span className="min-w-0 break-words t-small text-text">
                            {block.title}
                          </span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
