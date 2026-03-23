type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class ListingsCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private inFlight = new Map<string, Promise<T>>();
  private maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = Math.max(1, maxEntries || 1);
  }

  private evictIfNeeded() {
    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (!oldestKey) break;
      this.store.delete(oldestKey);
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // refresh recency
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number) {
    const expiresAt = Date.now() + Math.max(0, ttlMs || 0);
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    this.store.set(key, { value, expiresAt });
    this.evictIfNeeded();
  }

  async getOrCreate(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const promise = Promise.resolve()
      .then(factory)
      .then((value) => {
        if (value !== undefined) {
          this.set(key, value, ttlMs);
        }
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }
}
