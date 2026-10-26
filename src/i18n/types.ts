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
  };
  languageNames: Record<Locale, string>;
  home: {
    eyebrow: string;
    heading: string;
    lead: string;
    productsHeading: string;
    products: {
      talentforge: ProductCopy;
      foreverJourney: ProductCopy;
      bookCreator: ProductCopy;
    };
    bookCreatorLinkLabel: string;
    statusNote: string;
  };
  footer: {
    disclaimer: string;
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

export interface MediaCopy {
  alt: string;
  caption: string;
}

export interface PlaceholderCopy {
  title: string;
  note: string;
}
