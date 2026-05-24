import { describe, expect, it } from "vitest";
import {
  firstMemoryCelebrationStorageKey,
  isFirstMemoryCelebrationDismissed,
  isFirstMemoryMeaningfulEntry,
  meaningfulFirstMemoryEntries,
  shouldShowFirstMemoryCelebration
} from "../src/lib/first-memory-celebration";

function entry(text = "", photoCount = 0) {
  return {
    sessions: [{
      responses: [{
        text
      }]
    }],
    photos: Array.from({ length: photoCount }, (_, index) => ({ id: `photo-${index}` }))
  };
}

describe("first memory celebration helpers", () => {
  it("treats text-only, photo-only, and mixed entries as meaningful", () => {
    expect(isFirstMemoryMeaningfulEntry(entry("A quiet happy thing"))).toBe(true);
    expect(isFirstMemoryMeaningfulEntry(entry("   ", 1))).toBe(true);
    expect(isFirstMemoryMeaningfulEntry(entry("A tiny note", 1))).toBe(true);
    expect(isFirstMemoryMeaningfulEntry(entry("   "))).toBe(false);
  });

  it("shows only for the first meaningful entry while not dismissed", () => {
    expect(shouldShowFirstMemoryCelebration({ entries: [entry("First")] })).toBe(true);
    expect(shouldShowFirstMemoryCelebration({ entries: [entry("First"), entry("Second")] })).toBe(false);
    expect(shouldShowFirstMemoryCelebration({ entries: [entry("   ")] })).toBe(false);
    expect(shouldShowFirstMemoryCelebration({ entries: [entry("", 1)], dismissed: true })).toBe(false);
    expect(shouldShowFirstMemoryCelebration({ entries: [entry("", 1)], dismissalStorageValue: "true" })).toBe(false);
  });

  it("keeps dismissal and storage key behavior pure for integration code", () => {
    expect(isFirstMemoryCelebrationDismissed(false, null)).toBe(false);
    expect(isFirstMemoryCelebrationDismissed(null, "true")).toBe(true);
    expect(firstMemoryCelebrationStorageKey()).toBe("photo-gratitude-journal:first-memory-celebration-dismissed");
    expect(firstMemoryCelebrationStorageKey(" workspace-1 ")).toBe(
      "photo-gratitude-journal:first-memory-celebration-dismissed:workspace-1"
    );
  });

  it("returns the meaningful entries without mutating the input list", () => {
    const entries = [entry(""), entry("Hello"), entry("", 1)];

    expect(meaningfulFirstMemoryEntries(entries)).toHaveLength(2);
    expect(entries).toHaveLength(3);
  });
});
