"use client";

import { useEffect, useState } from "react";

import { ProgressBar, SectionLabel, Surface, Tag } from "@/components/ui";
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
    return <Surface size="card" tone="raised" className="h-40" />;
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
      <Surface size="card" tone="raised">
        <Tag tone="accent">Now</Tag>
        <p className="mt-4 t-heading text-text">Nothing scheduled.</p>
        <p className="mt-2 t-small text-soft">
          Add a task and it will be placed in your next open slot.
        </p>
      </Surface>
    );
  }

  const start = new Date(block.start).getTime();
  const end = new Date(block.end).getTime();
  const minutesAway = Math.round((start - now) / 60_000);
  const minutesLeft = Math.max(0, Math.round((end - now) / 60_000));

  return (
    <Surface size="card" tone="raised">
      <div className="flex items-center gap-3">
        <Tag tone="accent">{current ? "Now" : "Up next"}</Tag>
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ backgroundColor: block.color }}
        />
      </div>
      <p className="mt-4 t-title text-text">{block.title}</p>
      <p className="mt-2 t-body text-soft tabular">
        {formatRange(block.start, block.end, timeZone)}
      </p>
      {current ? (
        <div className="mt-5">
          <ProgressBar
            value={(now - start) / (end - start)}
            label={`${minutesLeft} minutes left`}
          />
          <SectionLabel as="p" className="mt-2 tabular">
            {minutesLeft} minutes left
          </SectionLabel>
        </div>
      ) : minutesAway < 60 ? (
        <p className="mt-2 t-small text-soft tabular">Starts in {minutesAway} minutes.</p>
      ) : null}
    </Surface>
  );
}
