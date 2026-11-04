/** Issue #34: real Privacy output, without exposing internal legal drafts. */
import { readFileSync } from "node:fs";
import { parse } from "node-html-parser";
import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary, localizePath } from "../src/i18n";

describe.each(LOCALES)("Privacy (%s)", (locale) => {
  const t = getDictionary(locale);
  const path = localizePath(locale, "/privacy/");
  const html = readFileSync(
    new URL(`../dist${path}index.html`, import.meta.url),
    "utf8",
  );
  const doc = parse(html);
  const article = doc.querySelector("main article");

  it("renders the complete localized policy and a working table of contents", () => {
    const copy = t.legal.pages.privacy;
    expect(copy).not.toBeNull();
    if (!copy) throw new Error("Privacy copy is required");
    expect(doc.querySelector("title")?.text).toBe(copy.meta.title);
    expect(doc.querySelector("h1")?.text).toBe(copy.heading);
    expect(article?.querySelectorAll("section h2").map((h) => h.text)).toEqual(
      copy.sections.map((s) => s.heading),
    );
    expect(copy.sections).toHaveLength(10);
    for (const section of copy.sections) {
      for (const block of section.blocks) {
        if (block.kind === "paragraph") {
          for (const inline of block.content) {
            expect(article?.text).toContain(
              typeof inline === "string" ? inline : inline.label,
            );
          }
        }
      }
    }
    const links = article?.querySelectorAll("nav a") ?? [];
    expect(links).toHaveLength(copy.sections.length);
    for (const link of links) {
      expect(doc.querySelector(link.getAttribute("href") ?? "")?.text).toBe(
        link.text,
      );
    }
  });

  it("renders the owner-approved effective date in the current locale", () => {
    const date = t.legal.pages.privacy?.effectiveDate;
    expect(date).toBe("2026-11-04");
    expect(article?.querySelectorAll(".date time")).toHaveLength(1);
    const time = article?.querySelector(".date time");
    expect(time?.getAttribute("datetime")).toBe(date);
    expect(time?.text).toBe(
      locale === "ru" ? "4 ноября 2026 г." : "4 November 2026",
    );
    expect(article?.querySelector(".date")?.text).toContain(
      t.legal.ui.effectiveDate,
    );
  });

  it("contains the confirmed operator and the limited technical scope", () => {
    const text = article?.text ?? "";
    for (const fact of [
      "Alexey Kravtsov",
      "Алексей Кравцов",
      "mythweld.com",
      "journal.mythweld.com",
      "VK Cloud Object Storage",
      "CDN",
      "Cloudflare",
      "DNS",
      "URL",
      "User-Agent",
      "TLS",
      "HTTPS",
      "HTTP",
      "152",
    ]) {
      expect(text).toContain(fact);
    }
    expect(text).toMatch(locale === "ru" ? /Роскомнадзор/ : /Roskomnadzor/);
    expect(text).toMatch(
      locale === "ru"
        ? /до восстановления почтового сервиса/
        : /mail service is being restored/,
    );
    expect(text).toMatch(
      locale === "ru"
        ? /сроки хранения.*неизвестны/
        : /retention periods.*not known/,
    );
  });

  it("has no private contact, home address, draft markers or substitute contact links", () => {
    expect(html).not.toMatch(/mailto:|tel:|[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    expect(article?.text).not.toMatch(
      /\bDRAFT\b|ЧЕРНОВИК|OWNER DECISION|РЕШЕНИЕ ВЛАДЕЛЬЦА|\bOD-\d+|\b(?:RKN|LEGAL)-01|TODO|TBD|placeholder|\[\[|Beget/i,
    );
    // Reject common address forms and postal details without storing private data in tests.
    expect(article?.text).not.toMatch(
      /\b\d{6}\b|\b\d+\s+[\w -]+\s+(?:street|road|avenue)\b|\b(?:ул\.|улица|проспект|переулок|квартира|кв\.)\s*\S+/i,
    );
    expect(article?.querySelectorAll("a:not([href^='#'])")).toHaveLength(0);
    expect(
      doc.querySelectorAll("form, iframe, astro-island, address"),
    ).toHaveLength(0);
    expect(doc.querySelectorAll("script[src^='http']")).toHaveLength(0);
  });

  it("links Privacy with the localized footer label, without Terms or Contact", () => {
    const footer = doc.querySelector("footer");
    expect(footer?.querySelector(`a[href='${path}']`)?.text).toBe(
      t.footer.pages.privacy,
    );
    for (const label of [t.footer.pages.terms, t.footer.pages.contact]) {
      expect(footer?.querySelectorAll("a").map((a) => a.text)).not.toContain(
        label,
      );
    }
    expect(footer?.text).not.toContain(t.footer.legalPending);
  });
});
