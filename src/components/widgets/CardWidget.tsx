/**
 * Card Widget Component
 * 
 * Displays widget data in a card format with key-value pairs.
 * Each selected field is shown as a card with the field name and formatted value.
 * Supports various data types and formatting options.
 */

'use client';

import { WidgetConfig, WidgetField } from '@/types';
import { useWidgetData } from '@/hooks/useWidgetData';
import { formatFieldValue } from '@/utils/formatting';

/**
 * Props for CardWidget component
 */
interface CardWidgetProps {
  widget: WidgetConfig; // Widget configuration
}

/**
 * Card widget component that displays data as key-value pairs
 * @param widget - Widget configuration containing fields to display
 * @returns Card widget JSX with field values
 */
export default function CardWidget({ widget }: CardWidgetProps) {
  const { data, loading, error, getFieldValue } = useWidgetData(widget);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-dark-bg rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <p className="text-dark-muted text-xs">Check your API URL and try refreshing</p>
      </div>
    );
  }

  if (widget.selectedFields.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-dark-muted text-sm mb-2">No fields selected</p>
        <p className="text-dark-muted text-xs">Edit this widget to select fields to display</p>
      </div>
    );
  }

  // Check if we have data but no values are being extracted
  const hasData = data !== null && data !== undefined;
  const fieldValues = widget.selectedFields.map((field) => getFieldValue(field));
  const hasAnyValue = fieldValues.some((val) => val !== null && val !== undefined);

  if (hasData && !hasAnyValue) {
    return (
      <div className="text-center py-8">
        <p className="text-dark-muted text-sm mb-2">No data available for selected fields</p>
        <p className="text-dark-muted text-xs">
          {'The API returned data, but the selected field paths don\'t match. Check your field selections.'}
        </p>
        <details className="mt-4 text-left">
          <summary className="text-xs text-dark-muted cursor-pointer">Debug: API Response</summary>
          <pre className="mt-2 text-xs text-dark-muted bg-dark-bg p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-dark-muted text-sm mb-2">No data available</p>
        <p className="text-dark-muted text-xs">{'The API didn\'t return any data. Check your API URL.'}</p>
      </div>
    );
  }

  /**
   * Fallback formatter for values without explicit format configuration
   * Handles objects, arrays, and primitive values intelligently
   * @param value - Raw value to format
   * @returns Formatted string representation
   */
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    // If value is an object, try to extract meaningful data
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Try common property names that might contain the actual value
      if ('value' in value) return String(value.value);
      if ('price' in value) return String(value.price);
      if ('amount' in value) return String(value.amount);
      if ('current' in value) return String(value.current);
      if ('close' in value) return String(value.close);
      
      // If it's a simple object with one key-value pair, show that
      const keys = Object.keys(value);
      if (keys.length === 1) {
        return String(value[keys[0]]);
      }
      
      // Otherwise, show formatted JSON (truncated if too long)
      const jsonStr = JSON.stringify(value, null, 2);
      return jsonStr.length > 100 ? jsonStr.substring(0, 100) + '...' : jsonStr;
    }
    
    // If value is an array, show count or first item
    if (Array.isArray(value)) {
      if (value.length === 0) return 'Empty array';
      if (value.length === 1) return formatValue(value[0]);
      return `Array(${value.length} items)`;
    }
    
    return String(value);
  };

  return (
    <div className="space-y-3">
      {widget.selectedFields.map((field) => {
        const value = getFieldValue(field);
        const displayName = field.displayName || field.path.split('.').pop() || field.path;
        // Use custom formatting if available, otherwise use fallback formatting
        const formattedValue = field.format 
          ? formatFieldValue(value, field, widget.detectedCurrency?.symbol)
          : formatValue(value);

        return (
          <div
            key={field.path}
            className="flex items-center justify-between p-3 bg-dark-bg rounded border border-dark-border"
          >
            <span className="text-sm text-dark-muted capitalize">{displayName}</span>
            <span className="text-lg font-semibold text-dark-text break-words text-right max-w-[60%]">
              {formattedValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}

