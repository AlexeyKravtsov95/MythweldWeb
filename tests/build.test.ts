/**
 * Smoke checks on the production build in `dist/`. Run `npm run build` first.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse, type HTMLElement } from "node-html-parser";
import { beforeAll, describe, expect, it } from "vitest";
import { LOCALES, getDictionary, localeRoot, type Locale } from "../src/i18n";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

function pageFile(locale: Locale): string {
  return `${dist}${localeRoot(locale).slice(1)}index.html`;
}

function load(locale: Locale): HTMLElement {
  return parse(readFileSync(pageFile(locale), "utf8"));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" });
}

beforeAll(() => {
  if (!existsSync(dist)) {
    throw new Error("dist/ not found: run `npm run build` before `npm test`.");
  }
});

describe.each(LOCALES)("built page for %s", (locale) => {
  const t = getDictionary(locale);
  let doc: HTMLElement;

  beforeAll(() => {
    doc = load(locale);
  });

  it("is generated as static HTML at its route", () => {
    expect(existsSync(pageFile(locale))).toBe(true);
  });

  it("sets the correct <html lang> and title", () => {
    expect(doc.querySelector("html")?.getAttribute("lang")).toBe(
      t.meta.htmlLang,
    );
    expect(doc.querySelector("title")?.text).toBe(t.meta.homeTitle);
    expect(
      doc.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toBe(t.meta.homeDescription);
  });

  it("has exactly one h1", () => {
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
  });

  it("renders localized visible content", () => {
    const main = doc.querySelector("main")?.text ?? "";
    expect(main).toContain(t.home.heading);
    expect(main).toContain(t.home.lead);
    expect(main).toContain(t.home.products.talentforge.summary);
    expect(main).toContain(t.home.products.foreverJourney.summary);
    for (const other of LOCALES.filter((l) => l !== locale)) {
      const copy = getDictionary(other).home;
      expect(main).not.toContain(copy.heading);
      expect(main).not.toContain(copy.lead);
    }
  });

  it("has a skip link to the main landmark", () => {
    const skip = doc.querySelector("body > a");
    expect(skip?.getAttribute("href")).toBe("#main");
    expect(skip?.text).toBe(t.a11y.skipToContent);
    expect(doc.querySelector("main#main")).not.toBeNull();
  });

  it("labels every navigation landmark", () => {
    const navs = doc.querySelectorAll("nav");
    expect(navs.length).toBeGreaterThan(0);
    for (const nav of navs) expect(nav.getAttribute("aria-label")).toBeTruthy();
  });

  it("links to every locale and marks the current one", () => {
    const links = doc.querySelectorAll("a[data-locale]");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      LOCALES.map(localeRoot),
    );
    const current = links.filter(
      (a) => a.getAttribute("aria-current") === "page",
    );
    expect(current.map((a) => a.getAttribute("data-locale"))).toEqual([locale]);
  });

  it("declares canonical and hreflang alternates", () => {
    const canonical = doc
      .querySelector('link[rel="canonical"]')
      ?.getAttribute("href");
    expect(canonical).toBe(`https://mythweld.com${localeRoot(locale)}`);
    const alternates = doc
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .map((l) => [l.getAttribute("hreflang"), l.getAttribute("href")]);
    expect(alternates).toEqual([
      ...LOCALES.map((l) => [l, `https://mythweld.com${localeRoot(l)}`]),
      ["x-default", "https://mythweld.com/"],
    ]);
  });

  it("only links internally to pages that exist", () => {
    for (const a of doc.querySelectorAll("a[href^='/']")) {
      const href = a.getAttribute("href") ?? "";
      const path = href.split("#")[0] ?? "";
      expect(existsSync(`${dist}${path.slice(1)}index.html`), href).toBe(true);
    }
  });

  it("opens external links safely in a new tab", () => {
    for (const a of doc.querySelectorAll("a[href^='http']")) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
    }
  });

  it("preloads only self-hosted fonts that exist", () => {
    const preloads = doc.querySelectorAll('link[rel="preload"][as="font"]');
    expect(preloads.length).toBeGreaterThan(0);
    for (const link of preloads) {
      const href = link.getAttribute("href") ?? "";
      expect(href).toMatch(/^\/fonts\//);
      expect(existsSync(`${dist}${href.slice(1)}`), href).toBe(true);
    }
    const cyrillic = preloads.some((l) =>
      l.getAttribute("href")?.includes("cyrillic"),
    );
    expect(cyrillic).toBe(locale === "ru");
  });

  it("shows the Blizzard fan disclaimer", () => {
    expect(doc.querySelector("footer")?.text).toContain(t.footer.disclaimer);
    expect(t.footer.disclaimer).toMatch(/Blizzard Entertainment, Inc\./);
  });

  it("loads no third-party scripts, frames or forms", () => {
    for (const script of doc.querySelectorAll("script[src]")) {
      expect(script.getAttribute("src")).toMatch(/^\//);
    }
    expect(doc.querySelectorAll("iframe, form")).toHaveLength(0);
  });
});

describe("site output", () => {
  it("contains only the expected pages", () => {
    const pages = listFiles(dist)
      .filter((file) => file.endsWith(".html"))
      .sort();
    expect(pages).toEqual([
      "404.html",
      "forever-journey/index.html",
      "index.html",
      "ru/forever-journey/index.html",
      "ru/index.html",
      "ru/talentforge/index.html",
      "talentforge/index.html",
    ]);
  });

  it("does not publish the dev component preview", () => {
    expect(existsSync(`${dist}dev`)).toBe(false);
  });

  it("ships self-hosted fonts with their licences and no font CDN", () => {
    for (const file of [
      "fonts/geologica/geologica-latin-wght-shrp.woff2",
      "fonts/geologica/geologica-cyrillic-wght-shrp.woff2",
      "fonts/geologica/OFL.txt",
      "fonts/jetbrains-mono/jetbrains-mono-latin-500.woff2",
      "fonts/jetbrains-mono/OFL.txt",
    ]) {
      expect(existsSync(`${dist}${file}`), file).toBe(true);
    }
    const text = listFiles(dist)
      .filter((file) => /\.(html|css|js)$/.test(file))
      .map((file) => readFileSync(`${dist}${file}`, "utf8"))
      .join("\n");
    expect(text).toMatch(/@font-face/);
    expect(text).not.toMatch(
      /fonts\.googleapis|fonts\.gstatic|use\.typekit|fonts\.bunny/,
    );
  });

  it("uses the v3.2 logo mark geometry in the favicon and LogoMark", () => {
    const paths = ["M8 8h30v14H22v34H8z", "M56 56H26V42h16V8h14z"];
    const favicon = readFileSync(`${dist}favicon.svg`, "utf8");
    const logo = readFileSync(
      new URL("../src/components/LogoMark.astro", import.meta.url),
      "utf8",
    );
    for (const d of paths) {
      expect(favicon).toContain(`d="${d}"`);
      expect(logo).toContain(`d="${d}"`);
    }
    expect(favicon).toContain('viewBox="0 0 64 64"');
  });

  it("does not publish an /en/ duplicate of the default locale", () => {
    expect(existsSync(`${dist}en`)).toBe(false);
  });

  it("does not advertise the sitemap in robots.txt before WEB-M0.6", () => {
    const robots = readFileSync(`${dist}robots.txt`, "utf8");
    expect(robots).toMatch(/^User-agent: \*/m);
    expect(robots).not.toMatch(/^sitemap:/im);
    expect(listFiles(dist).filter((file) => /sitemap/i.test(file))).toEqual([
      "sitemap.xml",
    ]);
  });
});
