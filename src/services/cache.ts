interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_PREFIX = "cineboard.cache.";
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached data if it exists and hasn't expired.
 */
export function getCached<T>(key: string, maxAgeMs: number): T | null {
  const fullKey = CACHE_PREFIX + key;

  // Check memory cache first
  const memEntry = memoryCache.get(fullKey);
  if (memEntry && Date.now() - memEntry.timestamp < maxAgeMs) {
    return memEntry.data as T;
  }

  // Fall back to localStorage
  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > maxAgeMs) {
      localStorage.removeItem(fullKey);
      return null;
    }

    // Re-populate memory cache
    memoryCache.set(fullKey, entry);
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Save data to cache (memory + localStorage).
 */
export function setCached<T>(key: string, data: T): void {
  const fullKey = CACHE_PREFIX + key;
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };

  memoryCache.set(fullKey, entry);

  try {
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch (err) {
    // localStorage might be full - clear old cache and try again
    console.warn("Cache write failed, clearing old entries", err);
    clearOldCache();
    try {
      localStorage.setItem(fullKey, JSON.stringify(entry));
    } catch {
      // give up silently
    }
  }
}

/**
 * Remove a single cache entry.
 */
export function removeCached(key: string): void {
  const fullKey = CACHE_PREFIX + key;
  memoryCache.delete(fullKey);
  try {
    localStorage.removeItem(fullKey);
  } catch {
    // ignore
  }
}

/**
 * Clear all CineBoard cache entries.
 */
export function clearAllCache(): void {
  memoryCache.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Clear entries older than 7 days to make room for new ones.
 */
function clearOldCache(): void {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CACHE_PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const entry: CacheEntry<unknown> = JSON.parse(raw);
        if (entry.timestamp < cutoff) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      memoryCache.delete(k);
      localStorage.removeItem(k);
    });
  } catch {
    // ignore
  }
}

/**
 * Get cache stats for display in admin UI.
 */
export function getCacheStats(): {
  entries: number;
  approximateSize: string;
} {
  let entries = 0;
  let totalBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        entries++;
        const value = localStorage.getItem(key) ?? "";
        totalBytes += key.length + value.length;
      }
    }
  } catch {
    // ignore
  }

  let sizeStr = `${totalBytes} B`;
  if (totalBytes > 1024) sizeStr = `${(totalBytes / 1024).toFixed(1)} KB`;
  if (totalBytes > 1024 * 1024) sizeStr = `${(totalBytes / 1024 / 1024).toFixed(2)} MB`;

  return { entries, approximateSize: sizeStr };
}