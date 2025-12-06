/**
 * API Response Cache Utility
 * Provides intelligent caching for API responses to reduce redundant requests
 */

export interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  url: string;
}

// In-memory cache storage
const responseCache = new Map<string, CacheEntry>();

/**
 * Generate a cache key from URL and API key
 * This ensures different API keys get different cache entries
 */
export function generateCacheKey(url: string, apiKey?: string, apiKeyHeader?: string): string {
  try {
    const urlObj = new URL(url);
    // Sort query parameters for consistent keys
    const sortedParams = Array.from(urlObj.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
    // Include both apiKey and apiKeyHeader in cache key for uniqueness
    const keySuffix = apiKey ? `&_key=${apiKey.substring(0, 8)}` : '';
    const headerSuffix = apiKeyHeader ? `&_header=${apiKeyHeader}` : '';
    const key = `${baseUrl}?${sortedParams}${keySuffix}${headerSuffix}`;
    return key;
  } catch {
    // If URL parsing fails, use URL as-is
    const keySuffix = apiKey ? `_key_${apiKey.substring(0, 8)}` : '';
    const headerSuffix = apiKeyHeader ? `_header_${apiKeyHeader}` : '';
    return `${url}${keySuffix}${headerSuffix}`;
  }
}

/**
 * Get cached data if it exists and is not expired
 */
export function getCachedData(key: string): CacheEntry | null {
  const entry = responseCache.get(key);
  
  if (!entry) {
    return null; // Cache miss
  }
  
  const now = Date.now();
  
  // Check if expired
  if (now >= entry.expiresAt) {
    // Remove expired entry
    responseCache.delete(key);
    return null; // Cache expired
  }
  
  return entry; // Cache hit
}

/**
 * Store data in cache with TTL
 */
export function setCachedData(
  key: string,
  data: any,
  ttlSeconds: number,
  url: string
): void {
  const now = Date.now();
  const expiresAt = now + (ttlSeconds * 1000);
  
  const entry: CacheEntry = {
    data,
    timestamp: now,
    expiresAt,
    url,
  };
  
  responseCache.set(key, entry);
}

/**
 * Remove entry from cache
 */
export function invalidateCache(key: string): void {
  responseCache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  responseCache.clear();
}

/**
 * Clear cache entries for a specific URL pattern
 */
export function clearCacheByUrlPattern(urlPattern: string): void {
  const keysToDelete: string[] = [];
  
  for (const [key, entry] of responseCache.entries()) {
    if (entry.url.includes(urlPattern)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => responseCache.delete(key));
}

/**
 * Clean up expired cache entries
 * Should be called periodically to free memory
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, entry] of responseCache.entries()) {
    if (now >= entry.expiresAt) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => responseCache.delete(key));
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  expiredEntries: number;
  validEntries: number;
} {
  const now = Date.now();
  let expiredCount = 0;
  let validCount = 0;
  
  for (const entry of responseCache.values()) {
    if (now >= entry.expiresAt) {
      expiredCount++;
    } else {
      validCount++;
    }
  }
  
  return {
    totalEntries: responseCache.size,
    expiredEntries: expiredCount,
    validEntries: validCount,
  };
}

/**
 * Get cache age in seconds for a given key
 */
export function getCacheAge(key: string): number | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now >= entry.expiresAt) return null; // Expired
  
  return Math.floor((now - entry.timestamp) / 1000);
}

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupExpiredCache();
  }, 5 * 60 * 1000);
}


