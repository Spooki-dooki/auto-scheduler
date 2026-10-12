import { describe, expect, it } from "vitest";

import { splitAtNow, startedMinutes } from "@/lib/scheduler/history";

const NOW = Date.parse("2026-03-02T15:30:00.000Z");
const min = (minutes: number) => new Date(NOW + minutes * 60_000);

const block = (id: string, startMin: number, endMin: number) => ({
  id,
  start: min(startMin),
  end: min(endMin),
});

describe("splitAtNow", () => {
  it("treats a block that is running right now as history, not something to move", () => {
    const running = block("running", -30, 30);
    const { started, upcoming } = splitAtNow([running], NOW);

    expect(started.map((b) => b.id)).toEqual(["running"]);
    expect(upcoming).toEqual([]);
  });

  it("only offers blocks that have not started for re-placement", () => {
    const { started, upcoming } = splitAtNow(
      [block("past", -120, -60), block("running", -10, 50), block("later", 60, 120)],
      NOW,
    );

    expect(started.map((b) => b.id)).toEqual(["past", "running"]);
    expect(upcoming.map((b) => b.id)).toEqual(["later"]);
  });

  it("counts a block starting exactly now as started", () => {
    const { started, upcoming } = splitAtNow([block("now", 0, 60)], NOW);

    expect(started).toHaveLength(1);
    expect(upcoming).toHaveLength(0);
  });
});

describe("startedMinutes", () => {
  it("counts the full length of past and running blocks, and nothing upcoming", () => {
    const minutes = startedMinutes(
      [block("past", -120, -60), block("running", -10, 50), block("later", 60, 120)],
      NOW,
    );

    expect(minutes).toBe(60 + 60);
  });
});
