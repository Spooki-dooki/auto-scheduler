"use client";

import { useSyncExternalStore } from "react";

import { zoneCity } from "@/lib/format";

const subscribe = () => () => undefined;

/**
 * " · times in New York", only when this browser is in a different zone from
 * the one the planner schedules in (travelling, or a wrong setting).
 */
export default function ZoneNote({ timeZone }: { timeZone: string }) {
  const browserZone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => timeZone,
  );
  if (browserZone === timeZone) return null;
  return <> · times in {zoneCity(timeZone)}</>;
}
