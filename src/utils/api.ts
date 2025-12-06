/**
 * API Utilities
 * 
 * Functions for fetching data from external APIs, handling CORS,
 * rate limiting, caching, and extracting fields from JSON responses.
 * Includes automatic fallback to proxy route for CORS issues.
 */

import { ApiResponse, FieldMapping } from '@/types';
import {
  generateCacheKey,
  getCachedData,
  setCachedData,
  invalidateCache,
  getCacheAge,
} from './cache';

// In-memory rate limit tracking by API origin
// Tracks when rate limits expire to prevent unnecessary requests
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks if a URL is currently rate limited
 * @param url - API URL to check
 * @returns Object indicating if rate limited and when it expires
 */
function checkRateLimit(url: string): { limited: boolean; resetTime?: number } {
  const now = Date.now();
  const cacheKey = new URL(url).origin;
  const limit = rateLimitCache.get(cacheKey);

  if (limit && now < limit.resetTime) {
    return { limited: true, resetTime: limit.resetTime };
  }

  // Clean up expired entries
  if (limit && now >= limit.resetTime) {
    rateLimitCache.delete(cacheKey);
  }

  return { limited: false };
}

/**
 * Records a rate limit for a URL origin
 * @param url - API URL that was rate limited
 * @param resetTime - Timestamp when rate limit expires
 */
function recordRateLimit(url: string, resetTime: number) {
  const cacheKey = new URL(url).origin;
  rateLimitCache.set(cacheKey, {
    count: 1,
    resetTime: resetTime,
  });
}

/**
 * Fetches data from an API endpoint
 * Handles caching, rate limiting, CORS fallback, and error retry logic
 * @param url - API endpoint URL
 * @param apiKey - Optional API key for header-based authentication
 * @param apiKeyHeader - Optional header name for API key (e.g., 'x-api-key')
 * @param retryCount - Current retry attempt (for recursive retries)
 * @param maxRetries - Maximum number of retry attempts
 * @param useProxy - Whether to force use of proxy route
 * @param cacheTTL - Cache time-to-live in seconds
 * @param bypassCache - If true, bypasses cache and forces fresh fetch
 * @returns API response with data, error, timestamp, and cache info
 */
export async function fetchApiData(
  url: string,
  apiKey?: string,
  apiKeyHeader?: string,
  retryCount = 0,
  maxRetries = 3,
  useProxy = false,
  cacheTTL?: number, // Cache time-to-live in seconds
  bypassCache = false // Force refresh, bypass cache
): Promise<ApiResponse & { fromCache?: boolean; cacheAge?: number }> {
  try {
    // Check cache first (unless bypassing)
    if (!bypassCache && cacheTTL !== undefined && cacheTTL > 0) {
      const cacheKey = generateCacheKey(url, apiKey, apiKeyHeader);
      const cachedEntry = getCachedData(cacheKey);
      
      if (cachedEntry) {
        const cacheAge = getCacheAge(cacheKey);
        return {
          data: cachedEntry.data,
          timestamp: cachedEntry.timestamp,
          fromCache: true,
          cacheAge: cacheAge ?? undefined,
        };
      }
    }
    
    // Check rate limit before making request
    const rateLimitCheck = checkRateLimit(url);
    if (rateLimitCheck.limited) {
      const waitTime = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000);
      return {
        data: null,
        error: `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`,
        timestamp: Date.now(),
      };
    }

    let response: Response;
    let finalUrl = url;

    // Use Next.js API proxy for CORS issues
    if (useProxy) {
      const proxyUrl = new URL('/api/proxy', window.location.origin);
      proxyUrl.searchParams.set('url', url);
      // Only add API key params if both are provided (for header-based auth)
      if (apiKey && apiKeyHeader) {
        proxyUrl.searchParams.set('apiKey', apiKey);
        proxyUrl.searchParams.set('apiKeyHeader', apiKeyHeader);
      }
      finalUrl = proxyUrl.toString();
    }

    // Build headers object (only for direct requests, not proxy)
    const headers: Record<string, string> = {};
    
    if (!useProxy) {
      // Check if URL already contains authentication in query params (like token=, apikey=, etc.)
      // If so, don't add headers to avoid CORS issues
      const urlHasAuth = url.includes('token=') || 
                        url.includes('apikey=') || 
                        url.includes('api_key=') || 
                        url.includes('key=');
      
      // Only add API key to header if:
      // 1. Both apiKey and apiKeyHeader are provided AND non-empty
      // 2. URL doesn't already have auth in query params (to avoid CORS issues)
      if (apiKey && apiKeyHeader && apiKey.trim() && apiKeyHeader.trim() && !urlHasAuth) {
        headers[apiKeyHeader] = apiKey;
      }
    }
    
    // For GET requests, don't send Content-Type header to avoid CORS issues
    // Many APIs (like Finnhub) don't allow custom headers in CORS preflight
    response = await fetch(finalUrl, {
      method: 'GET',
      headers: !useProxy && Object.keys(headers).length > 0 ? headers : undefined,
      // Removed Content-Type header to fix CORS issues with Finnhub and other APIs
      // GET requests don't need Content-Type header
    });

    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = `HTTP error! status: ${response.status}`;
      let resetTime: number | null = null;
      let errorDetails: any = null;
      
      try {
        const errorData = await response.json();
        errorDetails = errorData;
        // Extract error message from various possible formats
        errorMessage = 
          errorData.error || 
          errorData.message || 
          errorData['Error Message'] || 
          errorData.error_message ||
          errorData.msg ||
          errorData.description ||
          (typeof errorData === 'string' ? errorData : errorMessage);
        
        // Check for rate limit reset time in response headers or body
        const retryAfter = response.headers.get('Retry-After') || errorData.retry_after || errorData.retryAfter;
        if (retryAfter) {
          resetTime = Date.now() + (parseInt(String(retryAfter)) * 1000);
        }
      } catch {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || response.statusText || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
      }

      // Handle specific error cases
      if (response.status === 429) {
        // Rate limit exceeded
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          resetTime = Date.now() + (parseInt(retryAfter) * 1000);
          recordRateLimit(url, resetTime);
        } else {
          // Default to 60 seconds if no Retry-After header
          resetTime = Date.now() + 60000;
          recordRateLimit(url, resetTime);
        }
        
        // Retry with exponential backoff if retries remaining
        if (retryCount < maxRetries && resetTime) {
          const waitTime = Math.min((resetTime - Date.now()) / 1000, 60); // Max 60 seconds
          await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
          return fetchApiData(url, apiKey, apiKeyHeader, retryCount + 1, maxRetries, useProxy, cacheTTL, bypassCache);
        }
        
        const waitTime = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
        throw new Error(`API rate limit exceeded. Please wait ${waitTime} seconds before trying again.`);
      }
      
      if (response.status === 401 || response.status === 403) {
        // Build a more helpful error message
        let specificError = errorMessage;
        
        // Check if it's a Finnhub API
        const isFinnhub = url.includes('finnhub.io');
        
        if (isFinnhub && response.status === 403) {
          specificError = `Finnhub API returned 403 Forbidden. This usually means:\n\n1. Your API key might be invalid or expired\n2. The endpoint requires a paid plan (candle data often requires a subscription)\n3. You've exceeded your API rate limit\n\nTry:\n- Verify your API key at https://finnhub.io/\n- Test with a simpler endpoint like /quote first\n- Check if your plan includes this endpoint\n\nOriginal error: ${errorMessage}`;
        } else {
          specificError = `API returned ${response.status}: ${errorMessage}\n\nPossible causes:\n- Invalid or expired API key\n- Insufficient permissions for this endpoint\n- Rate limit exceeded\n- Endpoint requires a paid subscription\n\nPlease check your API key and endpoint requirements.`;
        }
        
        throw new Error(specificError);
      }
      
      if (response.status === 400) {
        throw new Error(`Bad Request: ${errorMessage}. Check your API parameters (symbol format, parameter names, etc.).`);
      }
      
      // Retry on server errors (5xx) with exponential backoff
      if (response.status >= 500 && retryCount < maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return fetchApiData(url, apiKey, apiKeyHeader, retryCount + 1, maxRetries, useProxy, cacheTTL, bypassCache);
      }
      
      throw new Error(errorMessage);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (jsonError) {
      // If response is not JSON, try to get text
      const text = await response.text();
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }
    
    // Handle proxy response format
    if (useProxy) {
      // Proxy returns { data: ... } or { error: ... }
      if (data.error) {
        // Invalidate cache on error
        if (cacheTTL !== undefined && cacheTTL > 0) {
          const cacheKey = generateCacheKey(url, apiKey, apiKeyHeader);
          invalidateCache(cacheKey);
        }
        throw new Error(data.error || 'Proxy request failed');
      }
      if (data.data) {
        const proxyResponse: ApiResponse & { fromCache?: boolean; cacheAge?: number } = {
          data: data.data,
          timestamp: Date.now(),
        };
        
        // Store in cache if TTL is provided
        if (cacheTTL !== undefined && cacheTTL > 0) {
          const cacheKey = generateCacheKey(url, apiKey, apiKeyHeader);
          setCachedData(cacheKey, data.data, cacheTTL, url);
        }
        
        return proxyResponse;
      }
      // If proxy returns data directly (shouldn't happen, but handle it)
      const directResponse: ApiResponse & { fromCache?: boolean; cacheAge?: number } = {
        data: data,
        timestamp: Date.now(),
      };
      
      // Store in cache if TTL is provided
      if (cacheTTL !== undefined && cacheTTL > 0) {
        const cacheKey = generateCacheKey(url, apiKey, apiKeyHeader);
        setCachedData(cacheKey, data, cacheTTL, url);
      }
      
      return directResponse;
    }
    
    // Check for API-specific error responses
    // Alpha Vantage returns 200 OK but includes "Error Message" or "Note" in the response
    if (data.error || data['Error Message'] || data['Note']) {
      const errorMsg = data.error || data['Error Message'] || data['Note'] || 'API returned an error';
      
      // Provide specific help for Alpha Vantage errors
      const isAlphaVantage = url.includes('alphavantage.co');
      if (isAlphaVantage) {
        let helpfulMessage = `Alpha Vantage API Error: ${errorMsg}`;
        
        if (errorMsg.includes('Invalid API call')) {
          helpfulMessage += `\n\nCommon causes:\n`;
          helpfulMessage += `1. Rate limit exceeded (free tier: 5 calls/minute, 500 calls/day)\n`;
          helpfulMessage += `2. Invalid API key or API key not activated\n`;
          helpfulMessage += `3. Missing required parameters (e.g., symbol, interval, function)\n`;
          helpfulMessage += `4. Invalid parameter values\n\n`;
          helpfulMessage += `Solutions:\n`;
          helpfulMessage += `- Wait 1 minute if you hit rate limit\n`;
          helpfulMessage += `- Verify your API key at https://www.alphavantage.co/support/#api-key\n`;
          helpfulMessage += `- Check the API documentation: https://www.alphavantage.co/documentation/\n`;
          helpfulMessage += `- Ensure all required parameters are included in your URL`;
        } else if (errorMsg.includes('Thank you for using Alpha Vantage')) {
          helpfulMessage += `\n\nThis usually means:\n`;
          helpfulMessage += `- You've exceeded the free tier rate limit (5 calls/minute)\n`;
          helpfulMessage += `- Wait 1 minute before trying again\n`;
          helpfulMessage += `- Consider upgrading to a paid plan for higher limits`;
        }
        
        throw new Error(helpfulMessage);
      }
      
      throw new Error(errorMsg);
    }
    
    const apiResponse: ApiResponse & { fromCache?: boolean; cacheAge?: number } = {
      data,
      timestamp: Date.now(),
    };
    
    // Store in cache if TTL is provided
    if (cacheTTL !== undefined && cacheTTL > 0) {
      const cacheKey = generateCacheKey(url, apiKey, apiKeyHeader);
      setCachedData(cacheKey, data, cacheTTL, url);
    }
    
    return apiResponse;
  } catch (error) {
    // Handle CORS errors specifically - retry with proxy if not already tried
    if (error instanceof TypeError && error.message.includes('fetch') && !useProxy) {
      // Try again with proxy
      try {
        const proxyUrl = new URL('/api/proxy', window.location.origin);
        proxyUrl.searchParams.set('url', url);
        if (apiKey && apiKeyHeader) {
          proxyUrl.searchParams.set('apiKey', apiKey);
          proxyUrl.searchParams.set('apiKeyHeader', apiKeyHeader);
        }
        
        const proxyFetchResponse = await fetch(proxyUrl.toString());
        if (!proxyFetchResponse.ok) {
          const errorData = await proxyFetchResponse.json();
          // Invalidate cache on error
          if (cacheTTL !== undefined && cacheTTL > 0) {
            const cacheKey = generateCacheKey(url, apiKey, apiKeyHeader);
            invalidateCache(cacheKey);
          }
          throw new Error(errorData.error || 'Proxy request failed');
        }
        
        const proxyData = await proxyFetchResponse.json();
        const proxyApiResponse: ApiResponse & { fromCache?: boolean; cacheAge?: number } = {
          data: proxyData.data,
          timestamp: Date.now(),
        };
        
        // Store in cache if TTL is provided
        if (cacheTTL !== undefined && cacheTTL > 0) {
          const cacheKey = generateCacheKey(url, apiKey, apiKeyHeader);
          setCachedData(cacheKey, proxyData.data, cacheTTL, url);
        }
        
        return proxyApiResponse;
      } catch (proxyError) {
        return {
          data: null,
          error: 'CORS error: Unable to fetch data. The API may not allow requests from this origin. Try using a different API or check if the API supports CORS.',
          timestamp: Date.now(),
        };
      }
    }
    
        // Invalidate cache on error to avoid serving stale data
        if (cacheTTL !== undefined && cacheTTL > 0) {
          const cacheKey = generateCacheKey(url, apiKey, apiKeyHeader);
          invalidateCache(cacheKey);
        }
        
        return {
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: Date.now(),
        };
  }
}

/**
 * Recursively extracts field mappings from a JSON object
 * Used by the JSON field selector to build a tree of available fields
 * @param obj - JSON object to extract fields from
 * @param prefix - Current path prefix (for nested objects)
 * @param showArraysOnly - If true, only shows array fields (filters out primitives)
 * @returns Array of field mappings with paths, values, and types
 */
export function extractFieldsFromJson(
  obj: any,
  prefix = '',
  showArraysOnly = false
): FieldMapping[] {
  const fields: FieldMapping[] = [];

  if (obj === null || obj === undefined) {
    return fields;
  }

  if (Array.isArray(obj)) {
    if (!showArraysOnly) {
      fields.push({
        path: prefix || 'root',
        value: `Array(${obj.length} items)`,
        type: 'array',
      });
    }
    
    if (obj.length > 0) {
      const firstItem = obj[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        const nestedFields = extractFieldsFromJson(firstItem, `${prefix}[0]`, showArraysOnly);
        fields.push(...nestedFields);
      }
    }
    return fields;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        fields.push({
          path: currentPath,
          value: String(value),
          type: typeof value,
        });
      } else if (Array.isArray(value)) {
        fields.push({
          path: currentPath,
          value: `Array(${value.length} items)`,
          type: 'array',
          children: value.length > 0 && typeof value[0] === 'object'
            ? extractFieldsFromJson(value[0], `${currentPath}[0]`, showArraysOnly)
            : undefined,
        });
      } else if (typeof value === 'object') {
        fields.push({
          path: currentPath,
          value: 'Object',
          type: 'object',
          children: extractFieldsFromJson(value, currentPath, showArraysOnly),
        });
      } else {
        fields.push({
          path: currentPath,
          value: String(value),
          type: typeof value,
        });
      }
    }
  } else {
    fields.push({
      path: prefix || 'root',
      value: String(obj),
      type: typeof obj,
    });
  }

  return fields;
}

/**
 * Extracts a nested value from an object using a dot-notation path
 * Supports array indexing with bracket notation (e.g., 'data.items[0].price')
 * @param obj - Object to extract value from
 * @param path - Dot-notation path to the value (e.g., 'data.price' or 'items[0].name')
 * @returns Extracted value or undefined if path doesn't exist
 */
export function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (key.includes('[')) {
      const [arrayKey, indexStr] = key.split('[');
      const index = parseInt(indexStr.replace(']', ''), 10);
      if (current && typeof current === 'object' && arrayKey in current) {
        current = current[arrayKey];
        if (Array.isArray(current) && current[index] !== undefined) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    } else {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

