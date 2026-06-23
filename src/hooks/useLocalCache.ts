import { useCallback } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const CACHE_PREFIX = 'wolftoon_cache_';
const DEFAULT_TTL = 1000 * 60 * 30; // 30 minutes

export const useLocalCache = <T>(key: string, ttl: number = DEFAULT_TTL) => {
  const cacheKey = `${CACHE_PREFIX}${key}`;

  const get = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed: CacheItem<T> = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > ttl;

      if (isExpired) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  }, [cacheKey, ttl]);

  const set = useCallback((data: T): void => {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (e) {
      // Storage full or unavailable, clear old cache
      clearOldCache();
    }
  }, [cacheKey]);

  const remove = useCallback((): void => {
    localStorage.removeItem(cacheKey);
  }, [cacheKey]);

  return { get, set, remove };
};

// Utility to clear old cache entries
export const clearOldCache = () => {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  
  cacheKeys.forEach(key => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Remove if older than 2 hours
        if (Date.now() - parsed.timestamp > 1000 * 60 * 60 * 2) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      localStorage.removeItem(key);
    }
  });
};

// Hook for recently visited titles
export const useRecentlyVisited = () => {
  const STORAGE_KEY = 'wolftoon_recently_visited';
  const MAX_ITEMS = 20;

  const getVisited = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const addVisited = useCallback((titleId: string): void => {
    try {
      const visited = getVisited();
      const filtered = visited.filter(id => id !== titleId);
      const updated = [titleId, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }, [getVisited]);

  return { getVisited, addVisited };
};
