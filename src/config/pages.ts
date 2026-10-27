/**
 * Locale-neutral paths of the public pages. Each exists in every locale
 * (`localizePath`), so these three paths are the six URLs of the site. The
 * sitemap and the release tests read this list; `/dev/` is never in it.
 */
export const PUBLIC_PATHS = [
  "/",
  "/talentforge/",
  "/forever-journey/",
] as const;

export type PublicPath = (typeof PUBLIC_PATHS)[number];
