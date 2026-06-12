import { describe, expect, it } from "vitest";
import { contrastRatio, tagChipStyle } from "../src/lib/tag-colors";

function parse(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

const surface = parse("#fffdf8");

function tintOf(hex: string) {
  const c = parse(hex);
  const a = 0.12;
  return {
    r: c.r * a + surface.r * (1 - a),
    g: c.g * a + surface.g * (1 - a),
    b: c.b * a + surface.b * (1 - a)
  };
}

describe("tagChipStyle", () => {
  it("keeps the tinted background derived from the original color", () => {
    expect(tagChipStyle("#5B8DEF").backgroundColor).toBe("#5B8DEF1f");
  });

  it("produces AA-compliant text for every seeded palette color", () => {
    const palette = ["#5B8DEF", "#F4A261", "#2A9D8F", "#E76F51", "#7C6F64", "#8aa29e", "#c7455c"];
    for (const hex of palette) {
      const { color } = tagChipStyle(hex);
      expect(contrastRatio(parse(color), tintOf(hex))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("leaves already-dark colors essentially unchanged", () => {
    expect(tagChipStyle("#212128").color).toBe("#212128");
  });

  it("falls back safely for malformed colors", () => {
    const { color, backgroundColor } = tagChipStyle("not-a-color");
    expect(color).toBe("#5f574d");
    expect(backgroundColor).toBe("#5f574d1f");
  });
});
