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
} as const;
