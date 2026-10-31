/**
 * What goes into the `mythweld-web` bucket and with which HTTP metadata.
 * Pure functions only: `deploy.ts` uploads by this plan, `smoke.ts` checks
 * the served headers against it and `tests/deploy.test.ts` checks `dist/`.
 *
 * Node runs this file directly (type stripping), so it imports nothing from
 * `src/` and uses only erasable TypeScript syntax.
 */

/** The only bucket the deploy may write to; OTA and other buckets never. */
export const BUCKET = "mythweld-web";

/** VK Cloud Object Storage S3 endpoints, e.g. `https://hb.ru-msk.vkcloud-storage.ru`. */
export const ENDPOINT_PATTERN =
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vkcloud-storage\.ru$/;

/**
 * Cache policies. Browsers revalidate HTML and other documents on every
 * visit; the CDN (in "origin settings" mode it honours `s-maxage` over
 * `max-age`) keeps them for 5 minutes, so a deploy is live everywhere within
 * 5 minutes without a purge. `_astro/` file names contain a content hash, so
 * they never change and are cached for a year. Other public files (fonts,
 * share cards, favicon) keep stable names and are cached for a day.
 */
export const CACHE = {
  document: "public, max-age=0, s-maxage=300, must-revalidate",
  immutable: "public, max-age=31536000, immutable",
  static: "public, max-age=86400",
} as const;

export type CacheClass = keyof typeof CACHE;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  ico: "image/x-icon",
  woff2: "font/woff2",
  woff: "font/woff",
};

/**
 * Files that must never reach the public bucket even if a build puts them in
 * `dist/`: dotfiles (`.env`, `.DS_Store`), source maps, sources, repository
 * docs and legal drafts, keys and certificates.
 */
const FORBIDDEN: readonly RegExp[] = [
  /(^|\/)\./,
  /\.map$/,
  /\.(md|mdx|ts|tsx|astro|env|pem|key|p12|pfx|crt)$/i,
  /(^|\/)(docs|legal-drafts|node_modules|src)\//,
];

/**
 * Files the bucket must serve: every public route in every locale (as
 * `<route>/index.html`, which Static-Site Hosting resolves for `<route>/`),
 * the error document, robots.txt and the sitemap. `tests/deploy.test.ts`
 * keeps this list in sync with `src/config/pages.ts` and the locales.
 */
export const REQUIRED_KEYS = [
  "index.html",
  "talentforge/index.html",
  "forever-journey/index.html",
  "book-creator/index.html",
  "ru/index.html",
  "ru/talentforge/index.html",
  "ru/forever-journey/index.html",
  "ru/book-creator/index.html",
  "404.html",
  "robots.txt",
  "sitemap.xml",
] as const;

/** Index and error documents of the bucket's Static-Site Hosting. */
export const INDEX_DOCUMENT = "index.html";
export const ERROR_DOCUMENT = "404.html";

export interface ObjectMeta {
  contentType: string;
  cacheControl: string;
  cacheClass: CacheClass;
}

export interface UploadItem extends ObjectMeta {
  key: string;
}

function extension(key: string): string {
  const name = key.slice(key.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function cacheClass(key: string): CacheClass {
  if (key.startsWith("_astro/")) return "immutable";
  const ext = extension(key);
  if (ext === "html" || ext === "xml" || key === "robots.txt") {
    return "document";
  }
  return "static";
}

/** HTTP metadata of one object; throws for a type the plan does not know. */
export function objectMeta(key: string): ObjectMeta {
  const contentType = CONTENT_TYPES[extension(key)];
  if (contentType === undefined) {
    throw new Error(`no Content-Type for "${key}": add it to CONTENT_TYPES`);
  }
  const cls = cacheClass(key);
  return { contentType, cacheControl: CACHE[cls], cacheClass: cls };
}

export function isForbidden(key: string): boolean {
  return FORBIDDEN.some((pattern) => pattern.test(key));
}

/** Upload phases: hashed assets, then other files, then documents. */
const PHASE: Record<CacheClass, number> = {
  immutable: 0,
  static: 1,
  document: 2,
};

/**
 * Validates the built files and orders them for upload. Assets go first and
 * HTML last, so a page never points at an asset that is not uploaded yet;
 * the error document goes very last. Throws with every problem at once.
 */
export function planUpload(
  keys: readonly string[],
  robotsTxt: string,
): UploadItem[] {
  const problems: string[] = [];
  const present = new Set(keys);
  for (const key of REQUIRED_KEYS) {
    if (!present.has(key)) problems.push(`missing required file "${key}"`);
  }
  for (const key of keys) {
    if (isForbidden(key)) problems.push(`forbidden file "${key}"`);
  }
  // Indexing stays closed until the public launch (WEB-M0.6B): that task
  // changes robots.txt, its tests and this guard together.
  if (!/^Disallow: \/\s*$/m.test(robotsTxt)) {
    problems.push('robots.txt must keep "Disallow: /" until WEB-M0.6B');
  }
  const items: UploadItem[] = [];
  for (const key of keys) {
    try {
      items.push({ key, ...objectMeta(key) });
    } catch (error) {
      problems.push((error as Error).message);
    }
  }
  if (problems.length > 0) {
    throw new Error(`Deploy plan rejected:\n- ${problems.join("\n- ")}`);
  }
  const rank = (item: UploadItem) =>
    item.key === ERROR_DOCUMENT ? 3 : PHASE[item.cacheClass];
  return items.sort(
    (a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key, "en"),
  );
}

/**
 * Objects in the bucket that the new build no longer has. Old `_astro/`
 * files are kept: a browser or CDN may still hold an old HTML page that
 * points at them, and their hashed names never collide with new files.
 */
export function staleKeys(
  remote: readonly string[],
  local: readonly string[],
): string[] {
  const keep = new Set(local);
  return remote
    .filter((key) => !keep.has(key) && !key.startsWith("_astro/"))
    .sort();
}
