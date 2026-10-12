#!/usr/bin/env node
/**
 * Screenshots of every planner screen in both themes, at 375 and 430 (phones)
 * and 1280 (desktop), from the production build.
 *
 *   node --env-file=.env.local scripts/seed-preview.mjs > /tmp/sessions.json
 *   npm run build && npx next start -p 3100 &
 *   node scripts/screenshots.mjs http://localhost:3100 /tmp/sessions.json docs/screens/<date>-<name>
 *
 * The theme is chosen the way the app remembers it: the `appearance` cookie.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const [, , BASE = "http://localhost:3100", SESSIONS, OUT = "docs/screens/latest"] = process.argv;
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const sessions = JSON.parse(readFileSync(SESSIONS, "utf8"));
const WIDTHS = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 1280, height: 860 },
];
const THEMES = { calm: "calm.apricot.cobalt", momentum: "momentum.apricot.cobalt" };

/** [name, who is signed in (or null), path] */
const SCENARIOS = [
  ["01-landing", null, "/"],
  ["02-sign-in", null, "/login"],
  ["03-schedule", "maya", "/dashboard"],
  ["04-schedule-new-account", "fresh", "/dashboard"],
  ["05-hours", "maya", "/profiles"],
  ["06-settings", "maya", "/settings"],
];

async function run() {
  mkdirSync(OUT, { recursive: true });
  const log = [];
  const browser = await chromium.launch();
  const host = new URL(BASE).hostname;

  for (const [theme, cookie] of Object.entries(THEMES)) {
    for (const size of WIDTHS) {
      for (const [name, who, path] of SCENARIOS) {
        const file = `${theme}-w${size.width}-${name}.png`;
        if (ONLY && !ONLY.test(file)) continue;
        const context = await browser.newContext({
          viewport: size,
          deviceScaleFactor: 1,
          timezoneId: "America/New_York",
          locale: "en-US",
          colorScheme: "dark",
        });
        const cookies = [{ name: "appearance", value: cookie, domain: host, path: "/" }];
        if (who) cookies.push({ name: "authjs.session-token", value: sessions[who], domain: host, path: "/" });
        await context.addCookies(cookies);
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
        page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
        await page.goto(BASE + path, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        // Grow the viewport to the page's height so fixed parts (the phone
        // tab bar) are drawn where they sit on a real screen: at the bottom.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        if (height > size.height) {
          await page.setViewportSize({ width: size.width, height });
          await page.waitForTimeout(200);
        }
        await page.screenshot({ path: join(OUT, file) });
        log.push(`${file} overflowPx=${overflow}${errors.length ? ` errors=${JSON.stringify(errors)}` : ""}`);
        await context.close();
      }
    }
  }
  await browser.close();
  writeFileSync(join(OUT, "screens-log.txt"), log.join("\n") + "\n");
  process.stdout.write(log.join("\n") + "\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
