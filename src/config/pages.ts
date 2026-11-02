/**
 * Locale-neutral paths of the public pages. Each exists in every locale
 * (`localizePath`), so these four paths are the eight URLs of the site. The
 * sitemap and the release tests read this list; `/dev/` is never in it.
 */
export const PUBLIC_PATHS = [
  "/",
  "/talentforge/",
  "/forever-journey/",
  "/book-creator/",
] as const;

export type PublicPath = (typeof PUBLIC_PATHS)[number];
