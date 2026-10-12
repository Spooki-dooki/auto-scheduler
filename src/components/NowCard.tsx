"use client";

import { useEffect, useState } from "react";

import { ProgressBar, Surface, Tag } from "@/components/ui";
import { scheduleCopy } from "@/lib/copy";
import { formatRange } from "@/lib/format";
import type { BlockView } from "@/components/types";

/**
 * The "what should I be doing right now" answer, which is the one thing a busy
 * person actually opens the app for. Same facts in both themes: Calm says the
 * time left in a sentence, Momentum shows it as the big numeral.
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
        <h2 className="t-heading text-text">{scheduleCopy.nowEmpty.title}</h2>
        <p className="mt-2 t-small text-soft">{scheduleCopy.nowEmpty.body}</p>
      </Surface>
    );
  }

  const start = new Date(block.start).getTime();
  const end = new Date(block.end).getTime();
  const minutesAway = Math.max(0, Math.round((start - now) / 60_000));
  const minutesLeft = Math.max(0, Math.round((end - now) / 60_000));

  const counter = current
    ? { value: minutesLeft, short: "min left", sentence: `${minutesLeft} minutes left` }
    : minutesAway < 60
      ? { value: minutesAway, short: "min to start", sentence: `Starts in ${minutesAway} minutes.` }
      : null;

  return (
    <Surface size="card" tone="raised">
      <div className="flex flex-wrap items-center gap-3">
        <Tag tone="accent">{current ? "Now" : "Up next"}</Tag>
        {block.category ? (
          <span className="inline-flex items-center gap-1.5 t-caption text-soft">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: block.color }}
            />
            {block.category}
          </span>
        ) : null}
      </div>
      <h2 className="mt-4 t-title text-text">{block.title}</h2>
      <p className="mt-2 t-body text-soft tabular">
        {formatRange(block.start, block.end, timeZone)}
      </p>

      {counter ? (
        // Momentum's signature: the number itself, as big as the type allows.
        <p className="mt-5 hidden momentum:block">
          <span className="block t-numeral text-text tabular">{counter.value}</span>
          <span className="mt-1 block t-label text-soft">{counter.short}</span>
        </p>
      ) : null}

      {current ? (
        <div className="mt-5">
          <ProgressBar value={(now - start) / (end - start)} label={counter?.sentence ?? ""} />
          <p className="mt-2 t-small text-soft tabular momentum:hidden">{counter?.sentence}</p>
        </div>
      ) : counter ? (
        <p className="mt-2 t-small text-soft tabular momentum:hidden">{counter.sentence}</p>
      ) : null}
    </Surface>
  );
}
