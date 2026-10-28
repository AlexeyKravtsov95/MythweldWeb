/**
 * HTTP smoke checks of a deployed copy of the site (bucket website endpoint,
 * CDN test domain or, after WEB-M0.6B, mythweld.com):
 *
 *   node scripts/deploy/smoke.ts https://<staging-host>
 *
 * Every public route answers 200 with HTML in its locale, unknown paths
 * answer 404 with the site's 404 page (not a 200 fallback), robots.txt keeps
 * indexing closed, and Content-Type / Cache-Control match `objects.ts`.
 * Exits 1 if any check fails; warnings do not fail the run. `smoke()` takes
 * the fetch function, so `tests/deploy.test.ts` runs it on a fake bucket.
 */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { CACHE, REQUIRED_KEYS, objectMeta } from "./objects.ts";

export type Outcome = "pass" | "fail" | "warn";

export interface Check {
  outcome: Outcome;
  name: string;
  detail: string;
}

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** Public routes as URLs: `ru/talentforge/index.html` → `/ru/talentforge/`. */
export const ROUTES = REQUIRED_KEYS.filter(
  (key) => key === "index.html" || key.endsWith("/index.html"),
).map((key) => `/${key.slice(0, -"index.html".length)}`);

/** Marker of the shared 404 page (`src/pages/404.astro`). */
export const NOT_FOUND_MARKER = 'data-not-found="en"';

function lang(route: string): string {
  return route.startsWith("/ru/") ? "ru" : "en";
}

export async function smoke(base: string, fetchFn: Fetch): Promise<Check[]> {
  const origin = base.replace(/\/+$/, "");
  const checks: Check[] = [];
  const add = (outcome: Outcome, name: string, detail: string) =>
    checks.push({ outcome, name, detail });
  const get = (path: string) =>
    fetchFn(`${origin}${path}`, { redirect: "manual" });

  /** Status, Content-Type and Cache-Control of one URL; returns the body. */
  async function expectFile(
    path: string,
    contentType: string,
    cacheControl: string,
  ): Promise<string> {
    const res = await get(path);
    const body = await res.text();
    const type = res.headers.get("content-type") ?? "";
    const cache = res.headers.get("cache-control") ?? "";
    const problems = [
      res.status !== 200 ? `status ${res.status}` : "",
      type.toLowerCase() !== contentType ? `content-type "${type}"` : "",
      cache !== cacheControl ? `cache-control "${cache}"` : "",
    ].filter(Boolean);
    add(
      problems.length === 0 ? "pass" : "fail",
      `GET ${path}`,
      problems.length === 0
        ? `200, ${type}, ${cache}`
        : `${problems.join(", ")}; expected 200, ${contentType}, ${cacheControl}`,
    );
    return body;
  }

  let home = "";
  for (const route of ROUTES) {
    const body = await expectFile(
      route,
      objectMeta("index.html").contentType,
      CACHE.document,
    );
    if (route === "/") home = body;
    const expected = `<html lang="${lang(route)}"`;
    add(
      body.includes(expected) ? "pass" : "fail",
      `${route} locale`,
      body.includes(expected) ? expected : `no ${expected} in the body`,
    );
  }

  const nonce = Date.now().toString(36);
  for (const path of [
    `/smoke-missing-${nonce}/`,
    `/ru/smoke-missing-${nonce}/`,
    `/talentforge/smoke-missing-${nonce}.html`,
    `/_astro/smoke-missing-${nonce}.css`,
  ]) {
    const res = await get(path);
    const body = await res.text();
    const page = body.includes(NOT_FOUND_MARKER);
    const ok = res.status === 404 && page;
    add(
      ok ? "pass" : "fail",
      `GET ${path}`,
      ok
        ? "404 with the site 404 page"
        : `status ${res.status}${page ? "" : ", not the site 404 page"}; expected 404 (no 200 fallback)`,
    );
  }

  // Canonical URLs end with "/" and every internal link uses them; the
  // slash-less form only has to land somewhere sensible.
  {
    const res = await get("/talentforge");
    const location = res.headers.get("location") ?? "";
    await res.body?.cancel();
    const redirect = res.status >= 301 && res.status <= 308;
    add(
      redirect && location.endsWith("/talentforge/") ? "pass" : "warn",
      "GET /talentforge (no slash)",
      redirect ? `${res.status} → ${location}` : `status ${res.status}`,
    );
  }

  const robots = await expectFile(
    "/robots.txt",
    objectMeta("robots.txt").contentType,
    CACHE.document,
  );
  const closed = /^Disallow: \/\s*$/m.test(robots);
  add(
    closed ? "pass" : "fail",
    "robots.txt closed",
    closed ? "Disallow: /" : "must keep Disallow: / until WEB-M0.6B",
  );
  await expectFile(
    "/sitemap.xml",
    objectMeta("sitemap.xml").contentType,
    CACHE.document,
  );

  const assets = [
    // href, src and srcset candidates alike.
    ...home.matchAll(/\/_astro\/[^"'\s,?#]+\.(?:css|avif|webp)/g),
  ].map((m) => m[0]);
  for (const ext of ["css", "avif", "webp"]) {
    const path = assets.find((a) => a.endsWith(`.${ext}`));
    if (path === undefined) {
      add("warn", `_astro/*.${ext}`, "none linked from /");
      continue;
    }
    await expectFile(
      path,
      objectMeta(path.slice(1)).contentType,
      CACHE.immutable,
    );
  }
  for (const path of [
    "/fonts/geologica/geologica-latin-wght-shrp.woff2",
    "/og/mythweld-en.png",
    "/favicon.svg",
  ]) {
    await expectFile(path, objectMeta(path.slice(1)).contentType, CACHE.static);
  }

  if (origin.startsWith("https://")) {
    const plain = origin.replace(/^https:/, "http:");
    try {
      const res = await fetchFn(`${plain}/`, { redirect: "manual" });
      await res.body?.cancel();
      const location = res.headers.get("location") ?? "";
      add(
        location.startsWith("https://") ? "pass" : "warn",
        "http → https",
        `${res.status}${location ? ` → ${location}` : ""}`,
      );
    } catch (error) {
      add("warn", "http → https", `no answer: ${(error as Error).message}`);
    }
  }

  return checks;
}

export function report(base: string, checks: readonly Check[]): string {
  return [
    `### Smoke: ${base}`,
    "",
    "| Result | Check | Detail |",
    "| --- | --- | --- |",
    ...checks.map(
      (c) =>
        `| ${c.outcome.toUpperCase()} | ${c.name} | ${c.detail.replace(/\|/g, "\\|")} |`,
    ),
  ].join("\n");
}

async function main(): Promise<void> {
  const base = process.argv[2] ?? process.env["SMOKE_BASE_URL"];
  if (!base || !/^https?:\/\/[^/]+\/?$/.test(base)) {
    throw new Error("Usage: node scripts/deploy/smoke.ts https://<host>");
  }
  const checks = await smoke(base, (url, init) => fetch(url, init));
  const text = report(base, checks);
  console.log(text);
  const summaryFile = process.env["GITHUB_STEP_SUMMARY"];
  if (summaryFile) appendFileSync(summaryFile, `${text}\n`);
  const failed = checks.filter((c) => c.outcome === "fail").length;
  if (failed > 0) throw new Error(`${failed} smoke check(s) failed.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error((error as Error).message);
    process.exit(1);
  });
}
