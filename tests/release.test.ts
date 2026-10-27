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
import { LOCALES, getDictionary, localizePath } from "../src/i18n";
import { MEDIA } from "../src/media/catalog";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

/** The six public pages: locale-neutral paths in every locale. */
const PATHS = ["/", "/talentforge/", "/forever-journey/"] as const;
const PAGES = LOCALES.flatMap((locale) =>
  PATHS.map((path) => ({ locale, url: localizePath(locale, path) })),
);

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

describe.each(PAGES)("public page $url", ({ locale, url }) => {
  const t = getDictionary(locale);
  let doc: HTMLElement;

  beforeAll(() => {
    doc = load(url);
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

  it("gives the journal steps the command from the addon's own page", () => {
    if (!url.endsWith("/forever-journey/")) return;
    expect(text(doc.querySelector("main"))).toContain("/fj open");
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
