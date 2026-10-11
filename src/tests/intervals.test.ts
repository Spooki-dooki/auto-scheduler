import { describe, expect, it } from "vitest";

import { intersect, normalize, pad, subtract, totalMs } from "@/lib/scheduler/intervals";

const h = (hours: number) => hours * 60 * 60 * 1000;

describe("normalize", () => {
  it("merges overlapping and touching intervals", () => {
    const result = normalize([
      { start: h(3), end: h(4) },
      { start: h(1), end: h(2) },
      { start: h(2), end: h(2.5) },
    ]);

    expect(result).toEqual([
      { start: h(1), end: h(2.5) },
      { start: h(3), end: h(4) },
    ]);
  });

  it("drops zero-length intervals", () => {
    expect(normalize([{ start: h(1), end: h(1) }])).toEqual([]);
  });
});

describe("subtract", () => {
  it("punches a hole in the middle", () => {
    const result = subtract(
      [{ start: h(9), end: h(17) }],
      [{ start: h(12), end: h(13) }],
    );

    expect(result).toEqual([
      { start: h(9), end: h(12) },
      { start: h(13), end: h(17) },
    ]);
  });

  it("removes an interval that is fully covered", () => {
    const result = subtract(
      [{ start: h(9), end: h(10) }],
      [{ start: h(8), end: h(11) }],
    );

    expect(result).toEqual([]);
  });

  it("handles multiple overlapping cuts", () => {
    const result = subtract(
      [{ start: 0, end: h(10) }],
      [
        { start: h(1), end: h(3) },
        { start: h(2), end: h(4) },
        { start: h(8), end: h(12) },
      ],
    );

    expect(result).toEqual([
      { start: 0, end: h(1) },
      { start: h(4), end: h(8) },
    ]);
  });
});

describe("intersect", () => {
  it("keeps only shared time", () => {
    const result = intersect(
      [{ start: h(9), end: h(17) }],
      [
        { start: h(8), end: h(10) },
        { start: h(16), end: h(20) },
      ],
    );

    expect(result).toEqual([
      { start: h(9), end: h(10) },
      { start: h(16), end: h(17) },
    ]);
  });
});

describe("pad", () => {
  it("grows both ends and merges what now touches", () => {
    const result = pad(
      [
        { start: h(9), end: h(10) },
        { start: h(10.25), end: h(11) },
      ],
      h(0.25),
    );

    expect(result).toEqual([{ start: h(8.75), end: h(11.25) }]);
  });
});

describe("totalMs", () => {
  it("sums interval lengths", () => {
    expect(
      totalMs([
        { start: h(1), end: h(2) },
        { start: h(4), end: h(6) },
      ]),
    ).toBe(h(3));
  });
});
