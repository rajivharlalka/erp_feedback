interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Minimal in-memory TTL cache. Good enough for a single-process API proxy. */
export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMsOverride?: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + (ttlMsOverride ?? this.defaultTtlMs) });
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>, ttlMsOverride?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await fetcher();
    this.set(key, value, ttlMsOverride);
    return value;
  }
}
