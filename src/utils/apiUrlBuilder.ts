import { TimeInterval } from '@/types';

/**
 * Modifies an API URL to include time interval parameters
 * Supports common finance APIs like Finnhub, Alpha Vantage, etc.
 */
export function addTimeIntervalToUrl(url: string, timeInterval: TimeInterval): string {
  if (!url || timeInterval === 'custom') {
    return url; // Don't modify if custom or no interval
  }

  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    // Check if URL is from a known API and add appropriate parameters
    const hostname = urlObj.hostname.toLowerCase();

    // Finnhub API
    if (hostname.includes('finnhub.io')) {
      // Map time intervals to Finnhub resolution codes
      const resolutionMap: Record<TimeInterval, string> = {
        daily: 'D',
        weekly: 'W',
        monthly: 'M',
        custom: 'D', // Default to daily for custom
      };
      
      const resolution = resolutionMap[timeInterval];
      if (resolution) {
        params.set('resolution', resolution);
      }

      // If from/to dates are not set, set default date range (last 30 days for daily, etc.)
      if (!params.has('from') || !params.has('to')) {
        const now = Math.floor(Date.now() / 1000);
        let daysBack = 30;
        
        switch (timeInterval) {
          case 'daily':
            daysBack = 30; // Last 30 days
            break;
          case 'weekly':
            daysBack = 90; // Last ~12 weeks
            break;
          case 'monthly':
            daysBack = 365; // Last year
            break;
        }
        
        const from = now - (daysBack * 24 * 60 * 60);
        params.set('from', from.toString());
        params.set('to', now.toString());
      }
    }
    // Alpha Vantage API
    else if (hostname.includes('alphavantage.co')) {
      // Alpha Vantage uses different parameters
      const intervalMap: Record<TimeInterval, string> = {
        daily: 'daily',
        weekly: 'weekly',
        monthly: 'monthly',
        custom: 'daily',
      };
      
      const interval = intervalMap[timeInterval];
      if (interval) {
        params.set('interval', interval);
      }
    }
    // Generic: Try to add common parameter names
    else {
      // Try 'interval' parameter
      if (!params.has('interval')) {
        const intervalMap: Record<TimeInterval, string> = {
          daily: 'daily',
          weekly: 'weekly',
          monthly: 'monthly',
          custom: 'daily',
        };
        params.set('interval', intervalMap[timeInterval]);
      }
      
      // Try 'period' parameter
      if (!params.has('period')) {
        const periodMap: Record<TimeInterval, string> = {
          daily: '1d',
          weekly: '1w',
          monthly: '1m',
          custom: '1d',
        };
        params.set('period', periodMap[timeInterval]);
      }
    }

    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.warn('Failed to modify URL with time interval:', error);
    return url;
  }
}

/**
 * Extracts time interval from URL if present
 */
export function extractTimeIntervalFromUrl(url: string): TimeInterval | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    const hostname = urlObj.hostname.toLowerCase();

    // Check for Finnhub resolution
    if (hostname.includes('finnhub.io')) {
      const resolution = params.get('resolution');
      if (resolution) {
        const resolutionMap: Record<string, TimeInterval> = {
          D: 'daily',
          W: 'weekly',
          M: 'monthly',
        };
        return resolutionMap[resolution.toUpperCase()] || null;
      }
    }
    // Check for Alpha Vantage interval
    else if (hostname.includes('alphavantage.co')) {
      const interval = params.get('interval');
      if (interval) {
        const intervalMap: Record<string, TimeInterval> = {
          daily: 'daily',
          weekly: 'weekly',
          monthly: 'monthly',
        };
        return intervalMap[interval.toLowerCase()] || null;
      }
    }
    // Check for generic interval parameter
    else {
      const interval = params.get('interval');
      if (interval) {
        const intervalMap: Record<string, TimeInterval> = {
          daily: 'daily',
          weekly: 'weekly',
          monthly: 'monthly',
        };
        return intervalMap[interval.toLowerCase()] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}



