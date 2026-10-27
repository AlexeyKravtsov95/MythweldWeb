/**
 * Home page checks on the production build in `dist/` (run `npm run build`
 * first): sections, honest links and release states, images, the mobile
 * menu and the absence of trackers.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse, type HTMLElement } from "node-html-parser";
import { beforeAll, describe, expect, it } from "vitest";
import { RELEASE } from "../src/config/release";
import { SITE } from "../src/config/site";
import {
  LOCALES,
  getDictionary,
  localeRoot,
  localizePath,
  type Locale,
} from "../src/i18n";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

function load(locale: Locale): HTMLElement {
  return parse(
    readFileSync(`${dist}${localeRoot(locale).slice(1)}index.html`, "utf8"),
  );
}

const text = (el: HTMLElement | null | undefined) =>
  (el?.text ?? "").replace(/\s+/g, " ").trim();

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

describe.each(LOCALES)("home page for %s", (locale) => {
  const t = getDictionary(locale);
  const home = t.home;
  let doc: HTMLElement;
  let main: HTMLElement;

  beforeAll(() => {
    doc = load(locale);
    main = doc.querySelector("main") as HTMLElement;
  });

  it("is the v3.2 home page, not the placeholder", () => {
    expect(text(doc.querySelector("h1"))).toBe(home.heading);
    const description =
      doc.querySelector('meta[name="description"]')?.getAttribute("content") ??
      "";
    expect(description).toBe(t.meta.homeDescription);
    expect(description).not.toMatch(/under construction|в разработке/i);
    expect(doc.querySelector("main")?.text).not.toMatch(/placeholder|заглушк/i);
  });

  it("shows TalentForge and Forever Journey as the two product plates", () => {
    const plates = main.querySelectorAll("article.plate");
    expect(plates.map((p) => p.getAttribute("aria-labelledby"))).toEqual([
      "talentforge",
      "forever-journey",
    ]);
    expect(text(main.querySelector("h2#talentforge"))).toBe(
      home.products.talentforge.name,
    );
    expect(text(main.querySelector("h2#forever-journey"))).toBe(
      home.products.foreverJourney.name,
    );
  });

  it("presents Book Creator inside the Forever Journey plate", () => {
    const fj = main.querySelector("article[aria-labelledby='forever-journey']");
    expect(text(fj?.querySelector("h3#book-creator"))).toBe(
      home.products.bookCreator.name,
    );
    expect(text(fj)).toContain(home.bookSample.caption);
    const book = fj?.querySelector(`a[href="${SITE.links.bookCreator}"]`);
    expect(text(book)).toContain(home.bookCreatorLinkLabel);
  });

  it("lists Plan → Play → Remember as three ordered steps", () => {
    const flow = main.querySelector("section[aria-labelledby='flow-title']");
    expect(text(flow?.querySelector("h2"))).toBe(home.flow.heading);
    const steps = flow?.querySelectorAll("ol > li") ?? [];
    const { plan, play, remember } = home.flow.steps;
    expect(steps).toHaveLength(3);
    [plan, play, remember].forEach((step, i) => {
      expect(text(steps[i])).toContain(step.title);
      expect(text(steps[i])).toContain(step.text);
    });
  });

  it("keeps a heading order without skipped levels", () => {
    const levels = doc
      .querySelectorAll("h1, h2, h3, h4, h5, h6")
      .map((h) => Number(h.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((level, i) => {
      expect(level - (levels[i] ?? 1)).toBeLessThanOrEqual(1);
    });
  });

  it("points every anchor at an element of the home page", () => {
    const ids = new Set(doc.querySelectorAll("[id]").map((el) => el.id));
    const anchors = doc
      .querySelectorAll("a[href*='#']")
      .map((a) => a.getAttribute("href") ?? "");
    expect(anchors.length).toBeGreaterThan(0);
    for (const href of anchors) {
      const [path, id = ""] = href.split("#");
      expect([localeRoot(locale), ""]).toContain(path);
      expect(ids.has(id), href).toBe(true);
    }
  });

  it("links only to existing resources", () => {
    for (const a of doc.querySelectorAll("a")) {
      const href = a.getAttribute("href") ?? "";
      expect(href, text(a)).not.toMatch(/^(#?|javascript:.*)$/);
      if (/^https?:/.test(href)) expect(allowedExternal).toContain(href);
    }
    expect(
      doc.querySelector(`a[href="${SITE.links.curseforge}"]`),
    ).not.toBeNull();
  });

  it("reads release states from the config, not from store links", () => {
    const tf = RELEASE.talentforge;
    const tfPlate = text(
      main.querySelector("article[aria-labelledby='talentforge']"),
    );
    const lower = (s: string) => s.toLocaleLowerCase(t.meta.htmlLang);
    expect(tfPlate).toContain(
      `${t.release.channels.android}: ${lower(t.release.states[tf.android])}`,
    );
    expect(tfPlate).toContain(
      `${t.release.channels.ios}: ${lower(t.release.states[tf.ios])}`,
    );
    expect(text(main)).toContain(
      home.curseforgeStates[RELEASE.foreverJourney.curseforge],
    );
  });

  it("links both plates to the product pages of the same locale", () => {
    const tf = main.querySelector("article[aria-labelledby='talentforge']");
    const explore = tf?.querySelector(
      `a[href="${localizePath(locale, "/talentforge/")}"]`,
    );
    expect(text(explore)).toContain(home.exploreTalentforge);
    expect(tf?.querySelector("[aria-disabled='true']")).toBeNull();

    const fj = main.querySelector("article[aria-labelledby='forever-journey']");
    const about = fj?.querySelector(
      `a[href="${localizePath(locale, "/forever-journey/")}"]`,
    );
    expect(text(about)).toContain(home.exploreForeverJourney);
    // The working CurseForge download stays next to the new link.
    expect(fj?.querySelector(`a[href="${SITE.links.curseforge}"]`)).not.toBe(
      null,
    );
  });

  it("shows a store without a listing by its release state, not as a link", () => {
    const footer = text(doc.querySelector("footer"));
    const pending = doc.querySelectorAll("footer .pending").map(text);
    const stores = [
      [
        t.release.channels.googlePlay,
        RELEASE.talentforge.googlePlay,
        RELEASE.talentforge.android,
      ],
      [
        t.release.channels.appStore,
        RELEASE.talentforge.appStore,
        RELEASE.talentforge.ios,
      ],
    ] as const;
    for (const [name, href, state] of stores) {
      expect(footer).toContain(name);
      const row = pending.find((p) => p.startsWith(name));
      expect(row !== undefined).toBe(href === null);
      if (href === null) {
        expect(row).toBe(`${name} ${t.release.states[state]}`);
      }
    }
    expect(footer).not.toContain(t.actions.linkPending);
  });

  it("shows the in-game addon Overview with an honest caption (B1)", () => {
    const plate = main.querySelector(
      "article[aria-labelledby='forever-journey']",
    );
    expect(plate?.querySelector("[role='img']")).toBeNull();
    expect(text(plate)).not.toContain(t.media.requiredBeforeRelease);
    const figure = plate?.querySelector("figure[data-kind='addon-screenshot']");
    expect(figure?.querySelector("img")?.getAttribute("alt")).toBe(
      t.media.addon.overview.alt,
    );
    const caption = text(figure?.querySelector("figcaption"));
    expect(caption).toContain(t.media.addon.overview.caption);
    expect(caption).toContain(t.media.addonNote);
  });

  it("describes every image and loads only the first screenshot eagerly", () => {
    const images = main.querySelectorAll("img");
    // Editor screenshot, nine class artworks, the addon Overview and two
    // sample book pages.
    expect(images).toHaveLength(13);
    for (const img of images) {
      expect(img.getAttribute("alt")?.trim()).toBeTruthy();
      expect(img.getAttribute("src")).toMatch(/^\/_astro\//);
    }
    const eager = images.filter(
      (img) => img.getAttribute("loading") !== "lazy",
    );
    expect(eager.map((img) => img.getAttribute("alt"))).toEqual([
      t.media.images["tf-editor"].alt,
    ]);
  });

  it("keeps the RU archive sample book off the page (blocker B4)", () => {
    expect(doc.toString()).not.toContain("Straider");
  });

  it("enhances an accessible mobile menu without hiding it from no-JS", () => {
    const button = doc.querySelector("header button[aria-controls]");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.hasAttribute("hidden")).toBe(true);
    expect(text(button)).toBe(t.a11y.menu);
    const menu = doc.querySelector(`#${button?.getAttribute("aria-controls")}`);
    expect(menu?.querySelector("nav[aria-label]")).not.toBeNull();
    expect(menu?.querySelectorAll("a[data-locale]")).toHaveLength(
      LOCALES.length,
    );
  });
});

describe("no trackers", () => {
  let files = "";

  beforeAll(() => {
    files = readdirSync(dist, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(html|js|css)$/.test(file))
      .map((file) => readFileSync(`${dist}${file}`, "utf8"))
      .join("\n");
  });

  it("ships no analytics, pixels or cookie code", () => {
    expect(files).not.toMatch(
      /googletagmanager|google-analytics|gtag\(|mc\.yandex|metrika|connect\.facebook|plausible|umami|hotjar|segment\.com|clarity\.ms/i,
    );
    expect(files).not.toMatch(/document\.cookie|localStorage|sessionStorage/);
  });
});
