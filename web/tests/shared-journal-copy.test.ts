import { describe, expect, it } from "vitest";
import { inferMemoryFocus, littleDetailsNudgeCopy, sharedJournalCopy } from "../src/lib/shared-journal-copy";
import type { PersonTag, Workspace } from "../src/types/journal";

const workspace = (kind: Workspace["kind"] = "personal"): Workspace => ({
  id: "workspace-1",
  name: kind === "household" ? "Family journal" : "My journal",
  kind,
  role: "owner"
});

const person = (name: string): PersonTag => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  workspaceId: "workspace-1",
  name,
  color: "#c7455c",
  sortOrder: 0,
  isDefault: false
});

describe("shared journal copy", () => {
  it("recognizes family contexts without making solo users feel excluded", () => {
    expect(inferMemoryFocus(workspace("household"), [person("Me")])).toBe("family");
    expect(inferMemoryFocus(workspace("personal"), [person("Kid 1")])).toBe("family");
    expect(inferMemoryFocus(workspace("personal"), [person("Me")])).toBe("solo");
  });

  it("keeps little details copy path-aware", () => {
    expect(littleDetailsNudgeCopy("family").prompt).toContain("funny pronunciation");
    expect(littleDetailsNudgeCopy("solo").prompt).toContain("this season");
  });

  it("frames shared journals warmly", () => {
    expect(sharedJournalCopy(workspace("household"), [person("Partner")]).title).toBe("A private family journal");
    expect(sharedJournalCopy(workspace("personal"), [person("Me")]).body).toContain("invite someone later");
  });
});
