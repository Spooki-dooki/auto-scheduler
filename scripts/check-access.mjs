#!/usr/bin/env node
/**
 * Re-measures the audit's checkable findings on the production build, in both
 * themes:
 *   - no sideways scroll at 320px, or at 375px with browser text at 200%
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

async function open(browser, { width, height = 812, theme, who, path, fontSize }) {
  const context = await browser.newContext({ viewport: { width, height }, timezoneId: "America/New_York" });
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
