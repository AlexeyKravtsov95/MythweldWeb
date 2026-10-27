/**
 * Facts shared by every locale. Only links to services that already exist
 * belong here; unreleased store links stay out until they are real.
 */
export const SITE = {
  url: "https://mythweld.com",
  links: {
    bookCreator: "https://journal.mythweld.com/",
    /** Forever Journey addon page, checked on 2026-10-27. */
    curseforge: "https://www.curseforge.com/wow/addons/forever-journey",
  },
  /**
   * Share cards (Open Graph, Twitter), one per locale: the logo mark and
   * wordmark on the page background, no product or game imagery. Files in
   * public/og/, provenance in docs/assets-manifest.md.
   */
  shareImage: {
    en: "/og/mythweld-en.png",
    ru: "/og/mythweld-ru.png",
    width: 1200,
    height: 630,
  },
} as const;
