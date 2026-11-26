/**
 * Renders the v3.2 UI components with the Astro Container API and checks
 * their accessible structure, honest disabled states and image rules.
 */
import { readFileSync, readdirSync } from "node:fs";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { parse, type HTMLElement } from "node-html-parser";
import { beforeAll, describe, expect, it } from "vitest";
import AssetPlaceholder from "../src/components/ui/AssetPlaceholder.astro";
import ClassArtworkGrid from "../src/components/ui/ClassArtworkGrid.astro";
import FigureWithCaption from "../src/components/ui/FigureWithCaption.astro";
import MediaGrid from "../src/components/ui/MediaGrid.astro";
import ProductAction from "../src/components/ui/ProductAction.astro";
import ProductPlate from "../src/components/ui/ProductPlate.astro";
import ReleaseStatus from "../src/components/ui/ReleaseStatus.astro";
import StatusTag from "../src/components/ui/StatusTag.astro";
import TalentForgePage from "../src/components/product/TalentForgePage.astro";
import { RELEASE, type Release } from "../src/config/release";
import { LOCALES, getDictionary } from "../src/i18n";
import { CLASS_IDS, MEDIA } from "../src/media/catalog";

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

async function render(
  component: Parameters<AstroContainer["renderToString"]>[0],
  props: Record<string, unknown>,
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  return parse(await container.renderToString(component, { props, slots }));
}

describe("ProductAction", () => {
  it("opens external links in a new tab with an announced ↗", async () => {
    const doc = await render(ProductAction, {
      variant: "forever-journey",
      label: "Open Book Creator",
      href: "https://journal.mythweld.com/",
      locale: "en",
    });
    const a = doc.querySelector("a");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toBe("noopener");
    expect(a?.querySelector(".visually-hidden")?.text).toBe(
      `(${getDictionary("en").a11y.opensInNewTab})`,
    );
    expect(a?.getAttribute("data-variant")).toBe("forever-journey");
  });

  it("keeps internal links in the same tab", async () => {
    const doc = await render(ProductAction, {
      variant: "secondary",
      label: "Forever Journey",
      href: "/forever-journey/",
      locale: "en",
      forward: true,
    });
    const a = doc.querySelector("a");
    expect(a?.getAttribute("target")).toBeUndefined();
    expect(a?.text).toContain("→");
  });

  it("adds noreferrer to an external link when asked", async () => {
    const doc = await render(ProductAction, {
      variant: "primary",
      label: "Join our Discord",
      href: "https://discord.gg/R96fQZHGRS",
      locale: "en",
      noreferrer: true,
    });
    expect(doc.querySelector("a")?.getAttribute("rel")).toBe(
      "noopener noreferrer",
    );
  });

  it("renders a missing link as a disabled span with its reason", async () => {
    const doc = await render(ProductAction, {
      variant: "talentforge",
      label: "Google Play",
      href: null,
      locale: "en",
      pendingReason: "link pending",
    });
    expect(doc.querySelector("a")).toBeNull();
    const span = doc.querySelector("[aria-disabled='true']");
    expect(span?.tagName).toBe("SPAN");
    expect(span?.querySelector("small")?.text).toBe("link pending");
  });

  it("refuses a missing link without a reason", async () => {
    await expect(
      render(ProductAction, {
        variant: "primary",
        label: "App Store",
        href: null,
        locale: "en",
      }),
    ).rejects.toThrow(/pendingReason/);
  });
});

describe("StatusTag", () => {
  it.each(["available", "testing", "prep", "awaiting_review"] as const)(
    "%s shows a dot next to the text",
    async (state) => {
      const doc = await render(StatusTag, { state, label: "Label" });
      const tag = doc.querySelector(".status-tag");
      expect(tag?.getAttribute("data-state")).toBe(state);
      expect(tag?.querySelector(".dot")?.getAttribute("aria-hidden")).toBe(
        "true",
      );
      expect(tag?.text.trim()).toBe("Label");
    },
  );

  it("pending is a text-only chip", async () => {
    const doc = await render(StatusTag, {
      state: "pending",
      label: "link pending",
    });
    expect(doc.querySelector(".dot")).toBeNull();
  });
});

describe.each(LOCALES)("ReleaseStatus (%s)", (locale) => {
  const t = getDictionary(locale);

  it("reads every value from the release config", async () => {
    const doc = await render(ReleaseStatus, { locale, id: "release" });
    const section = doc.querySelector("section");
    expect(section?.getAttribute("aria-labelledby")).toBe("release");
    expect(doc.querySelector("h2#release")?.text).toBe(t.release.heading);
    expect(doc.querySelector("time")?.getAttribute("datetime")).toBe(
      RELEASE.checked,
    );
    const text = section?.text ?? "";
    expect(text).toContain(t.release.states[RELEASE.talentforge.android]);
    expect(text).toContain(t.release.states[RELEASE.talentforge.ios]);
    expect(doc.querySelector(".version")?.text).toBe(
      `v${RELEASE.talentforge.dataVersion}`,
    );
  });

  it("shows one row per store, without separate platform rows", async () => {
    const doc = await render(ReleaseStatus, { locale, id: "release" });
    const rows = [...doc.querySelectorAll(".rows > div")].map(
      (div) => div.querySelector("dt")?.text,
    );
    expect(rows).toEqual([
      t.release.channels.googlePlay,
      t.release.channels.appStore,
      t.release.channels.talentData,
    ]);
  });

  it("shows store buttons as disabled until links exist", async () => {
    const doc = await render(ReleaseStatus, { locale, id: "release" });
    const stores = [
      RELEASE.talentforge.googlePlay,
      RELEASE.talentforge.appStore,
    ];
    const disabled = doc.querySelectorAll("[aria-disabled='true']");
    expect(disabled).toHaveLength(
      stores.filter((href) => href === null).length,
    );
    expect(doc.querySelectorAll("a")).toHaveLength(
      stores.filter((href) => href !== null).length,
    );
  });

  it("a store link on a closed test track is not shown as available", async () => {
    const doc = await render(ReleaseStatus, {
      locale,
      id: "release",
      talentforge: {
        ...RELEASE.talentforge,
        android: "testing",
        googlePlay: "https://play.google.com/store/apps/details?id=example",
      },
    });
    const row = doc
      .querySelectorAll(".rows > div")
      .find(
        (div) =>
          div.querySelector("dt")?.text === t.release.channels.googlePlay,
      );
    const tag = row?.querySelector(".status-tag");
    expect(tag?.getAttribute("data-state")).toBe("testing");
    expect(tag?.text.trim()).toBe(t.release.states.testing);
    expect(row?.text).not.toContain(t.release.states.available);
    expect(doc.querySelector("a")?.getAttribute("href")).toBe(
      "https://play.google.com/store/apps/details?id=example",
    );
  });

  it("a store row shows available only when the platform is released", async () => {
    const doc = await render(ReleaseStatus, {
      locale,
      id: "release",
      talentforge: {
        ...RELEASE.talentforge,
        ios: "available",
        appStore: "https://apps.apple.com/app/id0000000000",
      },
    });
    const row = doc
      .querySelectorAll(".rows > div")
      .find(
        (div) => div.querySelector("dt")?.text === t.release.channels.appStore,
      );
    expect(row?.querySelector(".status-tag")?.getAttribute("data-state")).toBe(
      "available",
    );
  });
});

describe.each(LOCALES)("TalentForgePage (%s)", (locale) => {
  const t = getDictionary(locale);
  const copy = t.talentforgePage;
  const text = (el: HTMLElement | null | undefined) =>
    (el?.textContent ?? "").replace(/\s+/g, " ").trim();

  /** The page with some release facts replaced. */
  const renderPage = (patch: Partial<Release["talentforge"]> = {}) =>
    render(TalentForgePage, {
      locale,
      talentforge: { ...RELEASE.talentforge, ...patch },
    });

  it("opens the store from the hero once the platform is publicly available", async () => {
    const doc = await renderPage({ android: "available" });
    const action = doc.querySelector(".install a");
    expect(action?.getAttribute("href")).toBe(RELEASE.talentforge.googlePlay);
    expect(action?.getAttribute("target")).toBe("_blank");
    expect(text(action)).toContain(copy.install.googlePlay);
  });

  it("keeps the hero action disabled on a closed test track, link or not", async () => {
    const doc = await renderPage({
      android: "testing",
      googlePlay: "https://play.google.com/store/apps/details?id=example",
    });
    expect(doc.querySelector(".install a")).toBeNull();
    const action = doc.querySelector(".install [aria-disabled='true']");
    expect(text(action)).toContain(copy.install.googlePlay);
    expect(text(action)).toContain(t.release.states.testing);
    expect(text(action)).not.toContain(t.actions.linkPending);
  });

  it("names the preparation state while the platform is not released", async () => {
    const doc = await renderPage({ android: "prep" });
    expect(doc.querySelector(".install a")).toBeNull();
    const action = doc.querySelector(".install [aria-disabled='true']");
    expect(text(action)).toContain(t.actions.inPreparation);
  });

  it("names the missing link once the platform is released", async () => {
    const doc = await renderPage({ android: "available", googlePlay: null });
    expect(doc.querySelector(".install a")).toBeNull();
    const action = doc.querySelector(".install [aria-disabled='true']");
    expect(text(action)).toContain(t.actions.linkPending);
  });

  it("keeps the 1.2 section and its captures off the page while the flag is off", async () => {
    const doc = await renderPage({
      upcoming: { buildMigration: { version: "1.2", released: false } },
    });
    expect(text(doc.querySelector("h1"))).toBe(
      t.home.products.talentforge.name,
    );
    expect(doc.querySelector("section[aria-labelledby='upcoming']")).toBeNull();
    const body = text(doc.querySelector("main"));
    expect(body).not.toContain(copy.upcoming.heading);
    expect(body).not.toContain(copy.upcoming.text);
    const alts = doc
      .querySelectorAll("img")
      .map((img) => img.getAttribute("alt"));
    expect(alts).not.toContain(t.media.images["tf-build-migration"].alt);
  });

  it("renders the 1.2 section with the capture of its locale once the flag is on", async () => {
    const doc = await renderPage({
      upcoming: { buildMigration: { version: "1.2", released: true } },
    });
    const section = doc.querySelector("section[aria-labelledby='upcoming']");
    expect(section).not.toBeNull();
    expect(text(section?.querySelector("h2"))).toBe(copy.upcoming.heading);
    expect(text(section)).toContain(copy.upcoming.label);
    expect(text(section)).toContain(copy.upcoming.text);
    const shot = t.media.images["tf-build-migration"];
    const img = section?.querySelector("img");
    expect(img?.getAttribute("alt")).toBe(shot.alt);
    expect(text(section?.querySelector("figcaption"))).toBe(shot.caption);
    for (const other of LOCALES.filter((l) => l !== locale)) {
      expect(img?.getAttribute("alt")).not.toBe(
        getDictionary(other).media.images["tf-build-migration"].alt,
      );
    }
    // A second-level heading between sections 03 and 04: no skipped level.
    const levels = doc
      .querySelectorAll("main h1, main h2, main h3")
      .map((h) => Number(h.tagName.slice(1)));
    levels.slice(1).forEach((level, i) => {
      expect(level - (levels[i] ?? 1)).toBeLessThanOrEqual(1);
    });
  });
});

describe("TalentForge 1.2 section copy", () => {
  it("announces the feature as released: the section only renders after the release", () => {
    const labels = LOCALES.map(
      (locale) => getDictionary(locale).talentforgePage.upcoming.label,
    );
    expect(getDictionary("en").talentforgePage.upcoming.label).toBe(
      "New in TalentForge 1.2",
    );
    for (const label of labels) {
      expect(label).toContain("1.2");
      expect(label).not.toMatch(/coming|скоро|ожидает/i);
    }
  });
});

describe("ProductPlate", () => {
  it("is an article labelled by its heading, with the product edge", async () => {
    const doc = await render(
      ProductPlate,
      {
        product: "talentforge",
        name: "TalentForge",
        kind: "Mobile app",
        id: "plate-tf",
        headingLevel: 3,
      },
      { default: "<p>Body</p>", actions: "<a href='/'>Go</a>" },
    );
    const article = doc.querySelector("article");
    expect(article?.getAttribute("data-product")).toBe("talentforge");
    expect(article?.getAttribute("aria-labelledby")).toBe("plate-tf");
    expect(doc.querySelector("h3#plate-tf")?.text.trim()).toBe("TalentForge");
    expect(doc.querySelector(".actions a")).not.toBeNull();
    expect(doc.querySelector(".status")).toBeNull();
  });
});

describe.each(LOCALES)("media components (%s)", (locale) => {
  const t = getDictionary(locale);

  it("FigureWithCaption keeps alt, caption and modern formats", async () => {
    const asset = MEDIA["tf-editor"][locale];
    const doc = await render(FigureWithCaption, {
      asset,
      ...t.media.images["tf-editor"],
    });
    const img = doc.querySelector("img");
    expect(img?.getAttribute("alt")).toBe(t.media.images["tf-editor"].alt);
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("width")).toBeTruthy();
    expect(doc.querySelector("figcaption")?.text).toBe(
      t.media.images["tf-editor"].caption,
    );
    const types = doc
      .querySelectorAll("source")
      .map((s) => s.getAttribute("type"));
    expect(types).toEqual(["image/avif", "image/webp"]);
    expect(doc.querySelector("figure")?.getAttribute("data-frame")).toBe(
      "screenshot",
    );
  });

  it("FigureWithCaption gives PDF pages no screenshot frame", async () => {
    // The English sample in every locale: the Russian one is kept out of
    // the build (blocker B4).
    const doc = await render(FigureWithCaption, {
      asset: MEDIA["bc-sample-cover"].en,
      ...t.media.images["bc-sample-cover"],
    });
    expect(doc.querySelector("figure")?.getAttribute("data-frame")).toBe(
      "page",
    );
  });

  it("refuses to render the Russian sample book (blocker B4)", async () => {
    await expect(
      render(FigureWithCaption, {
        asset: MEDIA["bc-sample-cover"].ru,
        ...t.media.images["bc-sample-cover"],
      }),
    ).rejects.toThrow(/Missing media file/);
  });

  it("FigureWithCaption adds an optional note line to the caption", async () => {
    const doc = await render(FigureWithCaption, {
      asset: MEDIA["tf-editor"][locale],
      ...t.media.images["tf-editor"],
      note: t.media.addonNote,
    });
    const caption = doc.querySelector("figcaption");
    expect(caption?.text).toContain(t.media.images["tf-editor"].caption);
    expect(caption?.querySelector(".note")?.text).toBe(t.media.addonNote);
  });

  it("FigureWithCaption refuses an empty alt", async () => {
    await expect(
      render(FigureWithCaption, {
        asset: MEDIA["tf-editor"][locale],
        alt: " ",
        caption: "Caption",
      }),
    ).rejects.toThrow(/alt and caption/);
  });

  it("ClassArtworkGrid shows the nine class artworks with names as alt", async () => {
    const doc = await render(ClassArtworkGrid, { locale });
    const imgs = doc.querySelectorAll("img");
    expect(imgs).toHaveLength(CLASS_IDS.length);
    expect(imgs.map((img) => img.getAttribute("alt"))).toEqual(
      CLASS_IDS.map((id) => t.talentforge.classNames[id].replace(/­/g, "")),
    );
    expect(doc.querySelector("figcaption")?.text).toBe(
      t.talentforge.classArtworkCaption,
    );
  });

  it("ClassArtworkGrid with visible names uses empty alt", async () => {
    const doc = await render(ClassArtworkGrid, { locale, showNames: true });
    for (const img of doc.querySelectorAll("img")) {
      expect(img.getAttribute("alt")).toBe("");
    }
    expect(doc.querySelectorAll(".name")).toHaveLength(CLASS_IDS.length);
  });

  it("AssetPlaceholder is one labelled image, not a fake screenshot", async () => {
    const copy = t.media.placeholders.addonScreenshot;
    const doc = await render(AssetPlaceholder, { locale, copy });
    const slot = doc.querySelector("[role='img']");
    expect(slot?.getAttribute("aria-label")).toContain(copy.title);
    expect(slot?.getAttribute("aria-label")).toContain(
      t.media.requiredBeforeRelease,
    );
    expect(doc.querySelectorAll("img, picture")).toHaveLength(0);
  });
});

describe("MediaGrid", () => {
  it("wraps its children in a responsive grid", async () => {
    const doc = await render(MediaGrid, { min: "phone" }, { default: "<i />" });
    expect(doc.querySelector(".media-grid")?.getAttribute("data-min")).toBe(
      "phone",
    );
  });
});

describe("component styles", () => {
  const dir = new URL("../src/components/", import.meta.url);
  const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter(
    (file) => file.endsWith(".astro"),
  );

  it.each(files)("%s uses tokens instead of raw hex colours", (file) => {
    const source = readFileSync(new URL(file, dir), "utf8");
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b(?![-\w])/i);
  });

  it.each(files)("%s removes the cut on focus when it uses one", (file) => {
    const source = readFileSync(new URL(file, dir), "utf8");
    if (/--cut-control/.test(source)) {
      expect(source).toMatch(/:focus-visible\s*{\s*clip-path:\s*none/);
    }
  });
});
