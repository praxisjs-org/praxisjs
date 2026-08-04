import { isServerRenderPass } from "./server-mode";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const _cache = new Map<string, CacheEntry>();
const _inflight = new Map<string, Promise<unknown>>();
const _registry = new Map<string, Set<() => void>>();
const _pendingResources = new Set<Promise<unknown>>();

export function getCacheEntry(key: string): CacheEntry | undefined {
  return _cache.get(key);
}

export function setCacheEntry(key: string, data: unknown): void {
  _cache.set(key, { data, timestamp: Date.now() });
}

export function deleteCacheEntry(key: string): void {
  _cache.delete(key);
}

export function getInflight(key: string): Promise<unknown> | undefined {
  return _inflight.get(key);
}

export function setInflight(key: string, promise: Promise<unknown>): void {
  _inflight.set(key, promise);
}

export function deleteInflight(key: string): void {
  _inflight.delete(key);
}

export function registerResource(key: string, refetch: () => void): void {
  let set = _registry.get(key);
  if (!set) {
    set = new Set();
    _registry.set(key, set);
  }
  set.add(refetch);
}

export function unregisterResource(key: string, refetch: () => void): void {
  _registry.get(key)?.delete(refetch);
}

/**
 * Clears the cache entry and in-flight request for `key`, then triggers
 * every active resource registered under that key to refetch.
 */
export function invalidateResource(key: string): void {
  deleteCacheEntry(key);
  deleteInflight(key);
  _registry.get(key)?.forEach((fn) => { fn(); });
}

/**
 * Registers `promise` as pending while a server render pass is active (no-op otherwise,
 * so client-side resource() calls never pay this cost). Self-removes on settle.
 */
export function trackPendingResource(promise: Promise<unknown>): void {
  if (!isServerRenderPass()) return;
  _pendingResources.add(promise);
  const cleanup = (): void => { _pendingResources.delete(promise); };
  promise.then(cleanup, cleanup);
}

/** Snapshot of currently in-flight resource promises tracked during a server render pass. */
export function getPendingResources(): ReadonlySet<Promise<unknown>> {
  return _pendingResources;
}

/** Resets all cache state. Intended for use in tests only. */
export function _clearCache(): void {
  _cache.clear();
  _inflight.clear();
  _registry.clear();
  _pendingResources.clear();
}
