/**
 * v3.2 breakpoints (max-width, CSS px). Media queries cannot read custom
 * properties, so these values are mirrored in `tokens.css` and checked by tests.
 */
export const BREAKPOINTS = {
  stackPlates: 1100,
  compactNav: 900,
  singleColumn: 600,
  narrow: 360,
} as const;

/** Widths every layout must be checked at, EN and RU. */
export const REVIEW_WIDTHS = [1440, 768, 390, 320] as const;
