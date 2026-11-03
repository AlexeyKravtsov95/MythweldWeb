// Run against a built local preview; tools are installed outside the project.
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
const require = createRequire(resolve(process.env.QA_TOOLS, "package.json"));
const { chromium } = require("playwright");
const axe = require.resolve("axe-core/axe.min.js");
const output = dirname(fileURLToPath(import.meta.url));
const base = process.env.QA_BASE ?? "http://127.0.0.1:4322";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error("Local preview required");
const browser = await chromium.launch({
  executablePath:
    process.env.QA_CHROME ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const browserVersion = browser.version();
const results = [];
for (const locale of ["en", "ru"])
  for (const path of [
    "/",
    "/talentforge/",
    "/forever-journey/",
    "/book-creator/",
    "/community/",
  ])
    for (const width of [320, 390, 768, 1440]) {
      const route = (locale === "ru" ? "/ru" : "") + path;
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("response", (r) => {
        if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
      });
      await page.goto(base + route);
      await page.evaluate(() => document.fonts.ready);
      // Force lazy images to load, then inspect the entire rendered page.
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.evaluate(async () => {
        await Promise.all(
          [...document.images].map((i) => {
            i.loading = "eager";
            return i.decode().catch(() => {});
          }),
        );
        scrollTo(0, 0);
      });
      const toggle = page.locator(".menu-toggle");
      let menu = "desktop";
      if (width <= 900) {
        await toggle.focus();
        await page.keyboard.press("Enter");
        const opened =
          (await toggle.getAttribute("aria-expanded")) === "true" &&
          (await page.locator("#site-menu").isVisible());
        await page.keyboard.press("Tab");
        await page.keyboard.press("Escape");
        const closed =
          (await toggle.getAttribute("aria-expanded")) === "false" &&
          !(await page.locator("#site-menu").isVisible()) &&
          (await toggle.evaluate((e) => e === document.activeElement));
        menu = opened && closed ? "pass" : "FAIL";
        await page.keyboard.press("Enter");
      }
      const layout = await page.evaluate(() => {
        const visible = (e) => {
          const r = e.getBoundingClientRect();
          const s = getComputedStyle(e);
          return r.width > 0 && r.height > 0 && s.visibility !== "hidden";
        };
        const targets = [
          ...document.querySelectorAll("a[href],button:not([disabled])"),
        ].filter(visible);
        const short = targets
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width < 43.99 || r.height < 43.99;
          })
          .map((e) => ({
            text: e.textContent.trim(),
            w: e.getBoundingClientRect().width,
            h: e.getBoundingClientRect().height,
          }));
        const overflowing = [...document.querySelectorAll("body *")]
          .filter(visible)
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.right > innerWidth + 1 || r.left < -1;
          })
          .filter(
            (e) =>
              !e.closest(".visually-hidden") &&
              !e.classList.contains("skip-link"),
          )
          .map((e) => ({ tag: e.tagName, cls: e.className }));
        const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        const blend = (fg, bg) =>
          fg
            .slice(0, 3)
            .map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
        const bg = (e) =>
          e
            ? blend(
                rgb(getComputedStyle(e).backgroundColor),
                bg(e.parentElement),
              )
            : [255, 255, 255];
        const lum = (c) =>
          c
            .map((x) => x / 255)
            .map((x) =>
              x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4,
            )
            .reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
        let min = 100;
        const low = [];
        for (const e of document.querySelectorAll("body *")) {
          if (
            !visible(e) ||
            e.closest(".visually-hidden") ||
            ![...e.childNodes].some(
              (n) => n.nodeType === 3 && n.textContent.trim(),
            )
          )
            continue;
          const s = getComputedStyle(e),
            background = bg(e),
            a = lum(blend(rgb(s.color), background)),
            b = lum(background),
            ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          min = Math.min(min, ratio);
          if (ratio < 4.5)
            low.push({ text: e.textContent.trim().slice(0, 80), ratio });
        }
        return {
          viewport: innerWidth,
          scroll: document.documentElement.scrollWidth,
          short,
          overflowing,
          minContrast: min,
          low,
          targets: targets.length,
          brokenImages: [...document.images]
            .filter((i) => !i.naturalWidth)
            .map((i) => i.src),
        };
      });
      await page.addScriptTag({ path: axe });
      const accessibility = await page.evaluate(async () => {
        const r = await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        });
        return {
          violations: r.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
          incomplete: r.incomplete.map((v) => ({
            id: v.id,
            nodes: v.nodes.length,
          })),
        };
      });
      // Real Tab traversal, including the expanded mobile menu and skip link.
      await page.evaluate(() => {
        document.activeElement.blur();
        document.body.tabIndex = -1;
        document.body.focus();
      });
      const seen = new Set();
      const focusFailures = [];
      for (let i = 0; i < 100; i++) {
        await page.keyboard.press("Tab");
        const f = await page.evaluate(() => {
          const e = document.activeElement,
            s = getComputedStyle(e),
            r = e.getBoundingClientRect();
          return {
            key: [...document.querySelectorAll("a,button")].indexOf(e),
            tag: e.tagName,
            visible:
              e.matches(":focus-visible") &&
              s.outlineStyle !== "none" &&
              parseFloat(s.outlineWidth) >= 2 &&
              s.clipPath === "none",
            inViewport:
              r.top >= -1 &&
              r.bottom <= innerHeight + 1 &&
              r.left >= -1 &&
              r.right <= innerWidth + 1,
          };
        });
        if (seen.has(f.key) || f.tag === "BODY") break;
        seen.add(f.key);
        if (!f.visible || !f.inViewport) focusFailures.push(f);
      }
      const other = locale === "en" ? "ru" : "en";
      await page.locator(`a[data-locale="${other}"]`).press("Enter");
      await page.waitForURL(base + (other === "ru" ? "/ru" : "") + path);
      const languageSwitch =
        (await page.locator("html").getAttribute("lang")) === other;
      await page.goto(base + route);
      await page.evaluate(() => document.fonts.ready);
      if (path === "/community/" && (width === 320 || width === 1440))
        await page.screenshot({
          path: resolve(output, `community-${locale}-${width}.png`),
          fullPage: true,
          type: "png",
        });
      results.push({
        route,
        width,
        menu,
        ...layout,
        tabbed: seen.size,
        focusFailures,
        languageSwitch,
        accessibility,
        errors,
      });
      console.log(
        route,
        width,
        JSON.stringify({
          overflow: layout.scroll > width,
          short: layout.short.length,
          contrast: layout.minContrast,
          focus: focusFailures.length,
          axe: accessibility.violations.length,
        }),
      );
      await page.close();
    }
await browser.close();
writeFileSync(
  resolve(output, "browser-results.json"),
  JSON.stringify(
    {
      date: new Date().toISOString(),
      browser: `Chromium (local Google Chrome ${browserVersion})`,
      results,
    },
    null,
    2,
  ) + "\n",
);
if (
  results.some(
    (r) =>
      r.scroll > r.width ||
      r.overflowing.length ||
      r.tabbed !== r.targets ||
      r.short.length ||
      r.low.length ||
      r.brokenImages.length ||
      r.focusFailures.length ||
      !r.languageSwitch ||
      r.menu === "FAIL" ||
      r.accessibility.violations.length ||
      r.errors.length,
  )
)
  process.exitCode = 1;
