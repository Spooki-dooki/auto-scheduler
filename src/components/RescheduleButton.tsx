"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Notice } from "@/components/ui";

/** Re-plans the week. Works with or without a calendar connected. */
export default function RescheduleButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reschedule() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/schedule", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't re-plan. Try again.");
      }
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
    </div>
  );
}
