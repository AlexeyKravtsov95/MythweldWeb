import { en } from "./dictionaries/en";
import { ru } from "./dictionaries/ru";
import type { Locale } from "./locales";
import type { Dictionary } from "./types";

export * from "./locales";
export type { Dictionary, ProductCopy } from "./types";

const dictionaries: Record<Locale, Dictionary> = { en, ru };

/** Typed copy for a locale. Components read text only through this. */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
