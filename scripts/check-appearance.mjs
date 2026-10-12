#!/usr/bin/env node
/**
 * Drives Settings -> Appearance in the production build and checks that the
 * switch is instant, saved to the account, survives a reload, and follows the
 * account onto a "new device" (no cookie).
 *
 *   node scripts/check-appearance.mjs http://localhost:3100 /tmp/sessions.json
 *
 * Uses the "maya" preview account from scripts/seed-preview.mjs and puts its
 * appearance back to Calm at the end. Exits non-zero on the first failure.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const [, , BASE = "http://localhost:3100", SESSIONS] = process.argv;
const token = JSON.parse(readFileSync(SESSIONS, "utf8")).maya;
const host = new URL(BASE).hostname;

const results = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) throw new Error(`${name} ${detail}`);
}

const ground = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const themeAttr = (page) =>
  page.evaluate(() => `${document.documentElement.dataset.theme}/${document.documentElement.dataset.accent}`);

async function signedIn(browser, withCookie) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const cookies = [{ name: "authjs.session-token", value: token, domain: host, path: "/" }];
  if (withCookie) cookies.push({ name: "appearance", value: withCookie, domain: host, path: "/" });
  await context.addCookies(cookies);
  return context;
}

async function run() {
  const browser = await chromium.launch();
  let context = await signedIn(browser, null);
  let page = await context.newPage();

  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  check("no saved choice opens in Calm", (await ground(page)) === "rgb(18, 16, 14)", await ground(page));

  const t0 = Date.now();
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/appearance") && r.request().method() === "PATCH");
  await page.getByRole("radio", { name: /Momentum theme/ }).click();
  await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === "rgb(5, 5, 5)");
  const ms = Date.now() - t0;
  check("tapping Momentum switches the whole page, no reload", true, `${ms}ms`);
  check("switch is instant", ms < 1000, `${ms}ms`);
  const response = await saved;
  check("saved to the account", response.status() === 200, `PATCH ${response.status()}`);

  await page.getByRole("radio", { name: "Crimson accent" }).click();
  await page.waitForFunction(() => document.documentElement.dataset.accent === "crimson");
  check("accent switches", (await themeAttr(page)) === "momentum/crimson");
  await page.waitForTimeout(500);

  await page.reload({ waitUntil: "networkidle" });
  check("survives a reload (server renders it)", (await themeAttr(page)) === "momentum/crimson", await themeAttr(page));
  check("selected card says so", (await page.getByRole("radio", { name: /Momentum theme/ }).getAttribute("aria-checked")) === "true");
  await context.close();

  // A new device: signed in, no appearance cookie. The account wins.
  context = await signedIn(browser, null);
  page = await context.newPage();
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.theme === "momentum", null, { timeout: 5000 });
  check("follows the account to a device without the cookie", (await themeAttr(page)) === "momentum/crimson", await themeAttr(page));

  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: /Calm theme/ }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === "calm");
  await page.waitForTimeout(500);
  check("back to Calm keeps each theme's accent", (await themeAttr(page)) === "calm/apricot", await themeAttr(page));

  // Reduced motion: still switches, just without the crossfade.
  const reduced = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await reduced.addCookies([{ name: "authjs.session-token", value: token, domain: host, path: "/" }]);
  const rp = await reduced.newPage();
  await rp.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await rp.getByRole("radio", { name: /Momentum theme/ }).click();
  await rp.waitForFunction(() => document.documentElement.dataset.theme === "momentum");
  check("switches with reduced motion on", true);
  await rp.getByRole("radio", { name: /Calm theme/ }).click();
  await rp.waitForTimeout(500);
  await reduced.close();

  await browser.close();
}

run()
  .then(() => process.stdout.write(results.join("\n") + "\n"))
  .catch((err) => {
    process.stdout.write(results.join("\n") + "\n");
    console.error(err.message);
    process.exit(1);
  });
