#!/usr/bin/env node
/**
 * Re-measures the audit's checkable findings on the production build, in both
 * themes:
 *   - no sideways scroll at 320px, or at 375px with browser text at 200%,
 *     with the add form and an Hours day opened as well as closed
 *   - Settings renders without a hydration error in another time zone
 *   - closing the add form keeps focus on its field; "Remove these hours"
 *     is named starting with its visible words
 *   - on phones, nothing that takes keyboard focus is hidden by the tab bar
 *   - the first Tab stop is "Skip to content"
 *   - every page has its own title
 *   - Settings' radio groups move with the arrow keys
 *
 *   node scripts/check-access.mjs http://localhost:3100 /tmp/sessions.json
 *
 * Read-only: every request that would change data is blocked. Exits non-zero
 * if anything fails.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const [, , BASE = "http://localhost:3100", SESSIONS] = process.argv;
const sessions = JSON.parse(readFileSync(SESSIONS, "utf8"));
const host = new URL(BASE).hostname;
const PAGES = [
  ["/", null],
  ["/login", null],
  ["/dashboard", "maya"],
  ["/dashboard", "fresh"],
  ["/profiles", "maya"],
  ["/settings", "maya"],
];
const THEMES = { calm: "calm.apricot.cobalt", momentum: "momentum.apricot.cobalt" };

const results = [];
let failed = 0;
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed += 1;
}

/** Opens what a page hides until tapped: the add form, Monday's hours. */
async function openUp(page, path) {
  if (path === "/dashboard") await page.locator("#title").click();
  if (path === "/profiles") await page.getByRole("button", { name: /^Mon ·/ }).first().click();
  await page.waitForTimeout(150);
}

async function open(browser, { width, height = 812, theme, who, path, fontSize, timezoneId = "America/New_York" }) {
  const context = await browser.newContext({ viewport: { width, height }, timezoneId });
  const cookies = [{ name: "appearance", value: THEMES[theme], domain: host, path: "/" }];
  if (who) cookies.push({ name: "authjs.session-token", value: sessions[who], domain: host, path: "/" });
  await context.addCookies(cookies);
  // Look, don't touch: nothing that writes reaches the server.
  await context.route("**/*", (route) =>
    route.request().method() === "GET" ? route.continue() : route.fulfill({ status: 200, body: "{}" }),
  );
  const page = await context.newPage();
  if (fontSize) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: fontSize, fixed: fontSize } });
  }
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function run() {
  const browser = await chromium.launch();
  const titles = new Map();

  for (const theme of Object.keys(THEMES)) {
    for (const [path, who] of PAGES) {
      const label = `${theme} ${path}${who ? ` as ${who}` : ""}`;

      for (const [width, fontSize, name] of [[320, null, "320px"], [375, 32, "375px at 200% text"]]) {
        const { context, page } = await open(browser, { width, theme, who, path, fontSize });
        const px = await overflow(page);
        check(`${label}: no sideways scroll at ${name}`, px <= 0, `${px}px`);
        if (who && (path === "/dashboard" || path === "/profiles")) {
          await openUp(page, path);
          const opened = await overflow(page);
          check(`${label}: still none with it opened, at ${name}`, opened <= 0, `${opened}px`);
        }
        await context.close();
      }

      const { context, page } = await open(browser, { width: 375, theme, who, path });
      titles.set(`${path}${who ? `#${who}` : ""}`, await page.title());

      if (who) {
        await page.keyboard.press("Tab");
        const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
        check(`${label}: first Tab stop skips to content`, first === "Skip to content", first);

        // Walk every Tab stop; each must end up clear of the fixed tab bar.
        const hidden = [];
        for (let i = 0; i < 80; i += 1) {
          await page.keyboard.press("Tab");
          const verdict = await page.evaluate(() => {
            const el = document.activeElement;
            const bar = document.querySelector("nav.fixed");
            if (!el || el === document.body || !bar || bar.contains(el)) return null;
            const r = el.getBoundingClientRect();
            const top = bar.getBoundingClientRect().top;
            const name = (el.getAttribute("aria-label") || el.textContent || el.id || el.tagName).trim().slice(0, 40);
            return { name, covered: r.top >= top - 1 };
          });
          if (verdict?.covered) hidden.push(verdict.name);
        }
        check(`${label}: focus never hidden behind the tab bar`, hidden.length === 0, hidden.join(", "));
      }

      if (path === "/dashboard" && who === "maya") {
        await page.locator("#title").click();
        await page.getByRole("button", { name: "Close" }).click();
        const focused = await page.evaluate(() => document.activeElement?.id);
        check(`${label}: closing the add form keeps focus on its field`, focused === "title", focused);
      }

      if (path === "/profiles") {
        await openUp(page, path);
        const remove = page.getByRole("button", { name: /^Remove these hours/ }).first();
        const name = await remove.getAttribute("aria-label");
        const visible = (await remove.innerText()).trim();
        check(`${label}: "${visible}" is named starting with its visible words`, name?.startsWith(visible), name);
      }

      if (path === "/settings") {
        const radio = page.getByRole("radio", { name: /Calm theme|Momentum theme/ }).and(page.locator('[aria-checked="true"]'));
        await radio.focus();
        const before = await radio.getAttribute("aria-label");
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(200);
        const after = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
        const checked = await page.evaluate(() => document.activeElement?.getAttribute("aria-checked"));
        check(`${label}: arrow keys move through the theme choices`, after !== before && checked === "true", `${before?.split(".")[0]} -> ${after?.split(".")[0]}`);
      }
      await context.close();
    }
  }

  // Another time zone than the server's: the page must not be rebuilt.
  for (const theme of Object.keys(THEMES)) {
    const { context, page } = await open(browser, {
      width: 375, theme, who: "maya", path: "/settings", timezoneId: "America/Los_Angeles",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
    await page.reload({ waitUntil: "networkidle" });
    check(`${theme} /settings in Los Angeles: no hydration error`, errors.length === 0, errors.join(" | "));
    await context.close();
  }

  const distinct = new Set(titles.values());
  check("every page has its own title", distinct.size >= 5, [...distinct].join(" | "));
  await browser.close();
}

run()
  .then(() => {
    process.stdout.write(results.join("\n") + "\n");
    process.exit(failed ? 1 : 0);
  })
  .catch((err) => {
    process.stdout.write(results.join("\n") + "\n");
    console.error(err);
    process.exit(1);
  });
