/**
 * Utility Helper Functions
 * 
 * Common utility functions used throughout the application
 * for ID generation, time formatting, and date formatting.
 */

/**
 * Generates a unique widget ID
 * Combines timestamp and random string for uniqueness
 * @returns Unique widget identifier string
 */
export function generateWidgetId(): string {
  return `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Formats a timestamp to time string (HH:MM:SS)
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Formats a timestamp to date string (e.g., "Jan 15, 2024")
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}



