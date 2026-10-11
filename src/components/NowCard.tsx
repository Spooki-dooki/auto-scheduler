"use client";

import { useEffect, useState } from "react";

import { formatRange } from "@/lib/format";
import type { BlockView } from "@/components/types";

/**
 * The "what should I be doing right now" answer, which is the one thing a busy
 * person actually opens the app for.
 */
export default function NowCard({
  blocks,
  timeZone,
}: {
  blocks: BlockView[];
  timeZone: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  // Rendered on the client only, so the server's clock never disagrees with
  // the browser's and causes a hydration mismatch.
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) {
    return <div className="h-28 rounded-xl border border-slate-200 bg-white" />;
  }

  const sorted = [...blocks].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  const current = sorted.find(
    (block) =>
      new Date(block.start).getTime() <= now && new Date(block.end).getTime() > now,
  );
  const next = sorted.find((block) => new Date(block.start).getTime() > now);
  const block = current ?? next;

  if (!block) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
          Right now
        </p>
        <p className="mt-2 text-lg font-medium text-slate-900">Nothing scheduled.</p>
        <p className="mt-1 text-sm text-slate-600">
          Add a task and it will be placed in your next open slot.
        </p>
      </div>
    );
  }

  const minutesAway = Math.round(
    (new Date(block.start).getTime() - now) / 60_000,
  );

  return (
    <div
      className="rounded-xl border bg-white p-6"
      style={{ borderColor: block.color }}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
        {current ? "Right now" : "Up next"}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {block.title}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {formatRange(block.start, block.end, timeZone)}
        {current
          ? ` · ${Math.max(
              0,
              Math.round((new Date(block.end).getTime() - now) / 60_000),
            )} min left`
          : minutesAway < 60
            ? ` · starts in ${minutesAway} min`
            : ""}
      </p>
    </div>
  );
}
