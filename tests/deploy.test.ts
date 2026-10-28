/**
 * VK Cloud deploy (WEB-M0.6A) on the production build in `dist/` (run
 * `npm run build` first): the upload plan, the shared 404 page, the bucket
 * configs in deploy/vk-cloud/, the deploy workflow's permissions and the
 * smoke checks against a fake Static-Site Hosting bucket.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, type HTMLElement } from "node-html-parser";
import { beforeAll, describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "../src/config/pages";
import { LOCALES, getDictionary, localeRoot, localizePath } from "../src/i18n";
import {
  BUCKET,
  CACHE,
  ENDPOINT_PATTERN,
  ERROR_DOCUMENT,
  INDEX_DOCUMENT,
  REQUIRED_KEYS,
  isForbidden,
  objectMeta,
  planUpload,
  staleKeys,
} from "../scripts/deploy/objects.ts";
import {
  NOT_FOUND_MARKERS,
  ROUTES,
  VK_403_NOTE,
  classifyMissing,
  count,
  report,
  smoke,
  type Fetch,
} from "../scripts/deploy/smoke.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
const read = (path: string) => readFileSync(join(root, path), "utf8");

function distKeys(): string[] {
  return readdirSync(dist, { recursive: true, encoding: "utf8" })
    .filter((entry) => statSync(join(dist, entry)).isFile())
    .map((entry) => entry.split("\\").join("/"))
    .sort();
}

const CLOSED_ROBOTS = "User-agent: *\nDisallow: /\n";

beforeAll(() => {
  if (!existsSync(dist)) {
    throw new Error("dist/ not found: run `npm run build` before `npm test`.");
  }
});

describe("upload plan", () => {
  it("requires every public route in every locale, 404, robots and sitemap", () => {
    const pages = LOCALES.flatMap((locale) =>
      PUBLIC_PATHS.map(
        (path) => `${localizePath(locale, path).slice(1)}index.html`,
      ),
    );
    expect([...REQUIRED_KEYS].sort()).toEqual(
      [...pages, "404.html", "robots.txt", "sitemap.xml"].sort(),
    );
    expect([...ROUTES].sort()).toEqual(
      LOCALES.flatMap((l) =>
        PUBLIC_PATHS.map((p) => localizePath(l, p)),
      ).sort(),
    );
  });

  it("accepts the build and uploads assets first, HTML last, 404 at the end", () => {
    const keys = distKeys();
    const plan = planUpload(
      keys,
      readFileSync(join(dist, "robots.txt"), "utf8"),
    );
    expect(plan.map((item) => item.key).sort()).toEqual(keys);
    const classes = plan.map((item) => item.cacheClass);
    const firstDocument = classes.indexOf("document");
    expect(classes.slice(firstDocument).every((c) => c === "document")).toBe(
      true,
    );
    const lastImmutable = classes.lastIndexOf("immutable");
    expect(
      classes.slice(0, lastImmutable + 1).every((c) => c === "immutable"),
    ).toBe(true);
    expect(plan.at(-1)?.key).toBe(ERROR_DOCUMENT);
  });

  it("gives every built file a Content-Type and a cache policy", () => {
    for (const key of distKeys()) {
      const meta = objectMeta(key);
      expect(meta.cacheControl).toBe(CACHE[meta.cacheClass]);
      if (key.startsWith("_astro/")) expect(meta.cacheClass).toBe("immutable");
      if (key.endsWith(".html")) expect(meta.cacheClass).toBe("document");
    }
  });

  it.each([
    ["index.html", "text/html; charset=utf-8", "document"],
    ["ru/talentforge/index.html", "text/html; charset=utf-8", "document"],
    ["404.html", "text/html; charset=utf-8", "document"],
    ["robots.txt", "text/plain; charset=utf-8", "document"],
    ["sitemap.xml", "application/xml; charset=utf-8", "document"],
    ["_astro/BaseLayout.abc123.css", "text/css; charset=utf-8", "immutable"],
    ["_astro/page.abc123.js", "text/javascript; charset=utf-8", "immutable"],
    ["_astro/shot.abc123.avif", "image/avif", "immutable"],
    ["_astro/shot.abc123.webp", "image/webp", "immutable"],
    ["_astro/shot.abc123.png", "image/png", "immutable"],
    ["fonts/geologica/geologica-latin-wght-shrp.woff2", "font/woff2", "static"],
    ["fonts/geologica/OFL.txt", "text/plain; charset=utf-8", "static"],
    ["og/mythweld-en.png", "image/png", "static"],
    ["favicon.svg", "image/svg+xml", "static"],
  ] as const)("%s → %s, %s", (key, contentType, cacheClass) => {
    expect(objectMeta(key)).toEqual({
      contentType,
      cacheClass,
      cacheControl: CACHE[cacheClass],
    });
  });

  it("caches HTML briefly at the CDN only and hashed assets for a year", () => {
    expect(CACHE.document).toMatch(/max-age=0\b/);
    expect(CACHE.document).toMatch(/s-maxage=300\b/);
    expect(CACHE.immutable).toBe("public, max-age=31536000, immutable");
  });

  it("refuses unknown types, forbidden files, missing pages and open robots.txt", () => {
    expect(() => objectMeta("_astro/blob.bin")).toThrow(/Content-Type/);
    for (const key of [
      ".env",
      "assets/.DS_Store",
      "_astro/index.js.map",
      "docs/release-readiness.md",
      "legal-drafts/privacy-policy.ru.md",
      "src/config/site.ts",
      "certs/site.pem",
    ]) {
      expect(isForbidden(key), key).toBe(true);
    }
    for (const key of distKeys()) expect(isForbidden(key), key).toBe(false);

    const keys = distKeys();
    expect(() => planUpload([...keys, ".env"], CLOSED_ROBOTS)).toThrow(
      /forbidden file "\.env"/,
    );
    expect(() =>
      planUpload(
        keys.filter((k) => k !== "ru/talentforge/index.html"),
        CLOSED_ROBOTS,
      ),
    ).toThrow(/missing required file "ru\/talentforge\/index.html"/);
    expect(() => planUpload(keys, "User-agent: *\nAllow: /\n")).toThrow(
      /Disallow/,
    );
  });

  it("prunes removed files but keeps old hashed assets", () => {
    expect(
      staleKeys(
        ["index.html", "old/index.html", "_astro/Old.abc.css", "notes.txt"],
        ["index.html"],
      ),
    ).toEqual(["notes.txt", "old/index.html"]);
  });

  it("accepts only VK Cloud S3 endpoints", () => {
    for (const ok of [
      "https://hb.ru-msk.vkcloud-storage.ru",
      "https://hb.vkcloud-storage.ru",
      "https://hb.kz-ast.vkcloud-storage.ru",
    ]) {
      expect(ENDPOINT_PATTERN.test(ok), ok).toBe(true);
    }
    for (const bad of [
      "http://hb.ru-msk.vkcloud-storage.ru",
      "https://s3.amazonaws.com",
      "https://evil.example/?vkcloud-storage.ru",
      "https://vkcloud-storage.ru.evil.example",
    ]) {
      expect(ENDPOINT_PATTERN.test(bad), bad).toBe(false);
    }
  });
});

describe("shared 404 page", () => {
  let doc: HTMLElement;

  beforeAll(() => {
    doc = parse(readFileSync(join(dist, ERROR_DOCUMENT), "utf8"));
  });

  it("is a noindex page without canonical, alternates or og:url", () => {
    expect(
      doc.querySelector('meta[name="robots"]')?.getAttribute("content"),
    ).toBe("noindex");
    expect(
      doc.querySelectorAll('link[rel="canonical"], link[rel="alternate"]'),
    ).toHaveLength(0);
    expect(doc.querySelector('meta[property="og:url"]')).toBeNull();
  });

  it("has one h1 and the copy of every locale in its own language", () => {
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("html")?.getAttribute("lang")).toBe("en");
    const title = doc.querySelector("title")?.text ?? "";
    for (const locale of LOCALES) {
      const t = getDictionary(locale);
      const block = doc.querySelector(`[data-not-found="${locale}"]`);
      expect(block?.getAttribute("lang")).toBe(t.meta.htmlLang);
      expect(block?.text).toContain(t.notFound.heading);
      expect(block?.text).toContain(t.notFound.lead);
      const link = block?.querySelector("a");
      expect(link?.getAttribute("href")).toBe(localeRoot(locale));
      expect(link?.text).toContain(t.notFound.homeLink);
      expect(title).toContain(t.notFound.title);
    }
    for (const marker of NOT_FOUND_MARKERS) {
      expect(doc.toString()).toContain(marker);
    }
  });

  it("uses only root-relative links and assets, so it works at any depth", () => {
    for (const el of doc.querySelectorAll("[href], [src]")) {
      for (const attr of ["href", "src"]) {
        const value = el.getAttribute(attr);
        if (value === undefined || value.startsWith("#")) continue;
        expect(value, `${attr}=${value}`).toMatch(/^(\/|https:\/\/)/);
      }
    }
    for (const a of doc.querySelectorAll("a[href^='/']")) {
      const path = (a.getAttribute("href") ?? "").split("#")[0] ?? "";
      expect(existsSync(join(dist, path, INDEX_DOCUMENT)), path).toBe(true);
    }
  });

  it("is not listed in the sitemap", () => {
    expect(readFileSync(join(dist, "sitemap.xml"), "utf8")).not.toMatch(/404/);
  });
});

describe("bucket configs (deploy/vk-cloud)", () => {
  it("website config serves index.html and the 404 document", () => {
    expect(JSON.parse(read("deploy/vk-cloud/website.json"))).toEqual({
      IndexDocument: { Suffix: INDEX_DOCUMENT },
      ErrorDocument: { Key: ERROR_DOCUMENT },
    });
  });

  it("bucket policy only lets anyone read objects of mythweld-web", () => {
    const policy = JSON.parse(read("deploy/vk-cloud/bucket-policy.json")) as {
      Statement: unknown[];
    };
    expect(policy.Statement).toEqual([
      expect.objectContaining({
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${BUCKET}/*`],
      }),
    ]);
  });
});

describe("deploy workflow", () => {
  const workflow = read(".github/workflows/deploy-vk-cloud.yml");

  it("runs only on a manual dispatch, never on push, merge or PR", () => {
    const on = workflow.slice(
      workflow.indexOf("\non:"),
      workflow.indexOf("\npermissions:"),
    );
    expect(on).toMatch(/workflow_dispatch:/);
    expect(on).not.toMatch(
      /\b(push|pull_request|pull_request_target|schedule|workflow_run):/,
    );
  });

  it("grants the token read-only contents and nothing else", () => {
    expect(workflow.match(/^permissions:\n((?: {2}.+\n)+)/m)?.[1]).toBe(
      "  contents: read\n",
    );
    expect(workflow.match(/^\s*permissions:/gm)).toHaveLength(1);
    expect(workflow).not.toMatch(/write-all|: write\b/);
  });

  it("deploys only merged commits of main to mythweld-web behind an environment", () => {
    expect(workflow).toContain(
      'git merge-base --is-ancestor "$sha" origin/main',
    );
    expect(workflow).toContain(`S3_BUCKET: ${BUCKET}`);
    expect(workflow).toMatch(/environment:\n\s+name: vk-cloud-staging/);
  });

  it("hands the S3 keys to the upload step only and never persists git credentials", () => {
    const uses = workflow.match(/\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}/g) ?? [];
    expect(uses.sort()).toEqual([
      "${{ secrets.VK_S3_ACCESS_KEY_ID }}",
      "${{ secrets.VK_S3_SECRET_ACCESS_KEY }}",
    ]);
    const steps = workflow.split(/\n\s+- name: /);
    const withSecrets = steps.filter((step) => /\$\{\{\s*secrets\./.test(step));
    expect(withSecrets.map((step) => step.split("\n")[0])).toEqual([
      "Upload to mythweld-web",
    ]);
    const checkouts = steps.filter((step) =>
      step.includes("uses: actions/checkout@"),
    );
    expect(checkouts).toHaveLength(2);
    for (const step of checkouts) {
      expect(step).toContain("persist-credentials: false");
    }
  });

  it("does not interpolate dispatch inputs into shell scripts", () => {
    for (const step of workflow.split(/\n\s+- name: /)) {
      const script = step.split(/\n\s+run: /)[1];
      if (script === undefined) continue;
      expect(script).not.toMatch(/\$\{\{\s*(inputs|github\.event)\./);
    }
  });
});

interface Answer {
  status: number;
  contentType?: string;
  body?: string;
}

/**
 * A stand-in for Static-Site Hosting of the bucket: `<dir>/` serves
 * `<dir>/index.html`, a slash-less directory redirects to `<dir>/`, unknown
 * keys answer 404 with the error document (or `missing`), paths in
 * `forbidden` answer 403 with it, and every object carries the metadata of
 * the upload plan.
 */
function fakeBucket(
  options: {
    spaFallback?: boolean;
    plainType?: boolean;
    missing?: Answer;
    forbidden?: readonly string[];
  } = {},
): Fetch {
  const respond = (
    key: string,
    status: number,
    override: Omit<Answer, "status"> = {},
  ) => {
    const meta = objectMeta(key);
    return new Response(override.body ?? readFileSync(join(dist, key)), {
      status,
      headers: {
        "content-type":
          override.contentType ??
          (options.plainType ? "application/octet-stream" : meta.contentType),
        "cache-control": meta.cacheControl,
      },
    });
  };
  const missing = options.missing ?? { status: 404 };
  return async (url) => {
    const { protocol, pathname } = new URL(url);
    if (protocol === "http:") {
      return new Response(null, {
        status: 301,
        headers: { location: url.replace(/^http:/, "https:") },
      });
    }
    if (options.forbidden?.includes(pathname)) {
      return respond(ERROR_DOCUMENT, 403);
    }
    let key = decodeURIComponent(pathname).slice(1);
    if (key === "" || key.endsWith("/")) key += INDEX_DOCUMENT;
    const file = join(dist, key);
    if (existsSync(file) && statSync(file).isFile()) return respond(key, 200);
    if (existsSync(join(file, INDEX_DOCUMENT))) {
      return new Response(null, {
        status: 302,
        headers: { location: `${pathname}/` },
      });
    }
    return options.spaFallback
      ? respond(INDEX_DOCUMENT, 200)
      : respond(ERROR_DOCUMENT, missing.status, missing);
  };
}

const MISSING = /smoke-missing/;

describe("smoke checks", () => {
  it("pass on a bucket that serves the plan", async () => {
    const checks = await smoke("https://staging.test/", fakeBucket());
    expect(checks.filter((c) => c.outcome !== "pass")).toEqual([]);
    expect(checks.length).toBeGreaterThan(20);
    const missing = checks.filter((c) => MISSING.test(c.name));
    expect(missing.map((c) => c.detail)).toEqual(
      Array(4).fill("404 with the site 404 page"),
    );
  });

  it("warn, not fail, when unknown paths answer 403 with the site 404 page (VK Cloud)", async () => {
    const checks = await smoke(
      "https://staging.test",
      fakeBucket({ missing: { status: 403 } }),
    );
    const notPassed = checks.filter((c) => c.outcome !== "pass");
    expect(notPassed).toHaveLength(4);
    for (const check of notPassed) {
      expect(check.outcome).toBe("warn");
      expect(check.name).toMatch(MISSING);
      expect(check.detail).toBe(VK_403_NOTE);
    }
    expect(count(checks).fail).toBe(0);
  });

  it.each([
    [
      "403 with the provider's XML error",
      {
        status: 403,
        contentType: "application/xml",
        body: '<?xml version="1.0"?><Error><Code>AccessDenied</Code></Error>',
      },
    ],
    [
      "403 with someone else's HTML",
      {
        status: 403,
        contentType: "text/html; charset=utf-8",
        body: "<html><body><h1>403 Forbidden</h1></body></html>",
      },
    ],
    [
      "403 with HTML that has only one marker",
      {
        status: 403,
        contentType: "text/html; charset=utf-8",
        body: '<html><body><div data-not-found="en">Gone</div></body></html>',
      },
    ],
    [
      "404 with someone else's HTML",
      {
        status: 404,
        contentType: "text/html",
        body: "<html><body><h1>Not Found</h1></body></html>",
      },
    ],
    [
      "404 with the site page as text/plain",
      { status: 404, contentType: "text/plain; charset=utf-8" },
    ],
    [
      "403 with the site page as application/octet-stream",
      { status: 403, contentType: "application/octet-stream" },
    ],
    ["401 with the site page", { status: 401 }],
    ["410 with the site page", { status: 410 }],
    ["500 with the site page", { status: 500 }],
    ["302 with the site page", { status: 302 }],
  ] satisfies [string, Answer][])(
    "fail when unknown paths answer %s",
    async (_, missing) => {
      const checks = await smoke(
        "https://staging.test",
        fakeBucket({ missing }),
      );
      const notPassed = checks.filter((c) => c.outcome !== "pass");
      expect(notPassed.map((c) => c.outcome)).toEqual(Array(4).fill("fail"));
      for (const check of notPassed) expect(check.name).toMatch(MISSING);
    },
  );

  it("keep 403 a failure for existing pages and assets", async () => {
    const css =
      readFileSync(join(dist, INDEX_DOCUMENT), "utf8").match(
        /\/_astro\/[^"'\s,?#]+\.css/,
      )?.[0] ?? "";
    expect(css).not.toBe("");
    const forbidden = ["/ru/talentforge/", css, "/favicon.svg", "/robots.txt"];
    const checks = await smoke(
      "https://staging.test",
      fakeBucket({ missing: { status: 403 }, forbidden }),
    );
    const failed = checks.filter((c) => c.outcome === "fail");
    expect(failed.map((c) => c.name)).toEqual(
      expect.arrayContaining(forbidden.map((path) => `GET ${path}`)),
    );
    for (const check of failed) expect(check.name).not.toMatch(MISSING);
    for (const check of checks.filter((c) => c.outcome === "warn")) {
      expect(check.name).toMatch(MISSING);
    }
  });

  it("fail when unknown paths fall back to 200", async () => {
    const checks = await smoke(
      "https://staging.test",
      fakeBucket({ spaFallback: true }),
    );
    const failed = checks.filter((c) => c.outcome === "fail");
    expect(failed).toHaveLength(4);
    for (const check of failed) expect(check.name).toContain("smoke-missing");
  });

  it("fail when the bucket serves a wrong Content-Type", async () => {
    const checks = await smoke(
      "https://staging.test",
      fakeBucket({ plainType: true }),
    );
    const wrongType = checks.filter(
      (c) => c.outcome === "fail" && c.detail.includes("content-type"),
    );
    expect(wrongType.length).toBeGreaterThan(10);
  });
});

describe("missing-path classification", () => {
  const site = () => readFileSync(join(dist, ERROR_DOCUMENT), "utf8");

  it.each([
    [404, "text/html; charset=utf-8", "pass"],
    [404, "TEXT/HTML", "pass"],
    [403, "text/html; charset=utf-8", "warn"],
    [403, "text/html", "warn"],
    [200, "text/html; charset=utf-8", "fail"],
    [403, "", "fail"],
    [403, "text/plain", "fail"],
    [404, "application/xhtml+xml", "fail"],
    [400, "text/html; charset=utf-8", "fail"],
    [503, "text/html; charset=utf-8", "fail"],
  ] as const)("%i, %s with the site page → %s", (status, type, outcome) => {
    expect(classifyMissing(status, type, site()).outcome).toBe(outcome);
  });

  it("names the VK Cloud limitation on 403 and the problems on a failure", () => {
    expect(classifyMissing(403, "text/html", site())).toEqual({
      outcome: "warn",
      detail: VK_403_NOTE,
    });
    const { detail } = classifyMissing(200, "text/plain", "<p>home</p>");
    expect(detail).toMatch(
      /^status 200, content-type "text\/plain", not the site 404 page;/,
    );
  });
});

describe("smoke report", () => {
  it("lists WARN rows with totals, and only FAIL counts as a failure", () => {
    const checks = [
      { outcome: "pass", name: "GET /", detail: "200" },
      { outcome: "warn", name: "GET /smoke-missing-x/", detail: VK_403_NOTE },
      { outcome: "warn", name: "http → https", detail: "200" },
    ] as const;
    const text = report("https://staging.test", checks);
    expect(text).toContain("**1 PASS, 2 WARN, 0 FAIL**");
    expect(text).toContain(`| WARN | GET /smoke-missing-x/ | ${VK_403_NOTE} |`);
    expect(count(checks)).toEqual({ pass: 1, warn: 2, fail: 0 });
  });

  it("is not muted in the workflow: a FAIL still fails the deploy job", () => {
    const workflow = read(".github/workflows/deploy-vk-cloud.yml");
    expect(workflow).toContain("run: node scripts/deploy/smoke.ts");
    expect(workflow).not.toMatch(/continue-on-error|\|\|\s*true/);
  });
});
