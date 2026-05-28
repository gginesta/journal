import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "../src/lib/auth-redirect";

describe("safeRedirectPath", () => {
  const baseUrl = "https://journal.example";

  it("keeps relative in-app redirect paths", () => {
    expect(safeRedirectPath("/app?tab=memories#entry", baseUrl)).toBe("/app?tab=memories#entry");
  });

  it("falls back for external redirect targets", () => {
    expect(safeRedirectPath("https://attacker.example", baseUrl)).toBe("/app");
    expect(safeRedirectPath("//attacker.example/path", baseUrl)).toBe("/app");
    expect(safeRedirectPath("app", baseUrl)).toBe("/app");
    expect(safeRedirectPath(null, baseUrl)).toBe("/app");
  });
});
