/**
 * Curated media: every committed file is catalogued, unchanged (SHA-256),
 * documented in docs/assets-manifest.md and described in both languages.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary } from "../src/i18n";
import {
  CLASS_ARTWORK,
  CLASS_IDS,
  MEDIA,
  MEDIA_GAPS,
  allMedia,
  pickMedia,
  type MediaGroup,
} from "../src/media/catalog";

const root = new URL("../", import.meta.url);
const mediaDir = "src/assets/media/";
const manifest = readFileSync(new URL("docs/assets-manifest.md", root), "utf8");
const groups = Object.keys(MEDIA) as MediaGroup[];

function read(file: string): Buffer {
  return readFileSync(new URL(file, root));
}

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
    expect(bytes).toBeLessThan(8 * 1024 * 1024);
  });
});

describe("media catalog", () => {
  it("has the nine TalentForge class artworks, from the app resources", () => {
    expect(Object.keys(CLASS_ARTWORK)).toEqual([...CLASS_IDS]);
    for (const id of CLASS_IDS) {
      const asset = CLASS_ARTWORK[id];
      expect(asset.kind).toBe("class-artwork");
      expect(asset.locale).toBeNull();
      expect(asset.source.path).toBe(
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
        expect(asset.source.path).toMatch(/apple-appstore\/.*\/iphone-/);
      }
      if (asset.kind === "book-creator-sample") {
        expect(asset.platform).toBe("pdf");
        expect(asset.source.path).toMatch(/\.pdf$/);
        expect(asset.source.page).toBeGreaterThan(0);
      }
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

  it("pins every source to a full commit SHA", () => {
    for (const asset of allMedia()) {
      expect(asset.source.commit).toMatch(/^[0-9a-f]{40}$/);
    }
  });
});

describe("assets manifest", () => {
  it.each(allMedia().map((asset) => [asset.file, asset] as const))(
    "documents %s with its source and checksum",
    (file, asset) => {
      expect(manifest).toContain(`\`${file}\``);
      expect(manifest).toContain(asset.sha256);
      expect(manifest).toContain(asset.source.path);
      expect(manifest).toContain(asset.source.commit);
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
