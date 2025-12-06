/**
 * Currency Detection Utility
 * 
 * Automatically detects currency information from API response data by searching
 * for common currency field names and mapping currency codes to symbols.
 * 
 * This utility helps widgets automatically display the correct currency symbol
 * without requiring manual configuration.
 */

// Common currency field names to check in API responses
// These are typical field names used by financial APIs to indicate currency
const CURRENCY_FIELD_NAMES = [
  'currency',
  'currencyCode',
  'currency_code',
  'base_currency',
  'baseCurrency',
  'vs_currency',
  'vsCurrency',
  'quote_currency',
  'quoteCurrency',
  'symbol',
  'code',
  'currencySymbol',
  'currency_symbol',
  'unit',
  'denomination',
];

// Currency code to symbol mapping
// Maps standard 3-letter currency codes (ISO 4217) to their display symbols
const CURRENCY_CODE_TO_SYMBOL: Record<string, string> = {
  'USD': '$',
  'INR': '₹',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CNY': '¥',
  'AUD': 'A$',
  'CAD': 'C$',
  'CHF': 'CHF',
  'BTC': '₿',
  'ETH': 'Ξ',
  'USDT': '$',
  'USDC': '$',
};

// Currency symbol to code mapping (for reverse lookup)
const SYMBOL_TO_CURRENCY_CODE: Record<string, string> = {
  '$': 'USD',
  '₹': 'INR',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₿': 'BTC',
  'Ξ': 'ETH',
};

/**
 * Recursively searches through an object to find currency information
 * Searches up to maxDepth levels deep to find currency fields
 * @param obj - Object to search
 * @param path - Current path in the object (for tracking where currency was found)
 * @param maxDepth - Maximum depth to search (prevents infinite recursion)
 * @param currentDepth - Current depth in the search
 * @returns Currency info if found, null otherwise
 */
function findCurrencyInObject(obj: any, path = '', maxDepth = 5, currentDepth = 0): { code: string; symbol: string; path: string } | null {
  // Prevent infinite recursion and handle invalid inputs
  if (currentDepth > maxDepth || obj === null || obj === undefined) {
    return null;
  }

  // Check if current object has currency fields
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      const value = obj[key];

      // Check if key matches any known currency field names
      if (CURRENCY_FIELD_NAMES.some(field => lowerKey.includes(field.toLowerCase()))) {
        if (typeof value === 'string' && value.trim()) {
          const currencyValue = value.trim().toUpperCase();
          
          // Check if it's a currency code (3-letter ISO code like USD, INR)
          if (currencyValue.length === 3 && /^[A-Z]{3}$/.test(currencyValue)) {
            const symbol = CURRENCY_CODE_TO_SYMBOL[currencyValue] || currencyValue;
            return {
              code: currencyValue,
              symbol,
              path: path ? `${path}.${key}` : key,
            };
          }
          
          // Check if it's already a currency symbol (like $, ₹)
          if (SYMBOL_TO_CURRENCY_CODE[currencyValue]) {
            const code = SYMBOL_TO_CURRENCY_CODE[currencyValue];
            return {
              code,
              symbol: currencyValue,
              path: path ? `${path}.${key}` : key,
            };
          }
        }
      }

      // Recursively search nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const found = findCurrencyInObject(value, path ? `${path}.${key}` : key, maxDepth, currentDepth + 1);
        if (found) return found;
      }
    }
  }

  // Check arrays (look at first element as representative sample)
  if (Array.isArray(obj) && obj.length > 0) {
    const found = findCurrencyInObject(obj[0], path, maxDepth, currentDepth + 1);
    if (found) return found;
  }

  return null;
}

/**
 * Detects currency from API response data
 * Searches through the response structure to find currency information
 * @param data - API response data (object or array)
 * @returns Currency info (code, symbol, path) if found, null otherwise
 */
export function detectCurrency(data: any): { code: string; symbol: string; path: string } | null {
  // Validate input
  if (!data || typeof data !== 'object') {
    return null;
  }

  // First, try to find currency in the root level of the response
  const rootResult = findCurrencyInObject(data, '', 5, 0);
  if (rootResult) {
    return rootResult;
  }

  // If not found, try common API response patterns
  // Many APIs wrap data in a 'data' property: { data: { currency: 'USD' } }
  if (data.data && typeof data.data === 'object') {
    const nestedResult = findCurrencyInObject(data.data, 'data', 5, 0);
    if (nestedResult) {
      return nestedResult;
    }
  }

  // Check for result arrays (some APIs return arrays directly)
  if (Array.isArray(data) && data.length > 0) {
    const arrayResult = findCurrencyInObject(data[0], '[0]', 5, 0);
    if (arrayResult) {
      return arrayResult;
    }
  }

  return null;
}

/**
 * Gets currency symbol from currency code
 * @param code - 3-letter currency code (e.g., 'USD', 'INR')
 * @returns Currency symbol (e.g., '$', '₹') or the code itself if not found
 */
export function getCurrencySymbol(code: string): string {
  return CURRENCY_CODE_TO_SYMBOL[code.toUpperCase()] || code;
}

/**
 * Gets currency code from symbol
 * @param symbol - Currency symbol (e.g., '$', '₹')
 * @returns Currency code (e.g., 'USD', 'INR') or null if not found
 */
export function getCurrencyCode(symbol: string): string | null {
  return SYMBOL_TO_CURRENCY_CODE[symbol] || null;
}


