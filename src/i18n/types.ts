import type { ReleaseState } from "../config/release";
import type { ClassId, MediaGroup } from "../media/catalog";
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
    /** Second line of the disabled action until the product page exists. */
    pagePending: string;
    /** Forever Journey availability on CurseForge, by release state. */
    curseforgeStates: Record<ReleaseState, string>;
    addonPlaceholderNote: string;
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
    /** Site pages without an address yet; shown with "link pending". */
    pages: {
      privacy: string;
      terms: string;
      contact: string;
    };
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
  talentforge: {
    /** Soft hyphens (U+00AD) allowed for long names in narrow tiles. */
    classNames: Record<ClassId, string>;
    classArtworkCaption: string;
  };
  media: {
    /** Alt text describes the image; captions name what it is. */
    images: Record<MediaGroup, MediaCopy>;
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
