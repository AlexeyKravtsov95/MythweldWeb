import type { ImageMetadata } from "astro";
import type { MediaAsset } from "./catalog";

// Eager glob keeps the committed originals as the only image sources;
// astro:assets derives optimised sizes from them at build time.
const files = import.meta.glob<ImageMetadata>("../assets/media/**/*.png", {
  eager: true,
  import: "default",
});

/** Image metadata of a catalogued file, for `astro:assets` components. */
export function imageFor(asset: MediaAsset): ImageMetadata {
  const image = files[`../${asset.file.replace(/^src\//, "")}`];
  if (!image) throw new Error(`Missing media file: ${asset.file}`);
  return image;
}
