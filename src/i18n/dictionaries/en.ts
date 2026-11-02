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
    shareImageAlt:
      "Mythweld logo mark and name, tools for World of Warcraft: Forever: TalentForge, Forever Journey, Book Creator",
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
    exploreForeverJourney: "About Forever Journey",
    curseforgeStates: {
      available: "Available on CurseForge",
      testing: "Testing on CurseForge",
      prep: "Coming to CurseForge",
    },
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
    legalPending:
      "Privacy policy, terms and contact details are in preparation.",
  },
  release: {
    heading: "Release status",
    updated: "Updated",
    states: {
      available: "Available",
      testing: "Closed testing",
      prep: "In preparation",
      awaiting_review: "Awaiting Apple review",
    },
    channels: {
      android: "Android",
      ios: "iOS",
      googlePlay: "Google Play",
      appStore: "App Store",
      talentData: "Talent data",
    },
  },
  notFound: {
    title: "Page not found",
    description: "There is no page at this address on mythweld.com.",
    heading: "Page not found",
    lead: "There is no page at this address. It may have moved, or the link may contain a typo.",
    homeLink: "Go to the Mythweld home page",
  },
  actions: {
    linkPending: "link pending",
    inPreparation: "in preparation",
  },
  product: {
    flowLabel: "Plan → Play → Remember",
  },
  talentforgePage: {
    meta: {
      title: "TalentForge — talent build planner for WoW: Forever · Mythweld",
      description:
        "TalentForge is a mobile app for planning World of Warcraft: Forever talent builds for all nine classes in the real specialization trees. Builds stay on your phone and planning works offline.",
    },
    kind: "Mobile app · Android and iOS",
    lead: "Plan talent builds for all nine classes of World of Warcraft: Forever in the real specialization trees. Builds stay on your phone.",
    dataVersionNote:
      "Talent data is the version of the World of Warcraft: Forever talent data the app plans on, not the app version.",
    classes: {
      heading: "Nine classes",
      text: "Pick a class and start a build. Every class has its own artwork, drawn for TalentForge.",
      artwork: {
        title: "Class artwork",
        text: "Drawn for TalentForge. Used for class choice and saved builds. These are not game icons.",
      },
      icons: {
        title: "Talent icons",
        text: "From the game. They appear only inside the trees, as in this fragment of the editor.",
      },
      iconsCropAlt:
        "Fragment of the TalentForge talent editor: rows of game talent icons with their rank counters",
      iconsCropCaption:
        "Fragment of the talent editor · app screenshot, iPhone",
    },
    trees: {
      heading: "The real trees",
      text: "Every class has its three specialization trees, built from World of Warcraft: Forever client data.",
      points: {
        tabs: {
          title: "Three trees, one tap apart",
          text: "Switch between the specialization trees with the tabs above the tree. Each tab shows the points spent in it.",
        },
        rules: {
          title: "The game's rules",
          text: "Tier requirements and prerequisites are checked with every point you spend. Undo and redo are always there.",
        },
        details: {
          title: "Talent details",
          text: "Tap a talent to read its description for the current and the next rank.",
        },
        landscape: {
          title: "Turn the phone",
          text: "In landscape, talent details open in a side panel next to the tree.",
        },
      },
    },
    features: {
      heading: "What it does",
      items: {
        autosave: {
          title: "Saves as you edit",
          text: "Every change is kept at once. There is no Save button: close the app and the build is still there.",
        },
        offline: {
          title: "Works offline",
          text: "Trees, icons and builds live on the phone. Planning needs no connection.",
        },
        languages: {
          title: "English and Russian",
          text: "The app follows your phone's language. In Russian, talent names and most descriptions come from the game's own Russian text; the rest is shown in English.",
        },
        share: {
          title: "Import and share builds",
          text: "Send a build as a short text code through any messenger, or import a code you were given.",
        },
        dataVersions: {
          title: "Builds keep their data",
          text: "A saved build always opens on the talent data version it was made with.",
        },
      },
      notShown: "Not shown in the screenshots on this page.",
    },
    next: {
      text: "Then play it. Forever Journey records the run.",
      action: "Forever Journey",
    },
  },
  foreverJourneyPage: {
    meta: {
      title: "Forever Journey — journal addon for WoW: Forever · Mythweld",
      description:
        "Forever Journey is a World of Warcraft: Forever addon that keeps a journal of your character: level-ups, zones, deaths, boss kills and your notes. Book Creator turns it into a printable PDF in your browser.",
    },
    kind: "World of Warcraft addon",
    lead: "Keeps a journal of your character while you play: level-ups, zones, deaths, boss kills and your own notes. When a chapter ends, Book Creator turns it into a printable book.",
    facts: {
      label: "At a glance",
      bookCreator: "Book Creator",
      worksInBrowser: "Works in the browser",
      account: "Account",
      notNeeded: "Not needed",
    },
    records: {
      heading: "What the addon records",
      text: "It writes as you play. You add notes when you want to.",
      items: {
        levelUps: "Level-ups",
        zones: "Zones",
        deaths: "Deaths",
        bossKills: "Boss kills",
        notes: "Your notes",
      },
    },
    steps: {
      heading: "Install → Play → Make the book",
      items: {
        install: {
          title: "Install",
          text: "Download the addon from CurseForge.",
        },
        play: {
          title: "Play",
          text: "The journal fills in on its own.",
        },
        book: {
          title: "Make the book",
          text: "Export the journal from the addon, open Book Creator and download a PDF.",
        },
      },
    },
    book: {
      label: "Book Creator",
      heading: "From journal to book.",
      text: "Book Creator lays out the journal as chapters and pages and saves a PDF you can print.",
      action: "Explore Book Creator",
    },
    next: {
      text: "Plan the build before you log in.",
      action: "TalentForge",
    },
  },
  bookCreatorPage: {
    meta: {
      title: "Book Creator — turn your journal into a PDF · Mythweld",
      description:
        "Turn your Forever Journey journal into a printable PDF with Book Creator. Import an export code or SavedVariables file and make your book in the browser.",
    },
    kind: "Web tool for Forever Journey",
    lead: "Turn your character’s journal into a book. Book Creator lays out your Forever Journey entries as chapters and pages, ready to save as a printable PDF.",
    open: "Open Book Creator",
    local:
      "No account needed. The journal is read and the PDF is made locally in your browser.",
    sampleCaption:
      "Cover and chapter from a PDF made by Book Creator · English demo book, synthetic character. These are PDF pages, not screenshots of the tool.",
    steps: {
      heading: "From journal to PDF",
      items: {
        journal: {
          title: "Keep a journal",
          text: "Play with the Forever Journey addon. It records your adventures; you can add your own notes.",
        },
        import: {
          title: "Bring it to Book Creator",
          text: "Open the journal with /fj open and use Export Book. Paste all FJBOOK1: blocks into Book Creator. Or type /reload in game, then choose the ForeverJourney.lua file from SavedVariables and select your character.",
        },
        pdf: {
          title: "Save your book",
          text: "Download the PDF to keep or print. You can also try the demo journal before importing your own.",
        },
      },
    },
    archive:
      "A book imported from SavedVariables also includes a Character Archive: a historical snapshot that may differ from your character today.",
    next: {
      text: "The story starts with your in-game journal.",
      action: "About Forever Journey",
    },
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
    addon: {
      overview: {
        alt: "Forever Journey open in World of Warcraft: Forever on the Overview tab: a level 20 Undead Paladin, journey statistics and the latest recorded discoveries and a death",
        caption: "Overview tab · in-game addon screenshot",
      },
      chronicle: {
        alt: "Forever Journey Chronicle in World of Warcraft: Forever: a timeline of zone discoveries and a level-up, with a personal note and a favourite mark",
        caption: "Chronicle tab · in-game addon screenshot",
      },
    },
    addonNote:
      "From the addon’s CurseForge gallery. The current version may look different.",
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
