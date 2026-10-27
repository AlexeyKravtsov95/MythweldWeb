import type { Dictionary } from "../types";

export const en = {
  meta: {
    htmlLang: "en",
    ogLocale: "en_US",
    dateLocale: "en-GB",
    siteName: "Mythweld",
    homeTitle: "Mythweld — independent tools for World of Warcraft: Forever",
    homeDescription:
      "Independent tools for World of Warcraft: Forever. TalentForge plans talent builds on your phone; the Forever Journey addon keeps an in-game journal that Book Creator turns into a printable book.",
  },
  a11y: {
    skipToContent: "Skip to content",
    primaryNav: "Primary",
    languageSwitcher: "Language",
    homeLink: "Mythweld home",
    menu: "Menu",
    footerNav: "Footer",
    opensInNewTab: "opens in a new tab",
  },
  languageNames: {
    en: "English",
    ru: "Русский",
  },
  home: {
    eyebrow: "Tools for World of Warcraft: Forever",
    heading: "Plan the build. Keep the story.",
    lead: "A talent planner for your phone and an in-game journal that becomes a printable book.",
    productsHeading: "Products",
    products: {
      talentforge: {
        name: "TalentForge",
        kind: "Mobile app",
        summary:
          "Plan talent builds for all nine classes in the real specialization trees, then pick them up later.",
      },
      foreverJourney: {
        name: "Forever Journey",
        kind: "WoW addon",
        summary:
          "Records level-ups, zones, deaths, boss kills and your own notes while you play.",
      },
      bookCreator: {
        name: "Book Creator",
        kind: "Web tool",
        summary:
          "Turns the journal into a printable PDF, right in your browser.",
      },
    },
    talentforgeFeatures: {
      autosave: "Saves as you edit",
      offline: "Works offline",
      languages: "English and Russian",
    },
    exploreTalentforge: "Explore TalentForge",
    pagePending: "page in preparation",
    curseforgeStates: {
      available: "Available on CurseForge",
      testing: "Testing on CurseForge",
      prep: "Coming to CurseForge",
    },
    addonPlaceholderNote: "Not drawn or mocked up.",
    downloadAddon: "Download Addon",
    bookCreatorLinkLabel: "Create Adventure Book",
    bookSample: {
      coverAlt:
        "Sample book cover: My Journey, Aelirien, Night Elf Druid, level 80",
      chapterAlt:
        "Sample book page: Chapter I, June 2026, with journal entries",
      caption: "Sample book · demo character",
    },
    flow: {
      heading: "Plan → Play → Remember",
      steps: {
        plan: { title: "Plan", text: "TalentForge, before you log in." },
        play: { title: "Play", text: "Forever Journey, while you level." },
        remember: {
          title: "Remember",
          text: "Book Creator, when the chapter ends.",
        },
      },
    },
  },
  footer: {
    disclaimer:
      "Mythweld is an independent fan project. It is not affiliated with or endorsed by Blizzard Entertainment. World of Warcraft and related names and images are trademarks of Blizzard Entertainment, Inc.",
    products: "Products",
    getTools: "Get the tools",
    site: "Site",
    pages: {
      privacy: "Privacy",
      terms: "Terms",
      contact: "Contact",
    },
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
