import { describe, expect, it } from "vitest";
import { authEmailCopy, magicLinkSentCopy, supabaseMagicLinkTemplate } from "../src/lib/auth-email-copy";

describe("auth email copy", () => {
  it("names the product in the magic-link subject", () => {
    expect(authEmailCopy.subject).toContain("Photo Gratitude Journal");
  });

  it("personalizes the sent state without leaking into auth configuration", () => {
    expect(magicLinkSentCopy("steph@example.com").body).toContain("steph@example.com");
    expect(magicLinkSentCopy("").body).toContain("secure Photo Gratitude Journal sign-in link");
  });

  it("keeps Supabase template variables intact", () => {
    const template = supabaseMagicLinkTemplate("https://journal.example.com");
    expect(template.html).toContain("{{ .ConfirmationURL }}");
    expect(template.html).toContain("{{ .Email }}");
  });
});
