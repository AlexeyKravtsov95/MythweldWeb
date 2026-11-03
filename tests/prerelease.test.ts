/** Issue #32: independent route baseline and the previously uncovered Community page. */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";
import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "../src/config/pages";
import { SITE } from "../src/config/site";
import { LOCALES, getDictionary, localizePath } from "../src/i18n";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
// Independent of PUBLIC_PATHS: deleting Community must fail this regression.
const paths = [
  "/",
  "/talentforge/",
  "/forever-journey/",
  "/book-creator/",
  "/community/",
] as const;
const pages = LOCALES.flatMap((locale) =>
  paths.map((path) => ({ locale, path, url: localizePath(locale, path) })),
);
const load = (url: string) =>
  parse(readFileSync(`${dist}${url.slice(1)}index.html`, "utf8"));

it("keeps all five page pairs in the public registry and sitemap", () => {
  expect(PUBLIC_PATHS).toEqual(paths);
  const xml = readFileSync(`${dist}sitemap.xml`, "utf8");
  expect(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort(),
  ).toEqual(pages.map((p) => `${SITE.url}${p.url}`).sort());
  expect(pages).toHaveLength(10);
});

describe.each(pages)("QA contract $url", ({ locale, path, url }) => {
  it("resolves every internal link including fragments on other pages", () => {
    for (const a of load(url).querySelectorAll("a[href]")) {
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") && !href.startsWith("#")) continue;
      const target = new URL(href, `${SITE.url}${url}`);
      expect(target.origin).toBe(SITE.url);
      expect(
        existsSync(`${dist}${target.pathname.slice(1)}index.html`),
        `${url} → ${href}`,
      ).toBe(true);
      if (target.hash)
        expect(
          load(target.pathname).getElementById(
            decodeURIComponent(target.hash.slice(1)),
          ),
          `${url} → ${href}`,
        ).not.toBeNull();
    }
  });
  it("keeps localized navigation and the same page in the language switch", () => {
    const doc = load(url);
    const t = getDictionary(locale);
    const link = doc.querySelector(
      `header nav a[href="${localizePath(locale, "/community/")}"]`,
    );
    expect(link?.text.trim()).toBe(t.communityPage.nav);
    expect(link?.getAttribute("aria-current")).toBe(
      path === "/community/" ? "page" : undefined,
    );
    expect(
      doc
        .querySelectorAll("a[data-locale]")
        .map((a) => [a.getAttribute("data-locale"), a.getAttribute("href")]),
    ).toEqual(LOCALES.map((l) => [l, localizePath(l, path)]));
  });
  it("keeps descriptions and Twitter metadata consistent in both locales", () => {
    const doc = load(url);
    const meta = (selector: string) =>
      doc.querySelector(selector)?.getAttribute("content");
    expect(doc.querySelector("html")?.getAttribute("lang")).toBe(locale);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(meta('meta[property="og:description"]')).toBe(
      meta('meta[name="description"]'),
    );
    expect(meta('meta[name="twitter:description"]')).toBe(
      meta('meta[name="description"]'),
    );
    expect(meta('meta[name="twitter:title"]')).toBe(
      doc.querySelector("title")?.text,
    );
  });
});

describe.each(LOCALES)("Community %s", (locale) => {
  it("renders localized copy, support anchors and only the approved Discord invite", () => {
    const doc = load(localizePath(locale, "/community/"));
    const t = getDictionary(locale);
    const copy = t.communityPage;
    expect(doc.querySelector("title")?.text).toBe(copy.meta.title);
    expect(
      doc.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toBe(copy.meta.description);
    expect(doc.querySelector("h1")?.text).toBe(copy.heading);
    expect(doc.querySelector("main")?.text).toContain(copy.lead);
    for (const [id, section] of [
      ["forever-journey", copy.foreverJourney],
      ["talentforge", copy.talentforge],
    ] as const) {
      const block = doc.getElementById(id);
      expect(block?.text).toContain(section.title);
      expect(block?.text).toContain(section.text);
    }
    const rules = doc.getElementById("rules");
    expect(rules?.text).toContain(copy.rules.heading);
    expect(rules?.text).toContain(copy.rules.text);
    const invites = doc.querySelectorAll("main a");
    expect(invites).toHaveLength(2);
    for (const link of invites) {
      expect(link.getAttribute("href")).toBe(SITE.links.discord);
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.text).toContain(t.a11y.opensInNewTab);
    }
    expect(
      doc.querySelectorAll("iframe,form,script[src^='http']"),
    ).toHaveLength(0);
    expect(doc.toString()).not.toMatch(
      /discord\.com\/widget|discord\.com\/api/,
    );
  });
});
