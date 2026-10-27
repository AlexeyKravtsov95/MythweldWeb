import type { ImageMetadata } from "astro";
import type { MediaAsset } from "./catalog";

// Eager glob keeps the committed originals as the only image sources;
// astro:assets derives optimised sizes from them at build time. Every
// globbed file is emitted to `dist/`, even when no page uses it, so the
// Russian sample book stays out: it names an archived character (blocker
// B4) and must not be published, not even as an unlinked file.
const files = import.meta.glob<ImageMetadata>(
  ["../assets/media/**/*.png", "!../assets/media/book-creator/samples/ru/**"],
  { eager: true, import: "default" },
);

/**
 * Image metadata of a catalogued file, for `astro:assets` components.
 * Throws for a file kept out of the build, so no page can show it.
 */
export function imageFor(asset: MediaAsset): ImageMetadata {
  const image = files[`../${asset.file.replace(/^src\//, "")}`];
  if (!image) throw new Error(`Missing media file: ${asset.file}`);
  return image;
}
