// lib/tokens.js
//
// The JavaScript side of the colour tokens in app/globals.css.
//
//   C    — CSS variable references, for anything that ends up in a style:
//          inline styles, styled-jsx and <style> template strings, SVG
//          fill/stroke props. Use these everywhere by default.
//   rgba — translucent versions, e.g. rgba("navyDark", 0.55).
//   HEX  — the raw values, ONLY for code that can't read CSS variables:
//          Mapbox paint properties, canvas drawing, and colour maths.
//
// globals.css is the source of truth. scripts/check-colors.mjs checks that
// HEX matches it, and fails if a hex or rgb() value appears anywhere else
// in app/, components/ or lib/ (the named palettes in lib/palettes.js
// excepted).

const v = (name) => `var(--color-${name})`;

export const C = {
  // Brand
  navyDark: v("navy-dark"),
  navyDeeper: v("navy-deeper"),
  navyMid: v("navy-mid"),
  navyLight: v("navy-light"),
  terracotta: v("terracotta"), // 500: icons, focus, borders, large text, art
  terracotta600: v("terracotta-600"), // button and badge fills
  terracotta700: v("terracotta-700"), // small text, hover, pressed
  terracottaDark: v("terracotta-700"), // older name for the hover shade
  gold: v("gold"),
  slateBlue: v("slate-blue"),
  cream: v("cream"),
  white: v("white"),
  black: v("black"),

  // Text
  ink: v("ink"),
  slate: v("slate"),
  muted: v("muted"),
  ghost: v("ghost"),

  // Borders
  border: v("border"),
  borderStrong: v("border-strong"),
  borderField: v("border-field"),

  // Status
  success: v("success"),
  successLight: v("success-light"),
  successBg: v("success-light"),
  successText: v("success-text"),
  error: v("error"),
  errorLight: v("error-light"),
  errorBg: v("error-light"),
  errorText: v("error-text"),
  warning: v("warning"),
  warningLight: v("warning-light"),
  warningBg: v("warning-light"),
  warningText: v("warning-text"),
  caution: v("caution"),
  cautionLight: v("caution-light"),
  cautionText: v("caution-text"),
  info: v("info"),
  infoLight: v("info-light"),
  infoText: v("info-text"),

  // Status box borders (same tint as the .badge-* borders)
  errorBorder: "rgb(var(--color-error-rgb) / 0.24)",
  successBorder: "rgb(var(--color-success-text-rgb) / 0.22)",
  cautionBorder: "rgb(var(--color-caution-rgb) / 0.4)",

  // Badge surfaces
  badgeNavyBg: v("badge-navy-bg"),
  badgeNeutralBg: v("badge-neutral-bg"),
};

// Tokens that have an RGB channel variable in globals.css.
const RGB_NAMES = {
  navyDark: "navy-dark",
  navyDeeper: "navy-deeper",
  navyMid: "navy-mid",
  terracotta: "terracotta",
  gold: "gold",
  slateBlue: "slate-blue",
  cream: "cream",
  white: "white",
  black: "black",
  slate: "slate",
  muted: "muted",
  border: "border",
  success: "success",
  successText: "success-text",
  error: "error",
  warningText: "warning-text",
  caution: "caution",
  cautionText: "caution-text",
};

/** Translucent token colour: rgba("navyDark", 0.55) → rgb(var(--color-navy-dark-rgb) / 0.55) */
export function rgba(token, alpha) {
  const name = RGB_NAMES[token];
  if (!name) throw new Error(`rgba(): no RGB channel token for "${token}"`);
  return `rgb(var(--color-${name}-rgb) / ${alpha})`;
}

/** A token as a URL-encoded hex, for colours inside SVG data URIs, which
 *  can't read CSS variables: stroke='${svgHex("muted")}' → stroke='%23656d78' */
export const svgHex = (token) => "%23" + HEX[token].slice(1);

/** A token as an rgba() string built from HEX, for SVG data URIs and other
 *  places that can't read CSS variables: rgbaHex("navyDark", 0.5) */
export function rgbaHex(token, alpha) {
  const h = HEX[token];
  const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${n.join(",")},${alpha})`;
}

// Raw values. Keep in step with globals.css (the colour check enforces it).
export const HEX = {
  navyDark: "#172531",
  navyDeeper: "#060e16",
  navyMid: "#2c4657",
  navyLight: "#4d6473",
  terracotta: "#cf5c36",
  terracotta600: "#c4542f",
  terracotta700: "#b64e2b",
  gold: "#efc88b",
  slateBlue: "#5a85a9",
  cream: "#f5f0e8",
  white: "#ffffff",
  black: "#000000",
  ink: "#1a1a1a",
  slate: "#4b5563",
  muted: "#656d78",
  ghost: "#d1d5db",
  border: "#ede8e0",
  borderStrong: "#d1c9bd",
  borderField: "#969089",
  success: "#29794d",
  successLight: "#edfaf3",
  successText: "#1a6641",
  error: "#c73838",
  errorLight: "#fceaea",
  errorText: "#7a1f1f",
  warning: "#af5109",
  warningLight: "#fef3eb",
  warningText: "#8b3a1e",
  caution: "#d9a21b",
  cautionLight: "#fef8ec",
  cautionText: "#8b6914",
  info: "#1d4ed8",
  infoLight: "#eff6ff",
  infoText: "#1e3a8a",
  badgeNavyBg: "#ebf0f5",
  badgeNeutralBg: "#f3f4f6",
};
