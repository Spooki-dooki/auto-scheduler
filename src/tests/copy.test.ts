import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { connectCalendarLine, scheduleCopy } from "@/lib/copy";

const SRC = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "tests" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("one story about the calendar", () => {
  it("says the exact line agreed for accounts without a calendar", () => {
    expect(`${connectCalendarLine.action} ${connectCalendarLine.rest}`).toBe(
      "Connect your calendar so I can avoid your classes and events.",
    );
  });

  it("never tells the user scheduling waits on a calendar", () => {
    // Scheduling works without one (src/tests/no-calendar.test.ts), so no
    // screen may say otherwise.
    const claims = [
      /nothing can be (scheduled|placed)/i,
      /needs a calendar/i,
      /scheduling needs/i,
      /until (it is|the app can see)/i,
      /lands on your calendar/i,
    ];
    const offenders = sourceFiles(SRC).flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return claims.filter((claim) => claim.test(text)).map((claim) => `${file}: ${claim}`);
    });
    expect(offenders).toEqual([]);
  });

  it("keeps the empty states free of calendar talk", () => {
    const lines = [scheduleCopy.nowEmpty.title, scheduleCopy.nowEmpty.body, scheduleCopy.weekEmpty, scheduleCopy.tasksEmpty];
    for (const line of lines) expect(line).not.toMatch(/calendar/i);
  });
});

describe("logging", () => {
  it("keeps only an error's name and first line", async () => {
    const { errorSummary } = await import("@/lib/log");
    const google = Object.assign(new Error("Invalid Credentials"), {
      config: { headers: { Authorization: "Bearer secret-token" } },
    });
    expect(errorSummary(google)).toBe("Error: Invalid Credentials");
    expect(errorSummary(new Error("Invalid `prisma.account.update()`\n  data: { access_token: \"x\" }"))).toBe(
      "Error: Invalid `prisma.account.update()`",
    );
  });

  it("never passes an error object to console", () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      /console\.(error|warn|log)\([^)]*,\s*(error|err|cause)\s*\)/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
