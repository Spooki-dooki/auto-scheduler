"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Notice } from "@/components/ui";
import { formatDuration } from "@/lib/format";

type Summary = {
  blocksCreated: number;
  blocksMoved: number;
  blocksRemoved: number;
  shortfalls: Array<{ title: string; missingMinutes: number }>;
};

/** "Updated 2 sessions. Everything still fits." In the spirit of DESIGN.md: say what changed. */
function describe(summary: Summary | undefined): string {
  if (!summary) return "Re-planned.";
  const changed = summary.blocksCreated + summary.blocksMoved + summary.blocksRemoved;
  const what =
    changed === 0 ? "Nothing needed to move." : `Updated ${changed} ${changed === 1 ? "session" : "sessions"}.`;
  const [first, ...rest] = summary.shortfalls;
  if (!first) return `${what} Everything still fits.`;
  const more = rest.length > 0 ? ` and ${rest.length} more` : "";
  return `${what} ${formatDuration(first.missingMinutes)} of ${first.title}${more} doesn't fit before the deadline.`;
}

/** Re-plans the week. Works with or without a calendar connected. */
export default function RescheduleButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  async function reschedule() {
    setBusy(true);
    setError(null);
    setResult("");

    try {
      const response = await fetch("/api/schedule", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't re-plan. Try again.");
      }
      const body = (await response.json().catch(() => ({}))) as { summary?: Summary };
      setResult(describe(body.summary));
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't re-plan. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button variant="secondary" onClick={reschedule} disabled={busy || isPending}>
        <RefreshCw aria-hidden className="size-4" strokeWidth={1.75} />
        {busy || isPending ? "Re-planning…" : "Re-plan now"}
      </Button>
      {error ? (
        <Notice tone="error" icon={<AlertCircle className="size-4" />}>
          {error}
        </Notice>
      ) : null}
      <p role="status" className={result ? "max-w-xs t-small text-soft sm:text-right" : "sr-only"}>
        {result}
      </p>
    </div>
  );
}
