/**
 * TalentForge, Forever Journey and Book Creator pages on the production build in `dist/`
 * (run `npm run build` first): routes, metadata, headings, localized media,
 * links, honest release states and the Book Creator flow.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse, type HTMLElement } from "node-html-parser";
import { beforeAll, describe, expect, it } from "vitest";
import { RELEASE } from "../src/config/release";
import { SITE } from "../src/config/site";
import { LOCALES, getDictionary, localizePath, type Locale } from "../src/i18n";
import { CLASS_IDS } from "../src/media/catalog";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const PRODUCTS = [
  "/talentforge/",
  "/forever-journey/",
  "/book-creator/",
] as const;
type ProductPath = (typeof PRODUCTS)[number];

function file(locale: Locale, path: ProductPath): string {
  return `${dist}${localizePath(locale, path).slice(1)}index.html`;
}

function load(locale: Locale, path: ProductPath): HTMLElement {
  return parse(readFileSync(file(locale, path), "utf8"));
}

const text = (el: HTMLElement | null | undefined) =>
  (el?.text ?? "").replace(/\s+/g, " ").trim();

const meta = (doc: HTMLElement, selector: string) =>
  doc.querySelector(selector)?.getAttribute("content") ?? "";

function pageCopy(locale: Locale, path: ProductPath) {
  const t = getDictionary(locale);
  if (path === "/book-creator/") {
    return {
      meta: t.bookCreatorPage.meta,
      lead: t.bookCreatorPage.lead,
      name: t.home.products.bookCreator.name,
      next: t.bookCreatorPage.next,
      other: "/forever-journey/" as const,
    };
  }
  return path === "/talentforge/"
    ? {
        meta: t.talentforgePage.meta,
        lead: t.talentforgePage.lead,
        name: t.home.products.talentforge.name,
        next: t.talentforgePage.next,
        other: "/forever-journey/" as const,
      }
    : {
        meta: t.foreverJourneyPage.meta,
        lead: t.foreverJourneyPage.lead,
        name: t.home.products.foreverJourney.name,
        next: t.foreverJourneyPage.next,
        other: "/talentforge/" as const,
      };
}

const storeLinks: (string | null)[] = [
  RELEASE.talentforge.googlePlay,
  RELEASE.talentforge.appStore,
];
const allowedExternal = new Set<string>([
  ...Object.values(SITE.links),
  ...storeLinks.filter((href): href is string => href !== null),
]);

beforeAll(() => {
  if (!existsSync(dist)) {
    throw new Error("dist/ not found: run `npm run build` before `npm test`.");
  }
});

describe.each(
  LOCALES.flatMap((locale) => PRODUCTS.map((path) => [locale, path] as const)),
)("%s %s", (locale, path) => {
  const t = getDictionary(locale);
  const copy = pageCopy(locale, path);
  let doc: HTMLElement;
  let main: HTMLElement;

  beforeAll(() => {
    doc = load(locale, path);
    main = doc.querySelector("main") as HTMLElement;
  });

  it("is a static page at its localized route", () => {
    expect(existsSync(file(locale, path))).toBe(true);
  });

  it("sets lang, title, description and Open Graph from the dictionary", () => {
    expect(doc.querySelector("html")?.getAttribute("lang")).toBe(
      t.meta.htmlLang,
    );
    expect(doc.querySelector("title")?.text).toBe(copy.meta.title);
    expect(meta(doc, 'meta[name="description"]')).toBe(copy.meta.description);
    expect(meta(doc, 'meta[property="og:title"]')).toBe(copy.meta.title);
    expect(meta(doc, 'meta[property="og:description"]')).toBe(
      copy.meta.description,
    );
    expect(meta(doc, 'meta[property="og:locale"]')).toBe(t.meta.ogLocale);
  });

  it("declares canonical, og:url and hreflang alternates for the page", () => {
    const url = (l: Locale) => `https://mythweld.com${localizePath(l, path)}`;
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

  it("has one h1 with the product name and no skipped heading levels", () => {
    const h1 = doc.querySelectorAll("h1");
    expect(h1).toHaveLength(1);
    expect(text(h1[0])).toBe(copy.name);
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
      expect(text(main)).not.toContain(pageCopy(other, path).lead);
    }
  });

  it("keeps the product page when switching language", () => {
    const links = doc.querySelectorAll("a[data-locale]");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      LOCALES.map((l) => localizePath(l, path)),
    );
    const current = links.filter(
      (a) => a.getAttribute("aria-current") === "page",
    );
    expect(current.map((a) => a.getAttribute("data-locale"))).toEqual([locale]);
  });

  it("keeps the addon links and direct Book Creator launch in the header", () => {
    const nav = doc.querySelector("header nav[aria-label]");
    for (const product of PRODUCTS.filter((p) => p !== "/book-creator/")) {
      const link = nav?.querySelector(
        `a[href="${localizePath(locale, product)}"]`,
      );
      expect(link, product).not.toBeNull();
      expect(link?.getAttribute("aria-current")).toBe(
        product === path ? "page" : undefined,
      );
    }
    expect(nav?.querySelector(`a[href="${SITE.links.bookCreator}"]`)).not.toBe(
      null,
    );
  });

  it("links the footer products to the product pages", () => {
    const footer = doc.querySelector("footer");
    for (const product of PRODUCTS) {
      expect(
        footer?.querySelector(`a[href="${localizePath(locale, product)}"]`),
      ).not.toBeNull();
    }
  });

  it("ends with Plan → Play → Remember to the other product page", () => {
    const strip = main.querySelector("[data-next]");
    expect(strip?.getAttribute("aria-label")).toBe(t.product.flowLabel);
    expect(text(strip)).toContain(copy.next.text);
    const link = strip?.querySelector("a");
    expect(link?.getAttribute("href")).toBe(localizePath(locale, copy.other));
    expect(text(link)).toContain(copy.next.action);
  });

  it("links only to existing pages and approved external resources", () => {
    for (const a of doc.querySelectorAll("a")) {
      const href = a.getAttribute("href") ?? "";
      expect(href, text(a)).not.toMatch(/^(#?|javascript:.*)$/);
      if (/^https?:/.test(href)) {
        expect(allowedExternal).toContain(href);
        expect(a.getAttribute("target")).toBe("_blank");
        expect(a.getAttribute("rel")).toContain("noopener");
      } else if (href.startsWith("/")) {
        const target = href.split("#")[0] ?? "";
        expect(existsSync(`${dist}${target.slice(1)}index.html`), href).toBe(
          true,
        );
      }
    }
  });

  it("serves optimised images, each with an alt attribute", () => {
    const images = main.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      expect(img.hasAttribute("alt")).toBe(true);
      expect(img.getAttribute("src")).toMatch(/^\/_astro\//);
    }
    for (const picture of main.querySelectorAll("picture")) {
      const sources = picture.querySelectorAll("source");
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) {
        expect(source.getAttribute("srcset")).toBeTruthy();
        expect(source.getAttribute("sizes")).toBeTruthy();
      }
    }
  });

  it("contains no personal data, forms or file uploads", () => {
    const html = doc.toString();
    expect(html).not.toMatch(/Straider|ClassicBetaPvP/);
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(doc.querySelectorAll("form, input, iframe")).toHaveLength(0);
    for (const script of doc.querySelectorAll("script[src]")) {
      expect(script.getAttribute("src")).toMatch(/^\//);
    }
    expect(html).not.toMatch(/google-analytics|googletagmanager|fbq\(|ym\(/i);
  });
});

describe.each(LOCALES)("TalentForge page for %s", (locale) => {
  const t = getDictionary(locale);
  const copy = t.talentforgePage;
  const tf = RELEASE.talentforge;
  let main: HTMLElement;

  beforeAll(() => {
    main = load(locale, "/talentforge/").querySelector("main") as HTMLElement;
  });

  it("shows the real editor screenshot of the page language first", () => {
    const images = main.querySelectorAll("img");
    expect(images[0]?.getAttribute("alt")).toBe(
      t.media.images["tf-editor"].alt,
    );
    expect(images[0]?.getAttribute("loading")).toBe("eager");
    expect(text(main)).toContain(t.media.images["tf-editor"].caption);
    for (const other of LOCALES.filter((l) => l !== locale)) {
      const alts = images.map((img) => img.getAttribute("alt"));
      expect(alts).not.toContain(
        getDictionary(other).media.images["tf-editor"].alt,
      );
    }
  });

  it("uses the class picker and saved builds screenshots of its locale", () => {
    const alts = main.querySelectorAll("img").map((i) => i.getAttribute("alt"));
    expect(alts).toContain(t.media.images["tf-class-picker"].alt);
    expect(alts).toContain(t.media.images["tf-build-library"].alt);
  });

  it("crops the class picker on phones to its UI, with CSS only", () => {
    const picker = main.querySelector("[data-crop='class-picker']");
    const img = picker?.querySelector("img");
    expect(img?.getAttribute("alt")).toBe(
      t.media.images["tf-class-picker"].alt,
    );
    expect(img?.getAttribute("src")).toMatch(/^\/_astro\//);
    expect(picker?.querySelectorAll("source").length).toBeGreaterThan(0);
    expect(text(picker?.querySelector("figcaption"))).toBe(
      t.media.images["tf-class-picker"].caption,
    );
    const css = load(locale, "/talentforge/")
      .querySelectorAll('link[rel="stylesheet"]')
      .map((link) =>
        readFileSync(`${dist}${link.getAttribute("href")?.slice(1)}`, "utf8"),
      )
      .join("\n");
    const phone = [
      ...css.matchAll(/@media \((?:max-width:\s*|width<=)600px\)\{(.*?\})\}/gs),
    ]
      .map((block) => block[1])
      .join("\n");
    // The nine tiles end at row 1326 of the 1206 × 2622 capture.
    expect(phone).toMatch(
      /\.picker\[[^\]]+\] img\{aspect-ratio:1206\/1390;object-fit:cover;object-position:50% 0\}/,
    );
    expect(css).not.toMatch(/\.library\[[^\]]+\] img\{[^}]*aspect-ratio/);
  });

  it("reads release states from the config, never from store links", () => {
    const panel = main.querySelector(
      "section[aria-labelledby='release-status']",
    );
    const panelText = text(panel);
    expect(panelText).toContain(t.release.states[tf.android]);
    expect(panelText).toContain(t.release.states[tf.ios]);
    expect(panelText).toContain(`v${tf.dataVersion}`);
    const stores = [
      [t.release.channels.googlePlay, tf.googlePlay, tf.android],
      [t.release.channels.appStore, tf.appStore, tf.ios],
    ] as const;
    for (const [name, href, state] of stores) {
      const action = panel
        ?.querySelectorAll(".stores > *")
        .find((el) => text(el).startsWith(name));
      if (href === null) {
        expect(action?.tagName).toBe("SPAN");
        expect(action?.getAttribute("aria-disabled")).toBe("true");
        expect(text(action)).toContain(
          state === "prep" ? t.actions.inPreparation : t.actions.linkPending,
        );
      } else {
        expect(action?.getAttribute("href")).toBe(href);
      }
    }
  });

  it("says the talent data version is not the app version", () => {
    expect(text(main)).toContain(copy.dataVersionNote);
  });

  it("shows nine named class artworks, not game talent icons", () => {
    const tiles = main.querySelectorAll("li[data-class]");
    expect(tiles.map((li) => li.getAttribute("data-class"))).toEqual([
      ...CLASS_IDS,
    ]);
    for (const tile of tiles) {
      expect(tile.querySelector("img")?.getAttribute("alt")).toBe("");
    }
    expect(text(main)).toContain(copy.classes.artwork.text);
  });

  it("shows game talent icons only as a captioned crop of the editor", () => {
    const crop = main.querySelector("figure[data-crop='editor-icons']");
    expect(crop?.querySelector("img")?.getAttribute("alt")).toBe(
      copy.classes.iconsCropAlt,
    );
    expect(text(crop?.querySelector("figcaption"))).toBe(
      copy.classes.iconsCropCaption,
    );
    expect(copy.classes.iconsCropCaption).toMatch(/Fragment|Фрагмент/);
  });

  it("does not repeat unverified claims from the design PDF", () => {
    const body = text(main);
    // PDF p. 26: the app shows one tree at a time, with tabs.
    expect(body).not.toMatch(/on one screen|на одном экране/i);
    expect(body).toContain(copy.trees.points.landscape.text);
    // Remote data delivery is built but disabled in every app build.
    expect(body).not.toMatch(/over the air|по сети|OTA/i);
    expect(body).not.toMatch(/\bsync|синхрониз/i);
    // No landscape capture is published (blocker B2).
    const alts = main.querySelectorAll("img").map((i) => i.getAttribute("alt"));
    expect(alts.join(" ")).not.toMatch(/landscape|горизонтал/i);
  });

  it("marks the share feature as not shown in the screenshots", () => {
    const share = main
      .querySelectorAll("li.card")
      .find((li) => text(li).startsWith(copy.features.items.share.title));
    expect(text(share)).toContain(copy.features.notShown);
  });
});

describe.each(LOCALES)("Forever Journey page for %s", (locale) => {
  const t = getDictionary(locale);
  const copy = t.foreverJourneyPage;
  let main: HTMLElement;

  beforeAll(() => {
    main = load(locale, "/forever-journey/").querySelector(
      "main",
    ) as HTMLElement;
  });

  it("offers Download Addon and Create Adventure Book from the config", () => {
    const hero = main.querySelector("section[aria-labelledby='page-title']");
    const download = hero?.querySelector(`a[href="${SITE.links.curseforge}"]`);
    expect(text(download)).toContain(t.home.downloadAddon);
    const book = hero?.querySelector(`a[href="${SITE.links.bookCreator}"]`);
    expect(text(book)).toContain(t.home.bookCreatorLinkLabel);
  });

  it("states the CurseForge status from the release config", () => {
    const facts = main.querySelector("dl.facts");
    expect(facts?.getAttribute("aria-label")).toBe(copy.facts.label);
    expect(text(facts)).toContain(
      t.release.states[RELEASE.foreverJourney.curseforge],
    );
    expect(text(facts)).toContain(copy.facts.notNeeded);
  });

  it("shows the addon in game, captioned as gallery captures (B1)", () => {
    expect(main.querySelector("[role='img']")).toBeNull();
    expect(text(main)).not.toContain(t.media.requiredBeforeRelease);
    const shots = [
      [main.querySelector(".hero figure"), t.media.addon.overview],
      [main.querySelector(".records figure"), t.media.addon.chronicle],
    ] as const;
    for (const [figure, copy] of shots) {
      expect(figure?.getAttribute("data-kind")).toBe("addon-screenshot");
      expect(figure?.querySelector("img")?.getAttribute("alt")).toBe(copy.alt);
      const caption = text(figure?.querySelector("figcaption"));
      expect(caption).toContain(copy.caption);
      expect(caption).toContain(t.media.addonNote);
    }
    // The first screen loads its image eagerly; the Chronicle waits.
    const [hero, records] = shots.map(([figure]) =>
      figure?.querySelector("img")?.getAttribute("loading"),
    );
    expect(hero).not.toBe("lazy");
    expect(records).toBe("lazy");
  });

  it("lists what the addon records and the Install → Play → Book path", () => {
    const records = main.querySelector("section[aria-labelledby='records']");
    for (const item of Object.values(copy.records.items)) {
      expect(text(records)).toContain(item);
    }
    const steps = records?.querySelectorAll(".steps ol > li") ?? [];
    expect(steps).toHaveLength(3);
    const { install, play, book } = copy.steps.items;
    [install, play, book].forEach((step, i) => {
      expect(text(steps[i])).toContain(step.title);
    });
  });

  it("keeps a short connection to the Book Creator overview", () => {
    const section = main.querySelector(
      "section[aria-labelledby='book-creator']",
    );
    expect(text(section)).toContain(copy.book.text);
    const link = section?.querySelector("a");
    expect(link?.getAttribute("href")).toBe(
      localizePath(locale, "/book-creator/"),
    );
    expect(text(link)).toContain(copy.book.action);
    expect(section?.querySelectorAll("figure, ol")).toHaveLength(0);
  });

  it("never claims the addon sends data to Book Creator or a cloud", () => {
    expect(text(main)).not.toMatch(
      /automatically (sends|syncs|uploads)|cloud|облак|автоматически (отправ|синхрон)/i,
    );
  });
});

describe.each(LOCALES)("Book Creator page for %s", (locale) => {
  const t = getDictionary(locale);
  const copy = t.bookCreatorPage;
  const main = load(locale, "/book-creator/").querySelector("main");

  it("offers one primary direct launch of the real web tool", () => {
    const links = main?.querySelectorAll(`a[href="${SITE.links.bookCreator}"]`);
    expect(links).toHaveLength(1);
    expect(text(links?.[0])).toContain(copy.open);
    expect(text(main)).toContain(copy.kind);
    expect(text(main)).toContain(copy.local);
  });

  it("presents the registered English PDF pages with an honest caption (B4)", () => {
    const figure = main?.querySelector(
      "figure[data-kind='book-creator-sample']",
    );
    const images = figure?.querySelectorAll("img");
    expect(images?.map((image) => image.getAttribute("alt"))).toEqual([
      t.home.bookSample.coverAlt,
      t.home.bookSample.chapterAlt,
    ]);
    expect(text(figure?.querySelector("figcaption"))).toBe(copy.sampleCaption);
    // Match the actual built images against the already approved home sample.
    const home = parse(
      readFileSync(
        `${dist}${localizePath(locale, "/").slice(1)}index.html`,
        "utf8",
      ),
    );
    const approved = home.querySelectorAll("main section.book img");
    expect(images?.map((image) => image.getAttribute("src"))).toEqual(
      approved.map((image) => image.getAttribute("src")),
    );
    expect(copy.sampleCaption).toMatch(/PDF/);
    if (locale === "ru")
      expect(copy.sampleCaption).toContain(
        "демонстрационная книга на английском языке",
      );
  });

  it("explains three steps with both real import options and a historical archive", () => {
    const steps = main?.querySelectorAll(".steps ol > li");
    expect(steps).toHaveLength(3);
    Object.values(copy.steps.items).forEach((step, index) => {
      expect(text(steps?.[index])).toContain(step.title);
      expect(text(steps?.[index])).toContain(step.text);
    });
    const body = text(main);
    for (const marker of [
      "/fj open",
      "Export Book",
      "FJBOOK1:",
      "/reload",
      "ForeverJourney.lua",
      "SavedVariables",
    ]) {
      expect(body).toContain(marker);
    }
    expect(body).toContain(copy.archive);
    expect(body).not.toMatch(/TalentForge|sync|синхрон|cloud|облак/i);
  });
});

describe("site configuration for product pages", () => {
  it("keeps robots.txt closed until WEB-M0.5/0.6", () => {
    const robots = readFileSync(`${dist}robots.txt`, "utf8");
    expect(robots).toMatch(/^Disallow: \/$/m);
  });
});
