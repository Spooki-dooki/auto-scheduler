import { DateTime } from "luxon";

import type { BlockView } from "@/components/types";

const DAYS_SHOWN = 7;

/** A simple agenda-per-day view: readable on a phone, no grid maths. */
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
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Next 7 days</h2>

      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {days.map((day) => {
          const key = day.toISODate() ?? "";
          const dayBlocks = (byDay.get(key) ?? []).sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
          );

          return (
            <div key={key} className="flex gap-4 px-4 py-3">
              <div className="w-24 shrink-0">
                <p className="text-sm font-medium text-slate-900">
                  {day.hasSame(today, "day") ? "Today" : day.toFormat("ccc")}
                </p>
                <p className="text-xs text-slate-500">{day.toFormat("d LLL")}</p>
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                {dayBlocks.length === 0 ? (
                  <p className="text-xs text-slate-400">Clear</p>
                ) : (
                  dayBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-baseline gap-2 rounded-md px-2 py-1.5"
                      style={{ backgroundColor: `${block.color}14` }}
                    >
                      <span className="w-28 shrink-0 text-xs tabular-nums text-slate-500">
                        {DateTime.fromISO(block.start)
                          .setZone(timeZone)
                          .toFormat("h:mm a")}
                        {" – "}
                        {DateTime.fromISO(block.end)
                          .setZone(timeZone)
                          .toFormat("h:mm a")}
                      </span>
                      <span className="truncate text-sm text-slate-800">
                        {block.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
