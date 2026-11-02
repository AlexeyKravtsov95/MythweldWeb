import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { parse } from "node-html-parser";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import LegalPage from "../src/components/legal/LegalPage.astro";
import { LOCALES, getDictionary } from "../src/i18n";
import type { LegalDocumentId } from "../src/i18n/legal";
import { legalFixtures, testEmail, testUrl } from "./fixtures/legal";

let container: AstroContainer;
const documentIds = [
  "privacy",
  "terms",
  "contact",
] as const satisfies readonly LegalDocumentId[];

beforeAll(async () => {
  container = await AstroContainer.create();
});

afterEach(() => {
  for (const locale of LOCALES) {
    Object.assign(getDictionary(locale).legal.pages, {
      privacy: null,
      terms: null,
      contact: null,
    });
  }
});

describe.each(LOCALES)("legal page foundation (%s)", (locale) => {
  it.each(["", "not-a-date", "2000-02-30", "2000-13-01"])(
    "refuses an invalid effective date: %s",
    async (effectiveDate) => {
      const copy = legalFixtures[locale].privacy;
      if (copy === null) throw new Error("Missing privacy test fixture");
      getDictionary(locale).legal.pages.privacy = { ...copy, effectiveDate };
      await expect(
        container.renderToString(LegalPage, {
          props: { locale, document: "privacy" },
        }),
      ).rejects.toThrow(/Invalid legal effective date/);
    },
  );

  it.each(documentIds)(
    "refuses %s without approved dictionary content",
    async (document) => {
      await expect(
        container.renderToString(LegalPage, { props: { locale, document } }),
      ).rejects.toThrow(/No approved legal content/);
    },
  );

  it.each(documentIds)(
    "renders %s from typed dictionary content through BaseLayout",
    async (document) => {
      const t = getDictionary(locale);
      Object.assign(t.legal.pages, legalFixtures[locale]);
      const copy = t.legal.pages[document];
      const doc = parse(
        await container.renderToString(LegalPage, {
          props: { locale, document },
        }),
      );
      const path = `/${document}/`;
      const url = locale === "ru" ? `/ru/${document}/` : path;
      expect(doc.querySelector("html")?.getAttribute("lang")).toBe(locale);
      expect(doc.querySelector("title")?.text).toBe(copy?.meta.title);
      expect(
        doc.querySelector('meta[name="description"]')?.getAttribute("content"),
      ).toBe(copy?.meta.description);
      expect(doc.querySelectorAll("h1")).toHaveLength(1);
      expect(doc.querySelector("h1")?.text).toBe(copy?.heading);
      expect(
        doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ).toBe(`https://mythweld.com${url}`);
      expect(
        doc.querySelector('link[hreflang="en"]')?.getAttribute("href"),
      ).toBe(`https://mythweld.com${path}`);
      expect(
        doc.querySelector('link[hreflang="ru"]')?.getAttribute("href"),
      ).toBe(`https://mythweld.com/ru${path}`);
      expect(
        doc.querySelector('link[hreflang="x-default"]')?.getAttribute("href"),
      ).toBe(`https://mythweld.com${path}`);
      expect(
        doc.querySelector('a[data-locale="ru"]')?.getAttribute("href"),
      ).toBe(`/ru${path}`);
      expect(
        doc.querySelector('a[data-locale="en"]')?.getAttribute("href"),
      ).toBe(path);
      expect(doc.querySelector("a.skip-link")?.getAttribute("href")).toBe(
        "#main",
      );

      const article = doc.querySelector("main article");
      expect(article).not.toBeNull();
      expect(article?.querySelectorAll("h2").map((h) => h.text)).toEqual(
        copy?.sections.map((s) => s.heading),
      );
      expect(article?.querySelectorAll("h3, h4")).toHaveLength(0);
      const toc = article?.querySelector(
        `nav[aria-label='${t.legal.ui.contents}']`,
      );
      const anchors = toc?.querySelectorAll("a") ?? [];
      expect(anchors).toHaveLength(2);
      for (const a of anchors) {
        const target = article?.querySelector(a.getAttribute("href") ?? "");
        expect(target?.tagName).toBe("H2");
        expect(target?.text).toBe(a.text);
      }
      expect(article?.querySelectorAll("section > ul > li")).toHaveLength(2);
      expect(article?.querySelectorAll("section > ol > li")).toHaveLength(2);
      expect(article?.querySelector("b")).toBeNull();
      expect(article?.text).toContain("<b>Test & escape</b>");
      expect(article?.querySelector(`a[href='${testUrl}']`)?.text).toBe(
        testUrl,
      );
      const internalHref =
        locale === "ru"
          ? "/ru/terms/#legal-section-1"
          : "/terms/#legal-section-1";
      expect(
        article?.querySelector(`a[href='${internalHref}']`),
      ).not.toBeNull();
      expect(doc.querySelectorAll("astro-island, form, iframe")).toHaveLength(
        0,
      );

      if (document === "contact") {
        expect(article?.querySelector("time")).toBeNull();
        expect(
          article?.querySelector(`address a[href='mailto:${testEmail}']`)?.text,
        ).toBe(testEmail);
      } else {
        const time = article?.querySelector("time");
        expect(time?.getAttribute("datetime")).toBe("2000-01-02");
        expect(time?.text).toBe(
          locale === "ru" ? "2 января 2000 г." : "2 January 2000",
        );
        expect(article?.text).toContain(t.legal.ui.effectiveDate);
        expect(article?.querySelector("address")).toBeNull();
      }
    },
  );
});
