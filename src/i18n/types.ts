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
}

export interface ProductCopy {
  name: string;
  kind: string;
  summary: string;
}
