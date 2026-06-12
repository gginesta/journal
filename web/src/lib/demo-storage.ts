// Demo mode keeps the whole journal (including photo data URLs) in
// localStorage, so the browser quota is a real failure mode we must absorb.
export const demoStorageFullMessage =
  "Your browser's demo storage is full, so the latest changes may not survive a refresh. Removing a photo or an older demo memory frees up space.";

export type DemoStorageWriteResult = { ok: true } | { ok: false; message: string };

export function writeDemoStateToStorage(
  storage: Pick<Storage, "setItem">,
  key: string,
  serialized: string
): DemoStorageWriteResult {
  try {
    storage.setItem(key, serialized);
    return { ok: true };
  } catch {
    return { ok: false, message: demoStorageFullMessage };
  }
}
