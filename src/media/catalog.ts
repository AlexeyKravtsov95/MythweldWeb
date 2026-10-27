/**
 * Curated product media: the only images the site may show.
 *
 * Every entry is an original file from a product repository (or a page of an
 * original PDF rasterised without edits), pinned to a commit and a SHA-256 of
 * the file committed here. Human-readable provenance and usage rules live in
 * `docs/assets-manifest.md`; tests keep the two in sync with the files.
 */
import type { Locale } from "../i18n/locales";

/** What an image is. Kinds are never substituted for one another. */
export type MediaKind =
  /** Original TalentForge class illustrations (118×118 paintings). */
  | "class-artwork"
  /** Unedited capture of the TalentForge app. */
  | "app-screenshot"
  /** Page of a PDF produced by Book Creator, rendered without edits. */
  | "book-creator-sample"
  /** Unedited capture of the Book Creator web app. */
  | "book-creator-screenshot"
  /** Unedited capture of the Forever Journey addon in the game client. */
  | "addon-screenshot";

export type MediaPlatform = "ios" | "web" | "pdf" | "game";

/** Canonical class order, as in the TalentForge class picker. */
export const CLASS_IDS = [
  "warrior",
  "paladin",
  "hunter",
  "rogue",
  "priest",
  "shaman",
  "mage",
  "warlock",
  "druid",
] as const;

export type ClassId = (typeof CLASS_IDS)[number];

/** Forever Journey addon captures published in the CurseForge gallery. */
export const ADDON_SHOT_IDS = ["overview", "chronicle"] as const;

export type AddonShotId = (typeof ADDON_SHOT_IDS)[number];

/** Localised images: one file per locale, picked by the page language. */
export type MediaGroup =
  | "tf-editor"
  | "tf-class-picker"
  | "tf-build-library"
  | "bc-sample-cover"
  | "bc-sample-chapter"
  | "bc-app-cover"
  | "bc-app-chapter";

/** A file from a product repository, pinned to a commit. */
export interface RepoSource {
  repo: "AlexeyKravtsov95/TalentForge" | "AlexeyKravtsov95/ForeverJourneyWeb";
  /** Commit of `main` the file was taken from. */
  commit: string;
  /** Path inside `repo`. */
  path: string;
  /** 1-based PDF page, for rasterised book pages. */
  page?: number;
}

/** A file the owner already published, copied byte for byte. */
export interface PublishedSource {
  /** Direct URL of the original file. */
  url: string;
  /** Public page that shows the file. */
  gallery: string;
  /** ISO date the file was downloaded and compared with the gallery. */
  retrieved: string;
}

export type MediaSource = RepoSource | PublishedSource;

export interface MediaAsset {
  kind: MediaKind;
  product: "talentforge" | "book-creator" | "forever-journey";
  /** `null` for language-neutral artwork. */
  locale: Locale | null;
  platform: MediaPlatform | null;
  /** Path of the committed file, relative to the repository root. */
  file: string;
  width: number;
  height: number;
  /** SHA-256 of the committed file. */
  sha256: string;
  source: MediaSource;
  /** Game talent icons appear only inside screenshots, never on their own. */
  containsGameTalentIcons: boolean;
}

const TF_COMMIT = "69e2dde5560eb12fd24066c5ed5f7ad29d4756a3";
const FJW_COMMIT = "ceea82d456d7f04aeee4164b3ef088947e743349";
const TF_SHOTS = "docs/release/apple-appstore/submission/screenshots";

const CLASS_SHA256: Record<ClassId, string> = {
  warrior: "75a41eb26a2e3b9db070457efdf2c3d5daafb22c6bb09829236aa7a211a11ed9",
  paladin: "1b3201445756fd0c4c062cddac6ceaac2379a6a3db6df6fecc9bf389af24a40d",
  hunter: "3e7d194506214f475044a04064aea6ff81b2fcab46f805689ae4c5306a917b29",
  rogue: "2bf7aa077b0f690b50cd3b7dda82f9d469c69c71c434f2aa1cf1dea89e1b0359",
  priest: "9a4413ada75bf849479a2e2b862bcd6e744547d3bc7123785154ec9751152f7d",
  shaman: "abcaff9a2c42ff3a5f3dfa0496fb9b81b9e92bdd540be7e636751b0d58a8e13a",
  mage: "fc06552b45c82f6798ba3031d9e4986520af41cb3f740b4d0ac42b2c3f5a1776",
  warlock: "af25921f16e4cb5a20296b08be509a2501c4649ce390fb67123bbdcd5f911817",
  druid: "b0f32bee96acc570bcab5d4ce297f22276e1db1bd73b2cce9cdfb47478706815",
};

function classArtwork(id: ClassId): MediaAsset {
  return {
    kind: "class-artwork",
    product: "talentforge",
    locale: null,
    platform: null,
    file: `src/assets/media/talentforge/classes/class-${id}.png`,
    width: 118,
    height: 118,
    sha256: CLASS_SHA256[id],
    source: {
      repo: "AlexeyKravtsov95/TalentForge",
      commit: TF_COMMIT,
      path: `mobile/composeApp/src/commonMain/composeResources/drawable/class_${id}.png`,
    },
    containsGameTalentIcons: false,
  };
}

export const CLASS_ARTWORK: Record<ClassId, MediaAsset> = {
  warrior: classArtwork("warrior"),
  paladin: classArtwork("paladin"),
  hunter: classArtwork("hunter"),
  rogue: classArtwork("rogue"),
  priest: classArtwork("priest"),
  shaman: classArtwork("shaman"),
  mage: classArtwork("mage"),
  warlock: classArtwork("warlock"),
  druid: classArtwork("druid"),
};

function iphoneShot(
  locale: Locale,
  name: string,
  sha256: string,
  containsGameTalentIcons: boolean,
): MediaAsset {
  return {
    kind: "app-screenshot",
    product: "talentforge",
    locale,
    platform: "ios",
    file: `src/assets/media/talentforge/screenshots/${locale}/iphone-${name}.png`,
    width: 1206,
    height: 2622,
    sha256,
    source: {
      repo: "AlexeyKravtsov95/TalentForge",
      commit: TF_COMMIT,
      path: `${TF_SHOTS}/${locale === "en" ? "en-US" : "ru"}/iphone-6.3/${name}.png`,
    },
    containsGameTalentIcons,
  };
}

/**
 * EN: the built-in demo journal (invented demo character), as in the v3.2
 * design. RU: the localisation twin sample, the only Russian book PDF.
 */
const BOOK_PDF: Record<Locale, string> = {
  en: "docs/pdf-samples/client-demo-book.pdf",
  ru: "docs/pdf-samples/client-localization-ru.pdf",
};

function bookPage(
  locale: Locale,
  name: "cover" | "chapter",
  page: number,
  sha256: string,
): MediaAsset {
  return {
    kind: "book-creator-sample",
    product: "book-creator",
    locale,
    platform: "pdf",
    file: `src/assets/media/book-creator/samples/${locale}/${name}.png`,
    width: 892,
    height: 1262,
    sha256,
    source: {
      repo: "AlexeyKravtsov95/ForeverJourneyWeb",
      commit: FJW_COMMIT,
      path: BOOK_PDF[locale],
      page,
    },
    containsGameTalentIcons: false,
  };
}

function bookCreatorShot(
  name: "cover" | "chapter",
  sha256: string,
): MediaAsset {
  return {
    kind: "book-creator-screenshot",
    product: "book-creator",
    locale: "ru",
    platform: "web",
    file: `src/assets/media/book-creator/screenshots/ru/app-${name}.png`,
    width: 2560,
    height: 1249,
    sha256,
    source: {
      repo: "AlexeyKravtsov95/ForeverJourneyWeb",
      commit: FJW_COMMIT,
      path: `docs/screenshots/book-${name}.png`,
    },
    containsGameTalentIcons: false,
  };
}

export const MEDIA: Record<MediaGroup, Partial<Record<Locale, MediaAsset>>> = {
  "tf-editor": {
    en: iphoneShot(
      "en",
      "01-editor",
      "4568543aef66e3151cacf906c863f1d04a6412fcf47b7bbbce1fade787669b80",
      true,
    ),
    ru: iphoneShot(
      "ru",
      "01-editor",
      "de99192c7624611a60b4a598b14075a41837f62efc5bc44d909d02c3165d1905",
      true,
    ),
  },
  "tf-class-picker": {
    en: iphoneShot(
      "en",
      "03-class-picker",
      "2e83ca7d27f3a8c5bae436e8a838ce73de1ca4c3cd59fe6d569de5d9b0985133",
      false,
    ),
    ru: iphoneShot(
      "ru",
      "03-class-picker",
      "e362938d4c5468b2944ff7e9e92600a9bf066008d3ed908dab7e3aa821604c66",
      false,
    ),
  },
  "tf-build-library": {
    en: iphoneShot(
      "en",
      "04-build-library",
      "346300eb537b99a7263cedb00c470730b3872de4dd29ef966673c572d157ee27",
      false,
    ),
    ru: iphoneShot(
      "ru",
      "04-build-library",
      "3920d270ce90b7a02d50342c5e9892b1659b6782c58f10259998de53ce9b11a7",
      false,
    ),
  },
  "bc-sample-cover": {
    en: bookPage(
      "en",
      "cover",
      1,
      "e6ae96fb4d8036d4511d025f3151a50d993d4c5eb0c8a8b23942aa3e34ddf490",
    ),
    ru: bookPage(
      "ru",
      "cover",
      1,
      "59690be669f2d0cf6b5d78e28e10c75b01d9102b1a5bbd1fb67bd43aacf217ba",
    ),
  },
  "bc-sample-chapter": {
    en: bookPage(
      "en",
      "chapter",
      3,
      "d0d20c86c95a5cb6a2ebebe7c042ef91ee75944e5030d203b0cb9df2ef32a015",
    ),
    ru: bookPage(
      "ru",
      "chapter",
      3,
      "ad28bbb974c0628f9b6dff9870888257815b988405bb20c32862ac7a5f6d7d83",
    ),
  },
  // Only a Russian-interface capture exists; EN shows a placeholder.
  "bc-app-cover": {
    ru: bookCreatorShot(
      "cover",
      "1afa62dfe304731731ccf14a0c8dd14ace0846dc7814decb9827afe27bf1bbc7",
    ),
  },
  "bc-app-chapter": {
    ru: bookCreatorShot(
      "chapter",
      "86cb9c9b871e21dce8c0073c25ad4934cfe729115952aa4cdc396f280a99e5b3",
    ),
  },
};

const CURSEFORGE_GALLERY =
  "https://www.curseforge.com/wow/addons/forever-journey/gallery";

function addonShot(
  id: AddonShotId,
  url: string,
  width: number,
  height: number,
  sha256: string,
): MediaAsset {
  return {
    kind: "addon-screenshot",
    product: "forever-journey",
    locale: "en",
    platform: "game",
    file: `src/assets/media/forever-journey/addon/en/${id}.png`,
    width,
    height,
    sha256,
    source: { url, gallery: CURSEFORGE_GALLERY, retrieved: "2026-10-27" },
    containsGameTalentIcons: false,
  };
}

/**
 * In-game captures of the addon (blocker B1), reused with the owner's
 * permission. Only English-interface captures are published, so pages in
 * every locale show these and say so in the caption. They are gallery
 * images, not proof of the current addon version.
 */
export const ADDON_SCREENSHOTS: Record<AddonShotId, MediaAsset> = {
  overview: addonShot(
    "overview",
    "https://media.forgecdn.net/attachments/1990/233/overview-png.png",
    1073,
    730,
    "4f81a8f6a4d5a00dca72e0fc25a16f87cb564f524d20794680044cc342844ae2",
  ),
  chronicle: addonShot(
    "chronicle",
    "https://media.forgecdn.net/attachments/2037/694/timeline2-png.png",
    1074,
    729,
    "3a085be70d2c6717f0cceaaa4232adb7b0ac0a58973124e5cee3b65fdcc97334",
  ),
};

/**
 * Localised groups that are knowingly missing a locale. Each gap is an open
 * blocker in `docs/assets-manifest.md`; pages show a placeholder instead.
 */
export const MEDIA_GAPS: Partial<Record<MediaGroup, readonly Locale[]>> = {
  "bc-app-cover": ["en"],
  "bc-app-chapter": ["en"],
};

/** The image for the page language, or `undefined` when it does not exist. */
export function pickMedia(
  group: MediaGroup,
  locale: Locale,
): MediaAsset | undefined {
  return MEDIA[group][locale];
}

/** Every curated file, for checks and the manifest. */
export function allMedia(): MediaAsset[] {
  return [
    ...Object.values(CLASS_ARTWORK),
    ...Object.values(ADDON_SCREENSHOTS),
    ...Object.values(MEDIA).flatMap((byLocale) => Object.values(byLocale)),
  ];
}
