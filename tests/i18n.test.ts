import { describe, expect, it } from "vitest";
import astroConfig from "../astro.config.mjs";
import {
  DEFAULT_LOCALE,
  LOCALES,
  getDictionary,
  isLocale,
  localeFromPath,
  localeRoot,
  localizePath,
} from "../src/i18n";

/** Every leaf path of a nested object, e.g. `home.products.talentforge.name`. */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      leafPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function leafValues(value: unknown): unknown[] {
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(leafValues);
  }
  return [value];
}

describe("locale configuration", () => {
  it("matches the Astro i18n config", () => {
    expect(astroConfig.i18n?.locales).toEqual([...LOCALES]);
    expect(astroConfig.i18n?.defaultLocale).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("keeps English at the root without a prefix", () => {
    const routing = astroConfig.i18n?.routing;
    expect(typeof routing === "object" && routing.prefixDefaultLocale).toBe(
      false,
    );
  });

  it("is a static build with trailing slashes", () => {
    expect(astroConfig.output).toBe("static");
    expect(astroConfig.trailingSlash).toBe("always");
  });
});

describe("routing helpers", () => {
  it("maps locales to their home roots", () => {
    expect(localeRoot("en")).toBe("/");
    expect(localeRoot("ru")).toBe("/ru/");
  });

  it.each([
    ["en", "/", "/"],
    ["ru", "/", "/ru/"],
    ["en", "talentforge", "/talentforge/"],
    ["ru", "/talentforge/", "/ru/talentforge/"],
    ["ru", "//a/b//", "/ru/a/b/"],
  ] as const)("localizePath(%s, %s) → %s", (locale, path, expected) => {
    expect(localizePath(locale, path)).toBe(expected);
  });

  it.each([
    ["/", "en"],
    ["/ru/", "ru"],
    ["/ru/talentforge/", "ru"],
    ["/rus/", "en"],
    ["/talentforge/", "en"],
  ] as const)("localeFromPath(%s) → %s", (pathname, expected) => {
    expect(localeFromPath(pathname)).toBe(expected);
  });

  it("validates locale strings", () => {
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});

describe("dictionaries", () => {
  const en = getDictionary("en");

  it.each(LOCALES)("%s has exactly the same keys as en", (locale) => {
    expect(leafPaths(getDictionary(locale)).sort()).toEqual(
      leafPaths(en).sort(),
    );
  });

  it.each(LOCALES)("%s has no empty strings", (locale) => {
    for (const value of leafValues(getDictionary(locale))) {
      expect(typeof value).toBe("string");
      expect((value as string).trim()).not.toBe("");
    }
  });

  it.each(LOCALES)("%s declares its own html lang", (locale) => {
    expect(getDictionary(locale).meta.htmlLang).toBe(locale);
  });

  it("ru is actually translated, not copied from en", () => {
    const ru = getDictionary("ru");
    expect(ru.meta.homeTitle).not.toBe(en.meta.homeTitle);
    expect(ru.home.lead).not.toBe(en.home.lead);
    expect(ru.a11y.skipToContent).not.toBe(en.a11y.skipToContent);
    expect(ru.home.lead).toMatch(/[а-яё]/i);
  });
});
