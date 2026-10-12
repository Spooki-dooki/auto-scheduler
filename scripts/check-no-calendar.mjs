#!/usr/bin/env node
/**
 * Signs in as the preview account with no calendar connected ("jordan" from
 * scripts/seed-preview.mjs), adds a task through the real phone-width form,
 * and checks it is planned straight away: the page says where it landed, the
 * week shows it, Re-plan works, and the database holds its blocks (kept in
 * the app, not sent anywhere).
 *
 *   node --env-file=.env.local scripts/check-no-calendar.mjs http://localhost:3100 /tmp/sessions.json
 *
 * Refuses to run unless DATABASE_URL points at localhost. Exits non-zero on
 * the first failure.
 */
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const [, , BASE = "http://localhost:3100", SESSIONS] = process.argv;
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(process.env.DATABASE_URL ?? "")) {
  console.error("check-no-calendar: DATABASE_URL is not a localhost database. Refusing to run.");
  process.exit(1);
}
const token = JSON.parse(readFileSync(SESSIONS, "utf8")).jordan;
const host = new URL(BASE).hostname;
const TITLE = "Psych 101 reading notes";
const LINE = "Connect your calendar so I can avoid your classes and events.";

const results = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) throw new Error(`${name} ${detail}`);
}

async function run() {
  const prisma = new PrismaClient();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      timezoneId: "America/New_York",
      colorScheme: "dark",
    });
    await context.addCookies([{ name: "authjs.session-token", value: token, domain: host, path: "/" }]);
    const page = await context.newPage();
    await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });

    const lines = await page.getByRole("button", { name: LINE }).count();
    check("one quiet line asks for the calendar", lines === 1, `${lines} found`);
    const body = await page.locator("main").innerText();
    check("nothing says scheduling waits for a calendar", !/nothing can be|needs a calendar/i.test(body));
    check("Re-plan is available without a calendar", await page.getByRole("button", { name: "Re-plan now" }).isEnabled());

    // Phones: the plan comes before the add field, and the add field is
    // collapsed to one input.
    const order = await page.evaluate(() => {
      const top = (sel) => document.querySelector(sel)?.getBoundingClientRect().top ?? -1;
      return { week: top("#week-heading"), add: top("#title"), tasks: top("#tasks-heading") };
    });
    check("phone order: week, then add, then tasks", order.week < order.add && order.add < order.tasks, JSON.stringify(order));
    check("add form starts collapsed", !(await page.locator("#deadline").isVisible()));
    check("placeholder says Add something…", (await page.locator("#title").getAttribute("placeholder")) === "Add something…");

    await page.locator("#title").click();
    check("tapping it opens the form", await page.locator("#deadline").isVisible());
    await page.locator("#title").fill(TITLE);
    await page.getByRole("button", { name: "2h", exact: true }).click();
    check("chosen length is marked pressed", (await page.getByRole("button", { name: "2h", exact: true }).getAttribute("aria-pressed")) === "true");

    const created = page.waitForResponse((r) => r.url().endsWith("/api/tasks") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Add and schedule" }).click();
    const response = await created;
    check("task saved", response.status() === 201, `POST ${response.status()}`);

    const status = page.getByRole("status").filter({ hasText: "First session:" });
    await status.waitFor({ timeout: 10_000 });
    check("the page says where it landed", true, (await status.innerText()).trim());

    await page.waitForFunction((t) => document.querySelector("#week-heading")?.closest("section")?.textContent?.includes(t), TITLE);
    check("the week shows it", true);
    const tasksText = await page.locator("#tasks-heading").locator("..").innerText();
    check("the task list shows it", tasksText.includes(TITLE));
    check("no 'not on your calendar yet' noise without a calendar", !tasksText.includes("not on your calendar yet"));

    const replan = page.waitForResponse((r) => r.url().endsWith("/api/schedule"));
    await page.getByRole("button", { name: "Re-plan now" }).click();
    check("Re-plan runs without a calendar", (await replan).status() === 200);

    const task = await prisma.task.findFirst({
      where: { title: TITLE, user: { email: "jordan@preview.local" } },
      include: { blocks: true },
    });
    const minutes = (task?.blocks ?? []).reduce((sum, b) => sum + (b.end - b.start) / 60_000, 0);
    check("database: task is scheduled", task?.status === "SCHEDULED", task?.status);
    check("database: two hours of blocks", minutes === 120, `${minutes} min in ${task?.blocks.length} blocks`);
    check("database: blocks stay in the app (not synced anywhere)", task.blocks.every((b) => !b.synced && !b.googleEventId));
    await context.close();
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

run()
  .then(() => process.stdout.write(results.join("\n") + "\n"))
  .catch((err) => {
    process.stdout.write(results.join("\n") + "\n");
    console.error(err.message);
    process.exit(1);
  });
