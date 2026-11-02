import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { parse } from "node-html-parser";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import SiteFooter from "../src/components/SiteFooter.astro";
import { LEGAL } from "../src/config/legal";
import { LOCALES, getDictionary } from "../src/i18n";

let container: AstroContainer;
const originalLegal = { ...LEGAL };

beforeAll(async () => {
  container = await AstroContainer.create();
});

afterEach(() => {
  Object.assign(LEGAL, originalLegal);
});

describe.each(LOCALES)("future legal footer (%s)", (locale) => {
  const t = getDictionary(locale);

  it("localizes all three internal document paths", async () => {
    Object.assign(LEGAL, {
      privacy: "/privacy/",
      terms: "/terms/",
      contact: "/contact/",
    });
    const doc = parse(
      await container.renderToString(SiteFooter, { props: { locale } }),
    );
    for (const path of ["privacy", "terms", "contact"]) {
      const href = locale === "ru" ? `/ru/${path}/` : `/${path}/`;
      expect(doc.querySelector(`a[href='${href}']`), href).not.toBeNull();
    }
    expect(doc.text).not.toContain(t.footer.legalPending);
  });

  it("preserves external and email links and filters null individually", async () => {
    Object.assign(LEGAL, {
      privacy: "https://example.com/privacy/",
      terms: null,
      contact: "mailto:test@example.com",
    });
    const doc = parse(
      await container.renderToString(SiteFooter, { props: { locale } }),
    );
    const external = doc.querySelector(
      "a[href='https://example.com/privacy/']",
    );
    expect(external?.getAttribute("target")).toBe("_blank");
    expect(external?.getAttribute("rel")).toBe("noopener");
    expect(
      doc
        .querySelector("a[href='mailto:test@example.com']")
        ?.getAttribute("target"),
    ).toBeUndefined();
    expect(
      doc
        .querySelectorAll("a")
        .some((a) => a.text.includes(t.footer.pages.terms)),
    ).toBe(false);
    expect(doc.text).not.toContain(t.footer.legalPending);
  });

  it("keeps the current note and no legal links while all addresses are null", async () => {
    const doc = parse(
      await container.renderToString(SiteFooter, { props: { locale } }),
    );
    expect(doc.text).toContain(t.footer.legalPending);
    for (const label of Object.values(t.footer.pages)) {
      expect(
        doc.querySelectorAll("a").some((a) => a.text.includes(label)),
      ).toBe(false);
    }
  });
});
