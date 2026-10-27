import type { ReleaseState } from "../config/release";
import type { AddonShotId, ClassId, MediaGroup } from "../media/catalog";
import type { Locale } from "./locales";

/**
 * Shape of every locale dictionary. Each locale must provide every key;
 * missing or extra keys are a type error, so translations cannot drift.
 */
export interface Dictionary {
  meta: {
    /** BCP 47 tag used for `<html lang>` and `hreflang`. */
    htmlLang: string;
    /** Open Graph locale, e.g. `en_US`. */
    ogLocale: string;
    /** `Intl` locale for dates, e.g. `en-GB` for "26 Oct 2026". */
    dateLocale: string;
    siteName: string;
    homeTitle: string;
    homeDescription: string;
  };
  a11y: {
    skipToContent: string;
    primaryNav: string;
    languageSwitcher: string;
    homeLink: string;
    opensInNewTab: string;
    /** Name of the mobile menu button; its state is in aria-expanded. */
    menu: string;
    footerNav: string;
  };
  languageNames: Record<Locale, string>;
  home: {
    eyebrow: string;
    heading: string;
    lead: string;
    /** Accessible name of the product plates region. */
    productsHeading: string;
    products: {
      talentforge: ProductCopy;
      foreverJourney: ProductCopy;
      bookCreator: ProductCopy;
    };
    /** Only facts confirmed by the TalentForge sources. */
    talentforgeFeatures: {
      autosave: string;
      offline: string;
      languages: string;
    };
    exploreTalentforge: string;
    exploreForeverJourney: string;
    /** Forever Journey availability on CurseForge, by release state. */
    curseforgeStates: Record<ReleaseState, string>;
    downloadAddon: string;
    bookCreatorLinkLabel: string;
    /** The synthetic English demo book, shown in every locale. */
    bookSample: {
      coverAlt: string;
      chapterAlt: string;
      caption: string;
    };
    flow: {
      heading: string;
      steps: Record<"plan" | "play" | "remember", FlowStep>;
    };
  };
  footer: {
    disclaimer: string;
    products: string;
    getTools: string;
    site: string;
    /** Names of the legal pages; each is shown only once it has an address. */
    pages: {
      privacy: string;
      terms: string;
      contact: string;
    };
    /** One plain note while no legal page is approved (blocker B7). */
    legalPending: string;
  };
  release: {
    heading: string;
    /** Followed by the localized check date. */
    updated: string;
    states: Record<ReleaseState, string>;
    channels: {
      android: string;
      ios: string;
      googlePlay: string;
      appStore: string;
      talentData: string;
    };
  };
  actions: {
    /** Second line of a disabled store button. */
    linkPending: string;
    inPreparation: string;
  };
  /** Shared parts of the product pages. */
  product: {
    /** Label of the strip that links to the other product page. */
    flowLabel: string;
  };
  talentforgePage: TalentForgePageCopy;
  foreverJourneyPage: ForeverJourneyPageCopy;
  talentforge: {
    /** Soft hyphens (U+00AD) allowed for long names in narrow tiles. */
    classNames: Record<ClassId, string>;
    classArtworkCaption: string;
  };
  media: {
    /** Alt text describes the image; captions name what it is. */
    images: Record<MediaGroup, MediaCopy>;
    /** In-game addon captures from the CurseForge gallery (blocker B1). */
    addon: Record<AddonShotId, MediaCopy>;
    /** Says the gallery captures may not show the current addon version. */
    addonNote: string;
    requiredBeforeRelease: string;
    placeholders: {
      addonScreenshot: PlaceholderCopy;
      editorLandscape: PlaceholderCopy;
      bookCreatorScreenshot: PlaceholderCopy;
    };
  };
}

export interface ProductCopy {
  name: string;
  kind: string;
  summary: string;
}

export interface FlowStep {
  title: string;
  text: string;
}

export interface MediaCopy {
  alt: string;
  caption: string;
}

export interface PlaceholderCopy {
  title: string;
  note: string;
}

export interface PageMeta {
  title: string;
  description: string;
}

export interface InfoItem {
  title: string;
  text: string;
}

/** Link to the other product page at the end of a product page. */
export interface NextProductCopy {
  text: string;
  action: string;
}

/**
 * TalentForge page (v3.2, pages 25–27). Only facts confirmed by the
 * TalentForge sources: no device sync, no game client or API, no OTA claim
 * while remote data delivery is disabled in the app.
 */
export interface TalentForgePageCopy {
  meta: PageMeta;
  /** "Mobile app · Android and iOS". */
  kind: string;
  lead: string;
  /** Says that the talent data version is not the app version. */
  dataVersionNote: string;
  classes: {
    heading: string;
    text: string;
    artwork: InfoItem;
    icons: InfoItem;
    /** Alt and caption of the CSS crop of the editor screenshot. */
    iconsCropAlt: string;
    iconsCropCaption: string;
  };
  trees: {
    heading: string;
    text: string;
    points: Record<"tabs" | "rules" | "details" | "landscape", InfoItem>;
  };
  features: {
    heading: string;
    items: Record<
      "autosave" | "offline" | "languages" | "share" | "dataVersions",
      InfoItem
    >;
    /** Marks a feature that no screenshot on the page shows. */
    notShown: string;
  };
  next: NextProductCopy;
}

/**
 * Forever Journey page (v3.2, pages 58–59). The addon never sends the
 * journal anywhere: the player exports it and Book Creator builds the PDF
 * locally in the browser.
 */
export interface ForeverJourneyPageCopy {
  meta: PageMeta;
  kind: string;
  lead: string;
  facts: {
    /** Accessible name of the facts panel. */
    label: string;
    bookCreator: string;
    worksInBrowser: string;
    account: string;
    notNeeded: string;
  };
  records: {
    heading: string;
    text: string;
    items: Record<
      "levelUps" | "zones" | "deaths" | "bossKills" | "notes",
      string
    >;
  };
  steps: {
    heading: string;
    items: Record<"install" | "play" | "book", InfoItem>;
  };
  book: {
    label: string;
    heading: string;
    text: string;
    points: Record<"browser" | "account" | "upload", string>;
    sampleCaption: string;
  };
  journal: {
    heading: string;
    text: string;
    exportCode: { title: string; steps: readonly string[] };
    savedVariables: { title: string; steps: readonly string[] };
    privacy: string;
    /** SavedVariables snapshots are history, not current character stats. */
    archive: string;
  };
  next: NextProductCopy;
}
