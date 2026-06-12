// Person-tag chips show user-chosen colors as text on a pale tint of the same
// color. Arbitrary palette colors routinely fail WCAG AA there, so the text
// color is darkened just enough to reach the AA contrast ratio against the
// chip's own tinted background.

const CHIP_TINT_ALPHA = 0.12;
// Worst-case base the chips can sit on: journal.raised #fbf2e8 (darker than
// journal.surface), plus a small margin over the 4.5:1 AA threshold.
const SURFACE = { r: 251, g: 242, b: 232 };
const AA_RATIO = 4.6;
const FALLBACK = "#5f574d"; // deepened warm gray, passes on any chip tint

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function luminance({ r, g, b }: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function blendOverSurface(color: Rgb, alpha: number): Rgb {
  return {
    r: color.r * alpha + SURFACE.r * (1 - alpha),
    g: color.g * alpha + SURFACE.g * (1 - alpha),
    b: color.b * alpha + SURFACE.b * (1 - alpha)
  };
}

/** Background and AA-compliant text color for a person-tag chip. */
export function tagChipStyle(colorHex: string): { backgroundColor: string; color: string } {
  const parsed = parseHex(colorHex);
  if (!parsed) {
    return { backgroundColor: `${FALLBACK}1f`, color: FALLBACK };
  }

  const tint = blendOverSurface(parsed, CHIP_TINT_ALPHA);
  let text = parsed;
  let guard = 0;
  while (contrastRatio(text, tint) < AA_RATIO && guard < 24) {
    text = { r: text.r * 0.88, g: text.g * 0.88, b: text.b * 0.88 };
    guard += 1;
  }

  return { backgroundColor: `${colorHex}1f`, color: toHex(text) };
}
