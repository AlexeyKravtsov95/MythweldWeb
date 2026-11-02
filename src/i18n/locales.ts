/**
 * Supported locales. English is the default and lives at the site root;
 * every other locale is served under its own path prefix (`/ru/`).
 * Keep in sync with `i18n.locales` in `astro.config.mjs` (covered by tests).
 */
export const LOCALES = ["en", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Root path of a locale's home page, always with a trailing slash. */
export function localeRoot(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "/" : `/${locale}/`;
}

/**
 * Build a site-relative path for a locale. `path` is locale-neutral
 * (e.g. `"/"` or `"/talentforge/"`); the result always ends with `/`.
 */
export function localizePath(locale: Locale, path = "/"): string {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  const root = localeRoot(locale);
  return trimmed === "" ? root : `${root}${trimmed}/`;
}

/** Localize root-relative page links; preserve external, email and anchor links. */
export function localizeHref(locale: Locale, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const suffixAt = href.search(/[?#]/);
  const path = suffixAt === -1 ? href : href.slice(0, suffixAt);
  const suffix = suffixAt === -1 ? "" : href.slice(suffixAt);
  return localizePath(locale, path) + suffix;
}

/** Detect the locale from a pathname such as `/ru/` or `/ru/page/`. */
export function localeFromPath(pathname: string): Locale {
  const [first = ""] = pathname.split("/").filter(Boolean);
  return isLocale(first) ? first : DEFAULT_LOCALE;
}
