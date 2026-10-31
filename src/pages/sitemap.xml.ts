/**
 * Sitemap of the eight public pages with their hreflang alternates. Built as
 * a static file; robots.txt does not point to it until the WEB-M0.6 launch
 * opens indexing.
 */
import type { APIRoute } from "astro";
import { PUBLIC_PATHS } from "../config/pages";
import { SITE } from "../config/site";
import { DEFAULT_LOCALE, LOCALES, getDictionary, localizePath } from "../i18n";

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL(SITE.url);
  const url = (path: string) => new URL(path, base).href;
  const entries = PUBLIC_PATHS.flatMap((path) => {
    const links = [
      ...LOCALES.map(
        (alt) =>
          `    <xhtml:link rel="alternate" hreflang="${getDictionary(alt).meta.htmlLang}" href="${url(localizePath(alt, path))}"/>`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(localizePath(DEFAULT_LOCALE, path))}"/>`,
    ].join("\n");
    return LOCALES.map(
      (locale) =>
        `  <url>\n    <loc>${url(localizePath(locale, path))}</loc>\n${links}\n  </url>`,
    );
  });
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
