import { describe, expect, it } from "vitest";
import { demoStorageFullMessage, writeDemoStateToStorage } from "../src/lib/demo-storage";

function storageThatThrows(): Pick<Storage, "setItem"> {
  return {
    setItem() {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
  };
}

describe("writeDemoStateToStorage", () => {
  it("writes the serialized state under the given key", () => {
    const written: Record<string, string> = {};
    const result = writeDemoStateToStorage(
      {
        setItem(key, value) {
          written[key] = value;
        }
      },
      "demo-key",
      "{\"entries\":[]}"
    );

    expect(result).toEqual({ ok: true });
    expect(written["demo-key"]).toBe("{\"entries\":[]}");
  });

  it("absorbs quota errors and reports a gentle message instead of throwing", () => {
    const result = writeDemoStateToStorage(storageThatThrows(), "demo-key", "x");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(demoStorageFullMessage);
    }
  });
});
