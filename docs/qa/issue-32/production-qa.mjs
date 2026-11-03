import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const base = fileURLToPath(new URL("../../../", import.meta.url));
const routes = [
  "/",
  "/talentforge/",
  "/forever-journey/",
  "/book-creator/",
  "/community/",
  "/ru/",
  "/ru/talentforge/",
  "/ru/forever-journey/",
  "/ru/book-creator/",
  "/ru/community/",
  "/robots.txt",
  "/sitemap.xml",
  "/404.html",
  "/qa-issue-32-missing/",
  "/privacy/",
  "/terms/",
  "/contact/",
  "/ru/privacy/",
  "/ru/terms/",
  "/ru/contact/",
];
const hash = (s) => createHash("sha256").update(s).digest("hex");
const results = await Promise.all(
  routes.map(async (path) => {
    try {
      const url = "https://mythweld.com" + path;
      const started = new Date().toISOString();
      const r = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
      });
      const body = await r.text();
      const head = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
      });
      const file =
        base + "dist" + (path.endsWith("/") ? path + "index.html" : path);
      let local;
      try {
        local = readFileSync(file, "utf8");
      } catch {}
      return {
        path,
        started,
        get: r.status,
        head: head.status,
        headers: Object.fromEntries(
          [
            "content-type",
            "cache-control",
            "last-modified",
            "etag",
            "location",
            "strict-transport-security",
          ].map((h) => [h, r.headers.get(h)]),
        ),
        setCookie: r.headers.has("set-cookie"),
        lang: body.match(/<html[^>]*lang="([^"]+)/)?.[1],
        title: body.match(/<title>(.*?)<\/title>/)?.[1],
        canonical: body.match(/rel="canonical" href="([^"]+)/)?.[1],
        brand404: body.includes('data-not-found="en"'),
        noindex: body.includes('content="noindex"'),
        sameAsLocal: local === undefined ? null : hash(body) === hash(local),
        ...(path === "/robots.txt" ? { body } : {}),
        ...(path === "/sitemap.xml"
          ? { locs: [...body.matchAll(/<loc>([^<]+)/g)].map((x) => x[1]) }
          : {}),
      };
    } catch (e) {
      return { path, error: String(e) };
    }
  }),
);
const external = await Promise.all(
  [
    "https://journal.mythweld.com/",
    "https://www.curseforge.com/wow/addons/forever-journey",
    "https://discord.gg/R96fQZHGRS",
  ].map(async (url) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const body = await r.text();
      return {
        url,
        status: r.status,
        final: r.url,
        title: body.match(/<title>(.*?)<\/title>/s)?.[1],
      };
    } catch (e) {
      return { url, error: String(e) };
    }
  }),
);
writeFileSync(
  new URL("production-results.json", import.meta.url),
  JSON.stringify({ results, external }, null, 2),
);
console.log("Saved production-results.json (read-only HTTPS GET/HEAD)");
