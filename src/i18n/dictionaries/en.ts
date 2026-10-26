import type { Dictionary } from "../types";

export const en = {
  meta: {
    htmlLang: "en",
    ogLocale: "en_US",
    siteName: "Mythweld",
    homeTitle: "Mythweld — independent tools for World of Warcraft: Forever",
    homeDescription:
      "Mythweld is an independent collection of gaming tools: TalentForge, Forever Journey and Book Creator. The new website is under construction.",
  },
  a11y: {
    skipToContent: "Skip to content",
    primaryNav: "Primary",
    languageSwitcher: "Language",
    homeLink: "Mythweld home",
    opensInNewTab: "opens in a new tab",
  },
  languageNames: {
    en: "English",
    ru: "Русский",
  },
  home: {
    eyebrow: "Website in progress",
    heading: "Mythweld",
    lead: "An independent collection of gaming tools for World of Warcraft: Forever. This page is a temporary placeholder while the new website is being built.",
    productsHeading: "Products",
    products: {
      talentforge: {
        name: "TalentForge",
        kind: "Mobile app",
        summary: "Talent-build planner for World of Warcraft: Forever.",
      },
      foreverJourney: {
        name: "Forever Journey",
        kind: "Game addon",
        summary: "In-game character journal addon.",
      },
      bookCreator: {
        name: "Book Creator",
        kind: "Web tool",
        summary: "Browser-based generator of printable PDF books.",
      },
    },
    bookCreatorLinkLabel: "Open Book Creator",
    statusNote:
      "Product pages, screenshots and download links will appear here once they are ready.",
  },
  footer: {
    disclaimer:
      "Mythweld is an independent fan project, not affiliated with Blizzard Entertainment.",
  },
} as const satisfies Dictionary;
