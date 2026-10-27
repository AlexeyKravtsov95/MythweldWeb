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
import { RELEASE } from "../src/config/release";
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
  it.each(["available", "testing", "prep"] as const)(
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
    const doc = await render(FigureWithCaption, {
      asset: MEDIA["bc-sample-cover"][locale],
      ...t.media.images["bc-sample-cover"],
    });
    expect(doc.querySelector("figure")?.getAttribute("data-frame")).toBe(
      "page",
    );
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
