import type { Dictionary } from "../types";

export const en = {
  meta: {
    htmlLang: "en",
    ogLocale: "en_US",
    dateLocale: "en-GB",
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
      "Mythweld is an independent fan project. It is not affiliated with or endorsed by Blizzard Entertainment. World of Warcraft and related names and images are trademarks of Blizzard Entertainment, Inc.",
  },
  release: {
    heading: "Release status",
    updated: "Updated",
    states: {
      available: "Available",
      testing: "Closed testing",
      prep: "In preparation",
    },
    channels: {
      android: "Android",
      ios: "iOS",
      googlePlay: "Google Play",
      appStore: "App Store",
      talentData: "Talent data",
    },
  },
  actions: {
    linkPending: "link pending",
    inPreparation: "in preparation",
  },
  talentforge: {
    classNames: {
      warrior: "Warrior",
      paladin: "Paladin",
      hunter: "Hunter",
      rogue: "Rogue",
      priest: "Priest",
      shaman: "Shaman",
      mage: "Mage",
      warlock: "Warlock",
      druid: "Druid",
    },
    classArtworkCaption: "Nine classes · TalentForge class artwork",
  },
  media: {
    images: {
      "tf-editor": {
        alt: "TalentForge talent editor on iPhone: Paladin build, Holy tree, 33 of 51 points spent, game talent icons in the tree",
        caption: "Talent editor · app screenshot, iPhone",
      },
      "tf-class-picker": {
        alt: "TalentForge class picker on iPhone: nine classes shown with TalentForge class artwork, talent data 1.60.1",
        caption: "Class selection · app screenshot, iPhone",
      },
      "tf-build-library": {
        alt: "TalentForge home screen on iPhone: a Paladin build to continue editing and recent Priest, Druid and Mage builds",
        caption: "Saved builds · app screenshot, iPhone",
      },
      "bc-sample-cover": {
        alt: "Sample book cover: My Journey, Aelirien, Night Elf Druid, level 80",
        caption: "Sample book · demo character",
      },
      "bc-sample-chapter": {
        alt: "Sample book page: Chapter I, June 2026, with journal entries",
        caption: "Sample book page · demo character",
      },
      "bc-app-cover": {
        alt: "Book Creator in the browser with the Russian interface: cover of the book “Моё путешествие” for a demo character",
        caption: "Book Creator · web app screenshot, Russian interface",
      },
      "bc-app-chapter": {
        alt: "Book Creator in the browser with the Russian interface: chapter page for September 2026 with journal entries",
        caption: "Book Creator · web app screenshot, Russian interface",
      },
    },
    requiredBeforeRelease: "Required before release",
    placeholders: {
      addonScreenshot: {
        title: "In-game addon screenshot",
        note: "A real screenshot of the addon in World of Warcraft: Forever goes here. It is not drawn or mocked up.",
      },
      editorLandscape: {
        title: "Talent editor in landscape",
        note: "A verified landscape capture of the app goes here. Not mocked up.",
      },
      bookCreatorScreenshot: {
        title: "Book Creator screenshot in English",
        note: "Only a Russian-interface capture exists so far. Not mocked up.",
      },
    },
  },
} as const satisfies Dictionary;
