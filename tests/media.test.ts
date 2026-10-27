/**
 * Curated media: every committed file is catalogued, unchanged (SHA-256),
 * documented in docs/assets-manifest.md and described in both languages.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary } from "../src/i18n";
import {
  ADDON_SCREENSHOTS,
  ADDON_SHOT_IDS,
  CLASS_ARTWORK,
  CLASS_IDS,
  MEDIA,
  MEDIA_GAPS,
  allMedia,
  pickMedia,
  type MediaAsset,
  type MediaGroup,
  type RepoSource,
} from "../src/media/catalog";

const root = new URL("../", import.meta.url);
const mediaDir = "src/assets/media/";
const manifest = readFileSync(new URL("docs/assets-manifest.md", root), "utf8");
const groups = Object.keys(MEDIA) as MediaGroup[];

function read(file: string): Buffer {
  return readFileSync(new URL(file, root));
}

/** The repository source of a file copied from a product repository. */
function repoSource(asset: MediaAsset): RepoSource {
  if (!("repo" in asset.source)) {
    throw new Error(`${asset.file} has no repository source`);
  }
  return asset.source;
}

const repoMedia = allMedia().filter((asset) => "repo" in asset.source);
const publishedMedia = allMedia().filter((asset) => "url" in asset.source);

/** Width and height from the PNG IHDR chunk. */
function pngSize(data: Buffer): [number, number] {
  expect(data.subarray(1, 4).toString("latin1")).toBe("PNG");
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

describe("media files", () => {
  const committed = readdirSync(new URL(mediaDir, root), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((file) => statSync(new URL(mediaDir + file, root)).isFile())
    .map((file) => mediaDir + file)
    .sort();

  it("are exactly the catalogued files", () => {
    expect(committed).toEqual(
      allMedia()
        .map((asset) => asset.file)
        .sort(),
    );
  });

  it.each(allMedia().map((asset) => [asset.file, asset] as const))(
    "%s is unchanged and has the catalogued size",
    (file, asset) => {
      const data = read(file);
      expect(createHash("sha256").update(data).digest("hex")).toBe(
        asset.sha256,
      );
      expect(pngSize(data)).toEqual([asset.width, asset.height]);
    },
  );

  it("stay small: no bulk media in the repository", () => {
    const bytes = committed.reduce((sum, file) => sum + read(file).length, 0);
    // 6.8 MB of app media plus 1.2 MB of the two addon captures (WEB-M0.5),
    // kept byte for byte: re-encoding them would break the SHA-256 check.
    expect(bytes).toBeLessThan(9 * 1024 * 1024);
  });
});

describe("media catalog", () => {
  it("has the nine TalentForge class artworks, from the app resources", () => {
    expect(Object.keys(CLASS_ARTWORK)).toEqual([...CLASS_IDS]);
    for (const id of CLASS_IDS) {
      const asset = CLASS_ARTWORK[id];
      expect(asset.kind).toBe("class-artwork");
      expect(asset.locale).toBeNull();
      expect(repoSource(asset).path).toBe(
        `mobile/composeApp/src/commonMain/composeResources/drawable/class_${id}.png`,
      );
    }
  });

  it("never imports game talent icons as separate files", () => {
    for (const asset of allMedia()) {
      expect(asset.file).not.toMatch(/talent[-_]?icon|spell|ability/i);
      if (asset.containsGameTalentIcons) {
        expect(asset.kind).toBe("app-screenshot");
      }
    }
  });

  it("labels platforms by where the capture came from", () => {
    for (const asset of allMedia()) {
      if (asset.platform === "ios") {
        expect(repoSource(asset).path).toMatch(/apple-appstore\/.*\/iphone-/);
      }
      if (asset.kind === "book-creator-sample") {
        expect(asset.platform).toBe("pdf");
        expect(repoSource(asset).path).toMatch(/\.pdf$/);
        expect(repoSource(asset).page).toBeGreaterThan(0);
      }
      expect(asset.platform === "game").toBe(asset.kind === "addon-screenshot");
    }
  });

  it.each(groups)("%s has a file per locale or a documented gap", (group) => {
    const gaps = MEDIA_GAPS[group] ?? [];
    for (const locale of LOCALES) {
      const asset = pickMedia(group, locale);
      if (gaps.includes(locale)) {
        expect(asset).toBeUndefined();
      } else {
        expect(asset?.locale).toBe(locale);
        expect(asset?.file).toContain(`/${locale}/`);
      }
    }
  });

  it("pins every repository source to a full commit SHA", () => {
    for (const asset of repoMedia) {
      expect(repoSource(asset).commit).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("copies published originals only from the addon's CurseForge gallery", () => {
    expect(publishedMedia.map((asset) => asset.file).sort()).toEqual(
      Object.values(ADDON_SCREENSHOTS)
        .map((asset) => asset.file)
        .sort(),
    );
    for (const asset of publishedMedia) {
      const { source } = asset;
      if (!("url" in source)) throw new Error(asset.file);
      expect(source.url).toMatch(
        /^https:\/\/media\.forgecdn\.net\/attachments\//,
      );
      expect(source.gallery).toBe(
        "https://www.curseforge.com/wow/addons/forever-journey/gallery",
      );
      expect(source.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("marks the addon captures as in-game addon screenshots in English", () => {
    expect(Object.keys(ADDON_SCREENSHOTS)).toEqual([...ADDON_SHOT_IDS]);
    for (const asset of Object.values(ADDON_SCREENSHOTS)) {
      expect(asset.kind).toBe("addon-screenshot");
      expect(asset.product).toBe("forever-journey");
      expect(asset.locale).toBe("en");
      expect(asset.containsGameTalentIcons).toBe(false);
    }
  });
});

describe("assets manifest", () => {
  it.each(allMedia().map((asset) => [asset.file, asset] as const))(
    "documents %s with its source and checksum",
    (file, asset) => {
      expect(manifest).toContain(`\`${file}\``);
      expect(manifest).toContain(asset.sha256);
      if ("repo" in asset.source) {
        expect(manifest).toContain(asset.source.path);
        expect(manifest).toContain(asset.source.commit);
      } else {
        expect(manifest).toContain(asset.source.url);
        expect(manifest).toContain(asset.source.retrieved);
      }
    },
  );

  it("lists every known gap as a blocker", () => {
    expect(manifest).toMatch(/## Блокеры/);
    for (const group of Object.keys(MEDIA_GAPS)) {
      expect(manifest).toContain(`\`${group}\``);
    }
    expect(manifest).toMatch(/addon/i);
  });
});

describe.each(LOCALES)("media copy (%s)", (locale) => {
  const t = getDictionary(locale);

  it.each(groups)("%s has alt text and a caption", (group) => {
    const { alt, caption } = t.media.images[group];
    expect(alt.length).toBeGreaterThan(20);
    expect(caption).toMatch(/·/);
  });

  it("names the platform of app screenshots", () => {
    for (const group of ["tf-editor", "tf-class-picker", "tf-build-library"]) {
      const { caption } = t.media.images[group as MediaGroup];
      expect(caption).toContain("iPhone");
      expect(caption).not.toMatch(/android/i);
    }
  });

  it("captions the addon captures as in-game, never as Book Creator", () => {
    for (const id of ADDON_SHOT_IDS) {
      const { alt, caption } = t.media.addon[id];
      expect(alt.length).toBeGreaterThan(20);
      expect(caption).toMatch(/·/);
      expect(`${alt} ${caption}`).not.toMatch(/Book Creator/);
      // Character names stay out of the text (see blocker B4).
      expect(alt).not.toMatch(/Straider/);
    }
    if (locale === "ru") {
      for (const id of ADDON_SHOT_IDS) {
        expect(t.media.addon[id].caption).toMatch(/английский интерфейс/);
      }
    }
    expect(t.media.addonNote).toMatch(/CurseForge/);
  });

  it("names every class", () => {
    for (const id of CLASS_IDS) {
      expect(t.talentforge.classNames[id].trim()).not.toBe("");
    }
  });
});

it("Russian media copy is translated", () => {
  const en = getDictionary("en").media;
  const ru = getDictionary("ru").media;
  for (const group of groups) {
    expect(ru.images[group].alt).not.toBe(en.images[group].alt);
    expect(ru.images[group].alt).toMatch(/[а-яё]/i);
  }
});
