/**
 * Simple in-memory TTL cache for client-side data.
 *
 * Used to avoid re-fetching expensive API responses (opportunities list,
 * profile) when the user navigates between pages. Cache is lost on full
 * page reload, which is what we want — forces a refresh after explicit
 * navigation.
 *
 * NOT suitable for mutation-sensitive data without manual invalidation.
 * Call `invalidate(key)` after any action that would change the cached
 * response.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Return cached value if fresh, otherwise invoke the loader, cache, and
 * return the fresh result.
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = 60_000,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/** Drop one key (or all keys matching a prefix) from the cache. */
export function invalidate(keyOrPrefix: string, isPrefix = false) {
  if (!isPrefix) {
    store.delete(keyOrPrefix);
    return;
  }
  for (const k of store.keys()) {
    if (k.startsWith(keyOrPrefix)) store.delete(k);
  }
}

/** Drop everything. Call on signOut. */
export function clearCache() {
  store.clear();
}
