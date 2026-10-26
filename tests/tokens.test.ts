import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BREAKPOINTS } from "../src/styles/breakpoints";

const css = readFileSync(
  new URL("../src/styles/tokens.css", import.meta.url),
  "utf8",
);

/** Custom properties declared in the top-level `:root` block. */
function rootTokens(source: string): Map<string, string> {
  const block = /:root\s*{([^}]*)}/.exec(source)?.[1] ?? "";
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value.trim());
  }
  return tokens;
}

const tokens = rootTokens(css);

/** Approved v3.2 palette ("Design System & Components", section 01). */
const V32_PALETTE = {
  "--color-bg": "#141210",
  "--color-bg-sunken": "#0f0e0d",
  "--color-surface": "#1e1b18",
  "--color-surface-raised": "#28241f",
  "--color-border": "#3a342d",
  "--color-divider": "#2a2622",
  "--color-text": "#f2ece2",
  "--color-text-muted": "#cfc7ba",
  "--color-text-subtle": "#9a9184",
  "--color-brand-bronze": "#c29a62",
  "--color-brand-steel": "#9aa8ae",
  "--color-tf-accent": "#e6715b",
  "--color-tf-accent-2": "#fbb86d",
  "--color-fj-accent": "#c5a76a",
  "--color-fj-action": "#f1e3c0",
  "--color-fj-highlight": "#e9cf94",
  "--color-status-available": "#7cd591",
  "--color-status-testing": "#fbb86d",
  "--color-status-prep": "#6f685e",
} as const;

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

describe("v3.2 semantic tokens", () => {
  it.each(Object.entries(V32_PALETTE))("%s = %s", (name, hex) => {
    expect(tokens.get(name)?.toLowerCase()).toBe(hex);
  });

  it("declares typography, spacing, layout and shape tokens", () => {
    for (const name of [
      "--font-sans",
      "--font-mono",
      "--font-size-h1-home",
      "--font-size-h1-product",
      "--font-size-body",
      "--space-1",
      "--space-10",
      "--layout-container-max",
      "--layout-gutter",
      "--cut-plate",
      "--cut-control",
      "--size-target-min",
      "--focus-ring-width",
    ]) {
      expect(tokens.has(name), name).toBe(true);
    }
  });

  it.each([
    ["--color-text", 4.5],
    ["--color-text-muted", 4.5],
    ["--color-text-subtle", 4.5],
    ["--color-brand-bronze", 4.5],
  ] as const)("%s meets WCAG AA (%s:1) on --color-bg", (name, min) => {
    expect(
      contrast(V32_PALETTE[name], V32_PALETTE["--color-bg"]),
    ).toBeGreaterThanOrEqual(min);
  });

  it("button text pairs meet WCAG AA", () => {
    expect(contrast("#141210", "#f2ece2")).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(tokens.get("--color-fj-action-text") ?? "", "#f1e3c0"),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("media queries use the documented breakpoints only", () => {
    const used = [...css.matchAll(/max-width:\s*(\d+)px/g)].map((m) =>
      Number(m[1]),
    );
    const allowed: number[] = Object.values(BREAKPOINTS);
    for (const width of used) expect(allowed).toContain(width);
  });
});
