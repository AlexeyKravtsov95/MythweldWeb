/**
 * HTTP smoke checks of a deployed copy of the site (bucket website endpoint,
 * CDN test domain or, after WEB-M0.6B, mythweld.com):
 *
 *   node scripts/deploy/smoke.ts https://<staging-host>
 *
 * Every public route and asset answers 200 with the type and cache policy of
 * `objects.ts`, routes in their locale, robots.txt keeps indexing closed, and
 * unknown paths answer with the site's 404 page (not a 200 fallback): 404 is a
 * pass, 403 is a warning (VK Cloud Static-Site Hosting serves the error
 * document with 403 for missing keys; accepted by the owner in Issue #14),
 * anything else fails. Exits 1 if any check fails; warnings do not fail the run. `smoke()`
 * takes the fetch function, so `tests/deploy.test.ts` runs it on a fake bucket.
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

/**
 * Markers of the shared 404 page (`src/pages/404.astro`): both locale blocks
 * and noindex, so an arbitrary HTML error page is not taken for ours.
 */
export const NOT_FOUND_MARKERS = [
  'data-not-found="en"',
  'data-not-found="ru"',
  '<meta name="robots" content="noindex">',
] as const;

/** Detail of the one accepted deviation: owner decision in Issue #14. */
export const VK_403_NOTE =
  "VK Cloud known limitation: HTTP 403 with custom 404 document";

function lang(route: string): string {
  return route.startsWith("/ru/") ? "ru" : "en";
}

/**
 * Outcome for a URL that does not exist: 404 + the site 404 page passes,
 * 403 + the site 404 page warns, any other status (200 fallback included) or
 * body, or a non-HTML error, fails.
 */
export function classifyMissing(
  status: number,
  contentType: string,
  body: string,
): { outcome: Outcome; detail: string } {
  const html =
    (contentType.split(";")[0] ?? "").trim().toLowerCase() === "text/html";
  const page = html && NOT_FOUND_MARKERS.every((m) => body.includes(m));
  if (page && status === 404) {
    return { outcome: "pass", detail: "404 with the site 404 page" };
  }
  if (page && status === 403) return { outcome: "warn", detail: VK_403_NOTE };
  const problems = [
    `status ${status}`,
    html ? "" : `content-type "${contentType}"`,
    page ? "" : "not the site 404 page",
  ].filter(Boolean);
  return {
    outcome: "fail",
    detail: `${problems.join(", ")}; expected 404 (or 403, known VK Cloud limitation) with the site 404 page as text/html, no 200 fallback`,
  };
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
    const { outcome, detail } = classifyMissing(
      res.status,
      res.headers.get("content-type") ?? "",
      body,
    );
    add(outcome, `GET ${path}`, detail);
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

export function count(checks: readonly Check[]): Record<Outcome, number> {
  const totals: Record<Outcome, number> = { pass: 0, warn: 0, fail: 0 };
  for (const c of checks) totals[c.outcome] += 1;
  return totals;
}

export function report(base: string, checks: readonly Check[]): string {
  const { pass, warn, fail } = count(checks);
  return [
    `### Smoke: ${base}`,
    "",
    `**${pass} PASS, ${warn} WARN, ${fail} FAIL** — WARN does not fail the run.`,
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
  if (process.env["GITHUB_ACTIONS"] === "true") {
    // Annotations on the run page; a warning never marks the job failed.
    for (const c of checks.filter((c) => c.outcome === "warn")) {
      console.log(`::warning title=Smoke WARN::${c.name}: ${c.detail}`);
    }
  }
  const { fail } = count(checks);
  if (fail > 0) throw new Error(`${fail} smoke check(s) failed.`);
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
