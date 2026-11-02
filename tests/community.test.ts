/**
 * Community page (DISCORD-M1) on the production build in `dist/` (run
 * `npm run build` first): routes, metadata, the section anchors the product
 * support strips link to, one Discord invite from the site config, safe
 * external links and no Discord widgets, scripts or requests.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse, type HTMLElement } from "node-html-parser";
import { beforeAll, describe, expect, it } from "vitest";
import { SITE } from "../src/config/site";
import { LOCALES, getDictionary, localizePath, type Locale } from "../src/i18n";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

function file(locale: Locale): string {
  return `${dist}${localizePath(locale, "/community/").slice(1)}index.html`;
}

function load(locale: Locale): HTMLElement {
  return parse(readFileSync(file(locale), "utf8"));
}

const text = (el: HTMLElement | null | undefined) =>
  (el?.text ?? "").replace(/\s+/g, " ").trim();

const meta = (doc: HTMLElement, selector: string) =>
  doc.querySelector(selector)?.getAttribute("content") ?? "";

beforeAll(() => {
  if (!existsSync(dist)) {
    throw new Error("dist/ not found: run `npm run build` before `npm test`.");
  }
});

describe.each(LOCALES)("community page for %s", (locale) => {
  const t = getDictionary(locale);
  const copy = t.communityPage;
  let doc: HTMLElement;
  let main: HTMLElement;

  beforeAll(() => {
    doc = load(locale);
    main = doc.querySelector("main") as HTMLElement;
  });

  it("is a static page at its localized route", () => {
    expect(existsSync(file(locale))).toBe(true);
  });

  it("sets lang, title, description and Open Graph from the dictionary", () => {
    expect(doc.querySelector("html")?.getAttribute("lang")).toBe(
      t.meta.htmlLang,
    );
    expect(doc.querySelector("title")?.text).toBe(copy.meta.title);
    expect(meta(doc, 'meta[name="description"]')).toBe(copy.meta.description);
    expect(meta(doc, 'meta[property="og:title"]')).toBe(copy.meta.title);
    expect(meta(doc, 'meta[property="og:locale"]')).toBe(t.meta.ogLocale);
  });

  it("declares canonical, og:url and hreflang alternates for the page", () => {
    const url = (l: Locale) =>
      `https://mythweld.com${localizePath(l, "/community/")}`;
    expect(
      doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe(url(locale));
    expect(meta(doc, 'meta[property="og:url"]')).toBe(url(locale));
    const alternates = doc
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .map((l) => [l.getAttribute("hreflang"), l.getAttribute("href")]);
    expect(alternates).toEqual([
      ...LOCALES.map((l) => [l, url(l)]),
      ["x-default", url("en")],
    ]);
  });

  it("has one h1 with no skipped heading levels", () => {
    const h1 = doc.querySelectorAll("h1");
    expect(h1).toHaveLength(1);
    expect(text(h1[0])).toBe(copy.heading);
    const levels = doc
      .querySelectorAll("h1, h2, h3, h4, h5, h6")
      .map((h) => Number(h.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((level, i) => {
      expect(level - (levels[i] ?? 1)).toBeLessThanOrEqual(1);
    });
  });

  it("renders the copy of its own locale only", () => {
    expect(text(main)).toContain(copy.lead);
    for (const other of LOCALES.filter((l) => l !== locale)) {
      expect(text(main)).not.toContain(getDictionary(other).communityPage.lead);
    }
  });

  it("keeps the page when switching language", () => {
    const links = doc.querySelectorAll("a[data-locale]");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      LOCALES.map((l) => localizePath(l, "/community/")),
    );
    const current = links.filter(
      (a) => a.getAttribute("aria-current") === "page",
    );
    expect(current.map((a) => a.getAttribute("data-locale"))).toEqual([locale]);
  });

  it("marks the Community link as current in the header", () => {
    const link = doc.querySelector(
      `header nav a[href="${localizePath(locale, "/community/")}"]`,
    );
    expect(text(link)).toBe(copy.nav);
    expect(link?.getAttribute("aria-current")).toBe("page");
  });

  it("links the footer to the community page", () => {
    expect(
      doc.querySelector(
        `footer a[href="${localizePath(locale, "/community/")}"]`,
      ),
    ).not.toBeNull();
  });

  it("has the sections the product support strips link to", () => {
    const sections = [
      { id: "forever-journey", copy: copy.foreverJourney },
      { id: "talentforge", copy: copy.talentforge },
    ] as const;
    for (const { id, copy: section } of sections) {
      const sectionEl = main.querySelector(`section#${id}`);
      expect(sectionEl, id).not.toBeNull();
      expect(text(sectionEl)).toContain(section.title);
      expect(text(sectionEl)).toContain(section.text);
    }
    // Book Creator is covered inside the Forever Journey section.
    expect(text(main.querySelector("section#forever-journey"))).toContain(
      t.home.products.bookCreator.name,
    );
    // Every id on the page is unique, so the anchors cannot drift.
    const ids = doc.querySelectorAll("[id]").map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("explains the rules and links the full rules inside the server", () => {
    const rules = main.querySelector("section#rules");
    expect(text(rules?.querySelector("h2"))).toBe(copy.rules.heading);
    expect(text(rules)).toContain(copy.rules.text);
    const link = rules?.querySelector(`a[href="${SITE.links.discord}"]`);
    expect(text(link)).toContain(copy.rules.link);
  });

  it("uses the single Discord invite from the config for every external link", () => {
    const allowed = new Set<string>(Object.values(SITE.links));
    const external = doc.querySelectorAll("a[href^='http']");
    expect(external.length).toBeGreaterThanOrEqual(2);
    for (const a of external) {
      const href = a.getAttribute("href") ?? "";
      expect(allowed.has(href), href).toBe(true);
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
    }
    // Exactly two Discord links — the hero CTA and the rules link — and
    // both carry the one invite with the strict rel.
    const invites = external.filter((a) =>
      (a.getAttribute("href") ?? "").startsWith("https://discord.gg/"),
    );
    expect(invites).toHaveLength(2);
    for (const a of invites) {
      expect(a.getAttribute("href")).toBe(SITE.links.discord);
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("loads nothing from Discord until the reader follows a link", () => {
    expect(doc.querySelectorAll("iframe")).toHaveLength(0);
    for (const script of doc.querySelectorAll("script[src]")) {
      expect(script.getAttribute("src")).toMatch(/^\//);
    }
    for (const resource of doc.querySelectorAll("img, source")) {
      const src =
        resource.getAttribute("src") ?? resource.getAttribute("srcset") ?? "";
      expect(src).not.toMatch(/^https?:/);
    }
    // The only Discord URLs anywhere in the HTML are the invite links.
    const discordUrls =
      doc.toString().match(/https?:\/\/[^\s"'<>]*discord[^\s"'<>]*/g) ?? [];
    expect(discordUrls).toEqual([SITE.links.discord, SITE.links.discord]);
  });

  it("links only to existing internal pages", () => {
    for (const a of doc.querySelectorAll("a[href^='/']")) {
      const href = a.getAttribute("href") ?? "";
      const path = href.split("#")[0] ?? "";
      expect(existsSync(`${dist}${path.slice(1)}index.html`), href).toBe(true);
    }
  });

  it("contains no forms, inputs or trackers", () => {
    expect(doc.querySelectorAll("form, input, textarea, select")).toHaveLength(
      0,
    );
    expect(doc.toString()).not.toMatch(
      /google-analytics|googletagmanager|fbq\(|ym\(|document\.cookie|localStorage|sessionStorage/i,
    );
  });
});
