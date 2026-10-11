import type { Interval } from "@/lib/scheduler/types";

/** Sorts, drops empties, and merges anything touching or overlapping. */
export function normalize(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);

  const merged: Interval[] = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

/** Everything in `base` that is not covered by `cuts`. */
export function subtract(base: Interval[], cuts: Interval[]): Interval[] {
  const holes = normalize(cuts);
  if (holes.length === 0) return normalize(base);

  const result: Interval[] = [];

  for (const interval of normalize(base)) {
    let cursor = interval.start;

    for (const hole of holes) {
      if (hole.end <= cursor) continue;
      if (hole.start >= interval.end) break;

      if (hole.start > cursor) {
        result.push({ start: cursor, end: Math.min(hole.start, interval.end) });
      }
      cursor = Math.max(cursor, hole.end);
      if (cursor >= interval.end) break;
    }

    if (cursor < interval.end) result.push({ start: cursor, end: interval.end });
  }

  return result.filter((i) => i.end > i.start);
}

/** The overlap between two interval sets. */
export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const left = normalize(a);
  const right = normalize(b);
  const result: Interval[] = [];

  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    const start = Math.max(left[i].start, right[j].start);
    const end = Math.min(left[i].end, right[j].end);

    if (end > start) result.push({ start, end });

    if (left[i].end < right[j].end) i += 1;
    else j += 1;
  }

  return result;
}

/** Grows every interval outward by `ms` on each side. */
export function pad(intervals: Interval[], ms: number): Interval[] {
  if (ms <= 0) return normalize(intervals);
  return normalize(
    intervals.map((i) => ({ start: i.start - ms, end: i.end + ms })),
  );
}

/** Restricts a set to a single bounding window. */
export function clip(intervals: Interval[], bounds: Interval): Interval[] {
  return intersect(intervals, [bounds]);
}

export function totalMs(intervals: Interval[]): number {
  return intervals.reduce((sum, i) => sum + (i.end - i.start), 0);
}
