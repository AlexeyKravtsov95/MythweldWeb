/**
 * Fonts are self-hosted, licensed and match the typography tokens.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const fontsCss = readFileSync(new URL("src/styles/fonts.css", root), "utf8");
const tokensCss = readFileSync(new URL("src/styles/tokens.css", root), "utf8");
const faces = [...fontsCss.matchAll(/@font-face\s*{([^}]*)}/g)].map(
  ([, body = ""]) => body,
);

describe("@font-face rules", () => {
  it("declare Geologica (Latin + Cyrillic) and JetBrains Mono", () => {
    const families = faces.map(
      (face) => /font-family:\s*"([^"]+)"/.exec(face)?.[1],
    );
    expect(families).toEqual(["Geologica", "Geologica", "JetBrains Mono"]);
  });

  it("only point at files that ship in public/fonts", () => {
    const urls = [...fontsCss.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(urls.length).toBe(faces.length);
    for (const url of urls) {
      expect(url).toMatch(/^\/fonts\/[\w/-]+\.woff2$/);
      expect(existsSync(new URL(`public${url}`, root)), url).toBe(true);
    }
  });

  it("never load from a font CDN", () => {
    expect(fontsCss).not.toMatch(/https?:|fonts\.googleapis|gstatic|@import/);
  });

  it("swap in text immediately and cover the Geologica weight range", () => {
    for (const face of faces) expect(face).toMatch(/font-display:\s*swap/);
    for (const face of faces.slice(0, 2)) {
      expect(face).toMatch(/font-weight:\s*100 900/);
    }
  });

  it("match the font tokens, with system fallbacks", () => {
    expect(tokensCss).toMatch(/--font-sans:\s*"Geologica",[^;]*sans-serif;/);
    expect(tokensCss).toMatch(
      /--font-mono:\s*"JetBrains Mono",[^;]*monospace;/,
    );
  });
});

describe.each(["geologica", "jetbrains-mono"])("public/fonts/%s", (dir) => {
  it("ships the SIL Open Font License", () => {
    const license = readFileSync(
      new URL(`public/fonts/${dir}/OFL.txt`, root),
      "utf8",
    );
    expect(license).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/);
    expect(license).toMatch(/Copyright 20\d\d The .+ Project Authors/);
  });
});

it("documents every font file in the assets manifest", () => {
  const manifest = readFileSync(
    new URL("docs/assets-manifest.md", root),
    "utf8",
  );
  for (const [, url] of fontsCss.matchAll(/url\("\/([^"]+)"\)/g)) {
    expect(manifest).toContain(`public/${url}`);
  }
});
