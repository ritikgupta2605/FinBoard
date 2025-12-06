/**
 * Field Formatting Utility
 * 
 * Provides functions to format field values according to their specified format type.
 * Supports currency, percentage, number, date, and datetime formatting.
 */

import { WidgetField, FieldFormat } from '@/types';

/**
 * Formats a field value based on its format configuration
 * @param value - The raw value to format
 * @param field - Field configuration containing format settings
 * @param detectedCurrencySymbol - Optional currency symbol from auto-detection
 * @returns Formatted string representation of the value
 */
export function formatFieldValue(
  value: any, 
  field: WidgetField, 
  detectedCurrencySymbol?: string
): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  const format = field.format || 'none';
  const numValue = Number(value);

  switch (format) {
    case 'currency':
      // Currency formatting: Use detected currency if available and field doesn't have explicit symbol
      // Priority: field.currencySymbol > detectedCurrencySymbol > default '$'
      const symbol = field.currencySymbol || detectedCurrencySymbol || '$';
      const decimals = field.decimalPlaces !== undefined ? field.decimalPlaces : 2;
      if (isNaN(numValue)) return String(value);
      // Format with locale-specific number formatting and currency symbol
      return `${symbol}${numValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;

    case 'percentage':
      // Percentage formatting: Add % suffix with specified decimal places
      const percentDecimals = field.decimalPlaces !== undefined ? field.decimalPlaces : 2;
      if (isNaN(numValue)) return String(value);
      return `${numValue.toLocaleString('en-US', {
        minimumFractionDigits: percentDecimals,
        maximumFractionDigits: percentDecimals,
      })}%`;

    case 'number':
      // Number formatting: Format with locale-specific number formatting and decimal places
      const numberDecimals = field.decimalPlaces !== undefined ? field.decimalPlaces : 2;
      if (isNaN(numValue)) return String(value);
      return numValue.toLocaleString('en-US', {
        minimumFractionDigits: numberDecimals,
        maximumFractionDigits: numberDecimals,
      });

    case 'date':
      // Date formatting: Format as "Jan 15, 2024"
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return String(value);
      }

    case 'datetime':
      // Date and time formatting: Format as "Jan 15, 2024, 10:30 AM"
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return String(value);
      }

    case 'none':
    default:
      return String(value);
  }
}

/**
 * Available format options for field formatting
 * Used in field configuration UI dropdowns
 */
export const formatOptions: { value: FieldFormat; label: string }[] = [
  { value: 'none', label: 'None (Raw)' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
];

/**
 * Available currency symbols for manual selection
 * Used in currency format configuration dropdowns
 */
export const currencySymbols = [
  { value: '$', label: 'USD ($)' },
  { value: '₹', label: 'INR (₹)' },
  { value: '€', label: 'EUR (€)' },
  { value: '£', label: 'GBP (£)' },
  { value: '¥', label: 'JPY (¥)' },
  { value: '₿', label: 'BTC (₿)' },
];


