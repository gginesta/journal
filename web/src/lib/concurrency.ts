// Bounded-concurrency map shared by the sync route (per-entry writes) and the
// reminder dispatcher (web-push sends): results keep input order, and every
// item runs even when earlier ones reject inside `task` (tasks are expected to
// catch their own errors and return an outcome).
export async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
