/**
 * Release gates of WEB-M0.5 on the production build in `dist/` (run
 * `npm run build` first): no unapproved placeholder on public pages, legal
 * addresses only once approved, the Russian sample book never published,
 * honest store states and robots.txt closed until the WEB-M0.6 launch.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse, type HTMLElement } from "node-html-parser";
import { beforeAll, describe, expect, it } from "vitest";
import { LEGAL } from "../src/config/legal";
import { PUBLIC_PATHS } from "../src/config/pages";
import { RELEASE } from "../src/config/release";
import { SITE } from "../src/config/site";
import {
  DEFAULT_LOCALE,
  LOCALES,
  getDictionary,
  localizePath,
} from "../src/i18n";
import { MEDIA } from "../src/media/catalog";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

/** The eight public pages: locale-neutral paths in every locale. */
const PAGES = LOCALES.flatMap((locale) =>
  PUBLIC_PATHS.map((path) => ({
    locale,
    path,
    url: localizePath(locale, path),
  })),
);
const ORIGIN = "https://mythweld.com";

function load(url: string): HTMLElement {
  return parse(readFileSync(`${dist}${url.slice(1)}index.html`, "utf8"));
}

const text = (el: HTMLElement | null | undefined) =>
  (el?.text ?? "").replace(/\s+/g, " ").trim();

beforeAll(() => {
  if (!existsSync(dist)) {
    throw new Error("dist/ not found: run `npm run build` before `npm test`.");
  }
});

describe.each(PAGES)("public page $url", ({ locale, path, url }) => {
  const t = getDictionary(locale);
  let doc: HTMLElement;

  beforeAll(() => {
    doc = load(url);
  });

  it("shows owner-confirmed store states without public store links", () => {
    const labels =
      locale === "ru"
        ? { android: "Закрытое тестирование", ios: "Ожидает проверки Apple" }
        : { android: "Closed testing", ios: "Awaiting Apple review" };
    const footer = doc.querySelector("footer");
    expect(text(footer?.querySelector('[data-state="testing"]'))).toBe(
      labels.android,
    );
    expect(text(footer?.querySelector('[data-state="awaiting_review"]'))).toBe(
      labels.ios,
    );
    expect(
      doc.querySelectorAll(
        'a[href*="play.google.com"], a[href*="apps.apple.com"]',
      ),
    ).toHaveLength(0);

    if (path === "/") {
      const plate = doc.querySelector("article[aria-labelledby='talentforge']");
      expect(text(plate?.querySelector('[data-state="testing"]'))).toBe(
        `Android: ${labels.android.toLocaleLowerCase()}`,
      );
      expect(text(plate?.querySelector('[data-state="awaiting_review"]'))).toBe(
        locale === "ru"
          ? "iOS: ожидает проверки Apple"
          : "iOS: awaiting Apple review",
      );
    }
    if (path === "/talentforge/") {
      const panel = doc.querySelector(
        "section[aria-labelledby='release-status']",
      );
      expect(text(panel?.querySelector('[data-state="testing"]'))).toBe(
        labels.android,
      );
      expect(text(panel?.querySelector('[data-state="awaiting_review"]'))).toBe(
        labels.ios,
      );
      expect(panel?.querySelector("time")?.getAttribute("datetime")).toBe(
        "2026-11-01",
      );
      expect(panel?.querySelectorAll('[aria-disabled="true"]')).toHaveLength(2);
    }
  });

  it("shows no unapproved placeholder", () => {
    const html = doc.toString();
    for (const other of LOCALES) {
      const media = getDictionary(other).media;
      expect(html).not.toContain(media.requiredBeforeRelease);
      for (const slot of Object.values(media.placeholders)) {
        expect(html).not.toContain(slot.title);
      }
    }
    expect(doc.querySelectorAll("[role='img']")).toHaveLength(0);
  });

  it("links legal pages only once they are approved (B7)", () => {
    const footer = doc.querySelector("footer");
    const labels = footer?.querySelectorAll("a").map(text) ?? [];
    const pages = [
      [t.footer.pages.privacy, LEGAL.privacy],
      [t.footer.pages.terms, LEGAL.terms],
      [t.footer.pages.contact, LEGAL.contact],
    ] as const;
    for (const [label, href] of pages) {
      expect(labels.includes(label)).toBe(href !== null);
    }
    const anyApproved = pages.some(([, href]) => href !== null);
    expect(text(footer).includes(t.footer.legalPending)).toBe(!anyApproved);
  });

  it("has no dead or invented links and no contact address", () => {
    for (const a of doc.querySelectorAll("a")) {
      const href = a.getAttribute("href") ?? "";
      expect(href, text(a)).not.toMatch(/^(#?|javascript:.*)$/);
    }
    expect(doc.toString()).not.toMatch(/mailto:|tel:/);
    expect(doc.toString()).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  });

  it("has a unique localized title and description", () => {
    const title = doc.querySelector("title")?.text ?? "";
    const description =
      doc.querySelector('meta[name="description"]')?.getAttribute("content") ??
      "";
    expect(title).toContain("Mythweld");
    expect(title.length).toBeLessThanOrEqual(70);
    expect(description.length).toBeGreaterThan(50);
    const others = PAGES.filter((page) => page.url !== url).map(
      (page) => load(page.url).querySelector("title")?.text,
    );
    expect(others).not.toContain(title);
  });

  it("declares canonical, hreflang, Open Graph and Twitter tags", () => {
    const meta = (key: string) =>
      doc
        .querySelector(`meta[property="${key}"], meta[name="${key}"]`)
        ?.getAttribute("content");
    const canonical = `${ORIGIN}${url}`;
    expect(
      doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe(canonical);
    const hreflang = doc
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .map((l) => `${l.getAttribute("hreflang")} ${l.getAttribute("href")}`);
    expect(hreflang).toEqual([
      ...LOCALES.map(
        (alt) =>
          `${getDictionary(alt).meta.htmlLang} ${ORIGIN}${localizePath(alt, path)}`,
      ),
      `x-default ${ORIGIN}${localizePath(DEFAULT_LOCALE, path)}`,
    ]);
    expect(meta("og:url")).toBe(canonical);
    expect(meta("og:title")).toBe(doc.querySelector("title")?.text);
    expect(meta("og:locale")).toBe(t.meta.ogLocale);
    const image = `${ORIGIN}${SITE.shareImage[locale]}`;
    expect(meta("og:image")).toBe(image);
    expect(meta("og:image:width")).toBe("1200");
    expect(meta("og:image:height")).toBe("630");
    expect(meta("og:image:alt")).toBe(t.meta.shareImageAlt);
    expect(meta("twitter:card")).toBe("summary_large_image");
    expect(meta("twitter:image")).toBe(image);
    expect(existsSync(`${dist}${SITE.shareImage[locale].slice(1)}`)).toBe(true);
  });

  it("gives the journal steps the command from the addon's own page", () => {
    if (!url.endsWith("/book-creator/")) return;
    expect(text(doc.querySelector("main"))).toContain("/fj open");
  });
});

describe("owner-confirmed release facts (2026-11-01)", () => {
  it("keeps both stores unpublished and preserves the addon release", () => {
    expect(RELEASE.checked).toBe("2026-11-01");
    expect(RELEASE.talentforge.android).toBe("testing");
    expect(RELEASE.talentforge.ios).toBe("awaiting_review");
    expect(RELEASE.talentforge.googlePlay).toBeNull();
    expect(RELEASE.talentforge.appStore).toBeNull();
    expect(RELEASE.foreverJourney.curseforge).toBe("available");
  });
});

describe("legal configuration", () => {
  it("keeps every legal address null until the owner approves it", () => {
    expect(LEGAL).toEqual({ privacy: null, terms: null, contact: null });
  });

  it("has drafts in docs only, marked as not approved", () => {
    const dir = new URL("../docs/legal-drafts/", import.meta.url);
    const drafts = readdirSync(dir).filter((file) => file.endsWith(".md"));
    for (const name of [
      "privacy-policy.en.md",
      "privacy-policy.ru.md",
      "terms.en.md",
      "terms.ru.md",
    ]) {
      expect(drafts).toContain(name);
      const body = readFileSync(new URL(name, dir), "utf8");
      expect(body).toMatch(/DRAFT|ЧЕРНОВИК/);
      expect(body).toMatch(/OWNER DECISION|РЕШЕНИЕ ВЛАДЕЛЬЦА/);
    }
    expect(
      readdirSync(dist, { recursive: true, encoding: "utf8" }).some((file) =>
        /legal-drafts|privacy-policy|terms\.(en|ru)/.test(file),
      ),
    ).toBe(false);
  });
});

describe("sitemap", () => {
  let xml = "";

  beforeAll(() => {
    xml = readFileSync(`${dist}sitemap.xml`, "utf8");
  });

  it("lists exactly the eight public pages", () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toHaveLength(8);
    expect(locs.sort()).toEqual(
      PAGES.map((page) => `${ORIGIN}${page.url}`).sort(),
    );
    for (const page of PAGES) {
      expect(existsSync(`${dist}${page.url.slice(1)}index.html`)).toBe(true);
    }
  });

  it("never lists dev previews, drafts or assets", () => {
    expect(xml).not.toMatch(/\/dev\/|legal-drafts|_astro|\.png|404/);
  });

  it("links every page to its alternates", () => {
    const alternates = xml.match(/<xhtml:link /g) ?? [];
    expect(alternates).toHaveLength(PAGES.length * (LOCALES.length + 1));
    const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];
    for (const page of PAGES) {
      const entry = entries.find(([, body]) =>
        body?.includes(`<loc>${ORIGIN}${page.url}</loc>`),
      );
      expect(entry, page.url).toBeDefined();
      const links = parse(entry?.[1] ?? "").querySelectorAll("[hreflang]");
      expect(
        links.map((link) => [
          link.getAttribute("hreflang"),
          link.getAttribute("href"),
        ]),
      ).toEqual([
        ...LOCALES.map((locale) => [
          locale,
          `${ORIGIN}${localizePath(locale, page.path)}`,
        ]),
        ["x-default", `${ORIGIN}${localizePath(DEFAULT_LOCALE, page.path)}`],
      ]);
    }
  });
});

describe("build output", () => {
  it("never publishes the Russian sample book, not even unlinked (B4)", () => {
    const blocked = new Set(
      (["bc-sample-cover", "bc-sample-chapter"] as const).map(
        (group) => MEDIA[group].ru?.sha256,
      ),
    );
    expect(blocked.size).toBe(2);
    const files = readdirSync(dist, { recursive: true, encoding: "utf8" });
    for (const file of files.filter((f) => /\.(png|webp|avif)$/.test(f))) {
      const sha = createHash("sha256")
        .update(readFileSync(`${dist}${file}`))
        .digest("hex");
      expect(blocked.has(sha), file).toBe(false);
    }
  });

  it("keeps robots.txt closed until the WEB-M0.6 launch", () => {
    const robots = readFileSync(`${dist}robots.txt`, "utf8");
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Disallow: \/$/m);
    expect(robots).not.toMatch(/^Allow:/m);
  });
});
